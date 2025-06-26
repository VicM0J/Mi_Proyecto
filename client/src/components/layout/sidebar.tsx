import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Factory, 
  Home, 
  Package, 
  Bell, 
  History, 
  Plus, 
  Settings, 
  LogOut,
  User,
  FileEdit
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

interface SidebarProps {
  onShowNotifications: () => void;
  onCreateOrder: () => void;
}

export function Sidebar({ onShowNotifications, onCreateOrder }: SidebarProps) {
  const { user, logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();

  const { data: pendingTransfers = [] } = useQuery<any[]>({
    queryKey: ["/api/transfers/pending"],
    enabled: !!user,
  });

  const canCreateOrders = user?.area === 'corte' || user?.area === 'admin';
  const isAdmin = user?.area === 'admin';

  const getAreaDisplayName = (area: string) => {
    const areaNames: Record<string, string> = {
      patronaje: 'Patronaje',
      corte: 'Corte',
      bordado: 'Bordado',
      ensamble: 'Ensamble',
      plancha: 'Plancha/Empaque',
      calidad: 'Calidad',
      operaciones: 'Operaciones/Envíos',
      admin: 'Admin'
    };
    return areaNames[area] || area;
  };

  return (
    <aside className="w-64 bg-white shadow-lg fixed h-full z-10">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Factory className="text-white text-lg" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">JASANA</h1>
            <p className="text-sm text-gray-500">Sistema de Pedidos</p>
          </div>
        </div>
      </div>

      {/*Info del usuario */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <User className="text-white text-sm" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">{user?.name}</p>
            <p className="text-sm text-gray-500">
              Área: {user?.area ? getAreaDisplayName(user.area) : ''}
            </p>
            <a
                href={`msteams:/l/chat/0/0?users=${user?.username}`}
            >
            <button className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
              Chatear en Teams
            </button>
            <button className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
              Mi Reporte
            </button>
            </a>

          </div>
        </div>
      </div>

      {/* Menu de navegacion*/}
      <nav className="p-4">
        <ul className="space-y-2">
          <li>
            <Button 
              variant="ghost" 
              className={`w-full justify-start ${location === '/' ? 'bg-primary text-white hover:bg-primary/90' : ''}`}
              onClick={() => setLocation('/')}
            >
              <Home className="mr-3 h-4 w-4" />
              Tablero
            </Button>
          </li>
          <li>
            <Button 
              variant="ghost" 
              className={`w-full justify-start ${location === '/orders' ? 'bg-primary text-white hover:bg-primary/90' : ''}`}
              onClick={() => setLocation('/orders')}
            >
              <Package className="mr-3 h-4 w-4" />
              Pedidos
            </Button>
          </li>
          <li>
            <Button 
              variant="ghost" 
              className="w-full justify-start relative"
              onClick={onShowNotifications}
            >
              <Bell className="mr-3 h-4 w-4" />
              Notificaciones
              {pendingTransfers.length > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {pendingTransfers.length}
                </Badge>
              )}
            </Button>
          </li>
          <li>
            <Button 
              variant="ghost" 
              className={`w-full justify-start ${location === '/repositions' ? 'bg-primary text-white hover:bg-primary/90' : ''}`}
              onClick={() => setLocation('/repositions')}
            >
              <FileEdit className="mr-3 h-4 w-4" />
              Reposiciones
            </Button>
          </li>
          <li>
            <Button 
              variant="ghost" 
              className={`w-full justify-start ${location === '/history' ? 'bg-primary text-white hover:bg-primary/90' : ''}`}
              onClick={() => setLocation('/history')}
            >
              <History className="mr-3 h-4 w-4" />
              Historial
            </Button>
          </li>
          {canCreateOrders && (
            <li>
              <Button 
                variant="ghost" 
                className="w-full justify-start"
                onClick={onCreateOrder}
              >
                <Plus className="mr-3 h-4 w-4" />
                Crear Pedido
              </Button>
            </li>
          )}
          {isAdmin && (
            <li>
              <Button 
                variant="ghost" 
                className={`w-full justify-start ${location === '/admin' ? 'bg-primary text-white hover:bg-primary/90' : ''}`}
                onClick={() => setLocation('/admin')}
              >
                <Settings className="mr-3 h-4 w-4" />
                Administración
              </Button>
            </li>
          )}
        </ul>
      </nav>

      {/* Cerar sesion */}
      <div className="absolute bottom-4 left-4 right-4">
        <Button 
          variant="ghost" 
          className="w-full justify-start"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          <LogOut className="mr-3 h-4 w-4" />
          Cerrar Sesión
        </Button>
      </div>
    </aside>
  );
}
