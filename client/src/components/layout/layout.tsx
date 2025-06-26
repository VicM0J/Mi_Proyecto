import { useState, ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { CreateOrderModal } from "@/components/orders/create-order-modal";
import { NotificationsPanel } from "@/components/notifications/notifications-panel";
import { useAuth } from "@/hooks/use-auth";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user } = useAuth();
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const canCreateOrders = user?.area === 'corte' || user?.area === 'admin';

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar 
        onShowNotifications={() => setShowNotifications(true)}
        onCreateOrder={() => setShowCreateOrder(true)}
      />
      
      <main className="flex-1 ml-64 p-6 overflow-y-auto">
        {children}
      </main>

      {/* Modales */}
      {showCreateOrder && canCreateOrders && (
        <CreateOrderModal
          open={showCreateOrder}
          onClose={() => setShowCreateOrder(false)}
        />
      )}

      <NotificationsPanel
        open={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </div>
  );
}