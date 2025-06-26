import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000;
  private listeners: Array<(data: any) => void> = [];

  connect() {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;

      console.log('Intentando conectar WebSocket a:', wsUrl);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket conectado exitosamente');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Notificación WebSocket recibida:', data);

          // Solo notificar a los listeners si es una notificación real
          if (data.type === 'notification') {
            this.listeners.forEach(listener => listener(data.data));
          }
        } catch (error) {
          console.error('Error al procesar mensaje WebSocket:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket desconectado, código:', event.code);
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('Error en WebSocket:', error);
      };
    } catch (error) {
      console.error('Error al crear WebSocket:', error);
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Intentando reconectar WebSocket en ${this.reconnectInterval / 1000} segundos... (Intento ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      setTimeout(() => {
        this.connect();
      }, this.reconnectInterval);
    } else {
      console.error('Máximo número de intentos de reconexión alcanzado.');
    }
  }

  sendMessage(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket no está conectado, mensaje no enviado:', message);
    }
  }

  addListener(listener: (data: any) => void) {
    this.listeners.push(listener);
  }

  removeListener(listener: (data: any) => void) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }
}


export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();
  const webSocketManagerRef = useRef<WebSocketManager | null>(null);

  useEffect(() => {
    if (!webSocketManagerRef.current) {
      webSocketManagerRef.current = new WebSocketManager();
    }

    const webSocketManager = webSocketManagerRef.current;

    webSocketManager.connect();
    setIsConnected(true); // Asumir conexión inicial

    const notificationListener = (notification: any) => {
      console.log('Nueva notificación recibida:', notification);

      // Invalidar queries relacionadas para actualizar notificaciones
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["repositions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transfers/pending"] });

      // Mostrar notificación visual si es de reposiciones
      if (notification && (
        notification.type?.includes('reposition') ||
        notification.type?.includes('completion') ||
        notification.type === 'new_reposition' ||
        notification.type === 'reposition_transfer' ||
        notification.type === 'reposition_approved' ||
        notification.type === 'reposition_rejected' ||
        notification.type === 'reposition_completed' ||
        notification.type === 'reposition_deleted' ||
        notification.type === 'completion_approval_needed'
      )) {
        console.log('Nueva notificación de reposición recibida:', notification);
      }
    };

    webSocketManager.addListener(notificationListener);

    return () => {
      webSocketManager.removeListener(notificationListener);
      setIsConnected(false);
    };
  }, [queryClient]);

  const sendMessage = (message: any) => {
    webSocketManagerRef.current?.sendMessage(message);
  };

  const onMessage = (callback: (data: any) => void) => {
    if (webSocketManagerRef.current) {
      webSocketManagerRef.current.addListener(callback);
    }
  };

  return { isConnected, sendMessage, onMessage };
}