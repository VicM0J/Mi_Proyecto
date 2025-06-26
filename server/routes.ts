import type { Express } from "express";
import { Router } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertOrderSchema, insertTransferSchema, insertRepositionSchema, insertRepositionPieceSchema, insertRepositionTransferSchema, insertAdminPasswordSchema, type Area, type RepositionType } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcrypt";

// ... imports sin cambios ...

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  registerOrderRoutes(app);
  registerTransferRoutes(app);
  registerNotificationRoutes(app);
  registerRepositionRoutes(app);
  registerAdminRoutes(app);
  registerDashboardRoutes(app);

  const httpServer = configureWebSocket(app);
  return httpServer;
}

function registerOrderRoutes(app: Express) {
  const router = Router();

  router.post("/", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const user = req.user!;
      if (user.area !== 'corte' && user.area !== 'admin' && user.area !== 'envios') {
        return res.status(403).json({ message: "Área restringida" });
      }

      const validatedData = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(validatedData, user.id);
      res.status(201).json(order);
    } catch (error) {
      console.error('Create order error:', error);
      res.status(400).json({ message: "Datos de orden incorrectos" });
    }
  });

  router.get("/", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const area = req.query.area as Area;
      const orders = await storage.getOrders(area);
      res.json(orders);
    } catch (error) {
      console.error('Get orders error:', error);
      res.status(500).json({ message: "Error al cargar órdenes" });
    }
  });

  router.get("/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const order = await storage.getOrderById(parseInt(req.params.id));
      if (!order) return res.status(404).json({ message: "Orden no encontrada" });
      res.json(order);
    } catch (error) {
      console.error('Get order error:', error);
      res.status(500).json({ message: "Error al cargar orden" });
    }
  });

  router.get("/:id/pieces", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const orderId = parseInt(req.params.id);
      const pieces = await storage.getOrderPieces(orderId);
      res.json(pieces);
    } catch (error) {
      console.error('Get order pieces error:', error);
      res.status(500).json({ message: "Error al cargar piezas" });
    }
  });

  router.get("/:id/history", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const history = await storage.getOrderHistory(parseInt(req.params.id));
      res.json(history);
    } catch (error) {
      console.error('Get order history error:', error);
      res.status(500).json({ message: "Error al cargar historial" });
    }
  });

  router.post("/:id/complete", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const user = req.user!;
      if (user.area !== 'envios') {
        return res.status(403).json({ message: "Solo el área de envíos puede completar la orden" });
      }

      const orderId = parseInt(req.params.id);
      await storage.completeOrder(orderId);
      await storage.addOrderHistory(orderId, 'completed', 'Pedido finalizado', user.id);
      res.json({ message: "Orden completada" });
    } catch (error) {
      console.error('Complete order error:', error);
      res.status(500).json({ message: "Error al completar orden" });
    }
  });

  app.use("/api/orders", router);
}

function registerTransferRoutes(app: Express) {
  const router = Router();

  router.post("/", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const user = req.user!;
      const { orderId, toArea, pieces, notes } = req.body;

      const orderPieces = await storage.getOrderPieces(orderId);
      const userAreaPieces = orderPieces.find((p: any) => p.area === user.area);

      if (!userAreaPieces || userAreaPieces.pieces < pieces) {
        return res.status(400).json({ 
          message: `No hay suficientes piezas disponibles en ${user.area}. Disponibles: ${userAreaPieces?.pieces || 0}` 
        });
      }

      const validatedData = insertTransferSchema.parse({
        orderId,
        fromArea: user.area,
        toArea,
        pieces: parseInt(pieces),
        notes
      });

      const transfer = await storage.createTransfer(validatedData, user.id);
      res.status(201).json(transfer);
    } catch (error) {
      console.error('Create transfer error:', error);
      res.status(400).json({ message: "Error al crear transferencia" });
    }
  });

  router.get("/pending", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const user = req.user!;
      const transfers = await storage.getPendingTransfersForUser(user.id);
      res.json(transfers);
    } catch (error) {
      console.error('Get pending transfers error:', error);
      res.status(500).json({ message: "Error al obtener transferencias pendientes" });
    }
  });

  router.post("/:id/accept", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const user = req.user!;
      await storage.acceptTransfer(parseInt(req.params.id), user.id);
      res.json({ message: "Transferencia aceptada correctamente" });
    } catch (error) {
      console.error('Accept transfer error:', error);
      res.status(500).json({ message: "Error al aceptar la transferencia" });
    }
  });

  router.post("/:id/reject", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const user = req.user!;
      await storage.rejectTransfer(parseInt(req.params.id), user.id);
      res.json({ message: "Transferencia rechazada correctamente" });
    } catch (error) {
      console.error('Reject transfer error:', error);
      res.status(500).json({ message: "Error al rechazar la transferencia" });
    }
  });

  app.use("/api/transfers", router);
}

function registerNotificationRoutes(app: Express) {
  const router = Router();

  router.get("/", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const user = req.user!;
      const notifications = await storage.getUserNotifications(user.id);
      res.json(notifications);
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({ message: "Error al obtener notificaciones" });
    }
  });

  router.post("/:id/read", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      await storage.markNotificationRead(parseInt(req.params.id));
      res.json({ message: "Notificación marcada como leída" });
    } catch (error) {
      console.error('Mark notification read error:', error);
      res.status(500).json({ message: "Error al marcar la notificación" });
    }
  });

  app.use("/api/notifications", router);
}

function registerAdminRoutes(app: Express) {
  const router = Router();

  router.use((req, res, next) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    const user = req.user!;
    if (user.area !== 'admin') return res.status(403).json({ message: "Se requiere acceso de administrador" });

    next();
  });

  router.get("/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ message: "Error al obtener usuarios" });
    }
  });

  router.delete("/users/:id", async (req, res) => {
    try {
      const result = await storage.deleteUserById(req.params.id);
      if (result) {
        return res.status(200).json({ message: "Usuario eliminado correctamente" });
      } else {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Error al eliminar el usuario" });
    }
  });

  router.post("/reset-password", async (req, res) => {
    try {
      const { userId, newPassword } = req.body;
      if (!userId || !newPassword) return res.status(400).json({ message: "Faltan campos requeridos" });

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.resetUserPassword(userId, hashedPassword);
      res.json({ message: "Contraseña restablecida correctamente" });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: "Error al restablecer la contraseña" });
    }
  });

  app.use("/api/admin", router);
}


function registerDashboardRoutes(app: Express) {
  app.get("/api/dashboard/stats", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const user = req.user!;
      const allOrders = await storage.getOrders();
      const userAreaOrders = await storage.getOrders(user.area);
      const pendingTransfers = await storage.getPendingTransfersForUser(user.id);

      const stats = {
        activeOrders: allOrders.filter(o => o.status === 'active').length,
        myAreaOrders: userAreaOrders.length,
        pendingTransfers: pendingTransfers.length,
        completedToday: allOrders.filter(o =>
          o.status === 'completed' &&
          o.completedAt &&
          new Date(o.completedAt).toDateString() === new Date().toDateString()
        ).length,
      };

      res.json(stats);
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      res.status(500).json({ message: "Error al obtener estadísticas del tablero" });
    }
  });
}


function configureWebSocket(app: Express): Server {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('Nueva conexión WebSocket');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Mensaje WebSocket recibido:', data);
      } catch (error) {
        console.error('Error al procesar mensaje WebSocket:', error);
      }
    });

    ws.on('close', () => {
      console.log('Conexión WebSocket cerrada');
    });
  });

  (httpServer as any).wss = wss;
  return httpServer;
}


function registerRepositionRoutes(app: Express) {
  const router = Router();

  router.post("/", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const user = req.user!;
      const { pieces, ...repositionData } = req.body;
      
      const validatedData = insertRepositionSchema.parse(repositionData);
      
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = String(now.getFullYear()).slice(-2);
      const counter = await storage.getNextRepositionCounter();
      const folio = `JN-REQ-${month}-${year}-${String(counter).padStart(3, '0')}`;
      
      const reposition = await storage.createReposition({
        ...validatedData,
        folio,
        currentArea: user.area,
        solicitanteArea: user.area
      }, pieces, user.id);
      
      res.status(201).json(reposition);
    } catch (error) {
      console.error('Create reposition error:', error);
      res.status(400).json({ message: "Datos inválidos para reposición" });
    }
  });

  router.get("/", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const user = req.user!;
      const area = req.query.area as Area;
      const repositions = await storage.getRepositions(area || user.area, user.area);
      res.json(repositions);
    } catch (error) {
      console.error('Get repositions error:', error);
      res.status(500).json({ message: "Error al obtener reposiciones" });
    }
  });

  router.get("/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const id = parseInt(req.params.id);
      const reposition = await storage.getRepositionById(id);
      if (!reposition) {
        return res.status(404).json({ message: "Reposición no encontrada" });
      }
      res.json(reposition);
    } catch (error) {
      console.error('Get reposition error:', error);
      res.status(500).json({ message: "Error al obtener la reposición" });
    }
  });

  router.post("/:id/transfer", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const user = req.user!;
      const repositionId = parseInt(req.params.id);
      const { toArea, notes } = req.body;

      const transfer = await storage.createRepositionTransfer({
        repositionId,
        fromArea: user.area,
        toArea,
        notes
      }, user.id);

      res.status(201).json(transfer);
    } catch (error) {
      console.error('Transfer reposition error:', error);
      res.status(400).json({ message: "Error al crear transferencia de reposición" });
    }
  });

  router.post("/:id/approval", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const user = req.user!;
      if (user.area !== 'operaciones' && user.area !== 'admin') {
        return res.status(403).json({ message: "Solo Operaciones o Administración pueden aprobar o rechazar" });
      }

      const repositionId = parseInt(req.params.id);
      const { action, notes } = req.body;

      const result = await storage.approveReposition(repositionId, action, user.id, notes);
      res.json(result);
    } catch (error) {
      console.error('Approve reposition error:', error);
      res.status(400).json({ message: "Error al procesar la aprobación" });
    }
  });

  router.post("/transfers/:id/process", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const user = req.user!;
      const transferId = parseInt(req.params.id);
      const { action } = req.body;

      const result = await storage.processRepositionTransfer(transferId, action, user.id);
      res.json(result);
    } catch (error) {
      console.error('Process transfer error:', error);
      res.status(400).json({ message: "Error al procesar la transferencia" });
    }
  });

  router.get("/:id/history", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Autenticación requerida" });

    try {
      const repositionId = parseInt(req.params.id);
      const history = await storage.getRepositionHistory(repositionId);
      res.json(history);
    } catch (error) {
      console.error('Get reposition history error:', error);
      res.status(500).json({ message: "Error al obtener historial de la reposición" });
    }
  });

  app.use("/api/repositions", router);
}

