import { 
  users, 
  orders, 
  orderPieces,
  transfers, 
  orderHistory, 
  notifications,
  repositions,
  repositionPieces,
  repositionTransfers,
  repositionHistory,
  adminPasswords,
  type User, 
  type InsertUser,
  type Order,
  type InsertOrder,
  type Transfer,
  type InsertTransfer,
  type OrderHistory,
  type Notification,
  type InsertNotification,
  type Reposition,
  type InsertReposition,
  type RepositionPiece,
  type InsertRepositionPiece,
  type RepositionTransfer,
  type InsertRepositionTransfer,
  type RepositionHistory,
  type AdminPassword,
  type InsertAdminPassword,
  type Area,
  type RepositionType,
  type RepositionStatus
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, asc, ne } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {

  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAdminUser(): Promise<User | undefined>;
  resetUserPassword(userId: number, hashedPassword: string): Promise<void>;
  

  createOrder(order: InsertOrder, createdBy: number): Promise<Order>;
  getOrders(area?: Area): Promise<Order[]>;
  getOrderById(id: number): Promise<Order | undefined>;
  getOrderByFolio(folio: string): Promise<Order | undefined>;
  completeOrder(orderId: number): Promise<void>;
  deleteOrder(orderId: number): Promise<void>;

  getOrderPieces(orderId: number): Promise<any[]>;
  updateOrderPieces(orderId: number, area: Area, pieces: number): Promise<void>;
  
  createTransfer(transfer: InsertTransfer, createdBy: number): Promise<Transfer>;
  getTransfersByArea(area: Area): Promise<Transfer[]>;
  getPendingTransfersForUser(userId: number): Promise<Transfer[]>;
  acceptTransfer(transferId: number, processedBy: number): Promise<void>;
  rejectTransfer(transferId: number, processedBy: number): Promise<void>;
  
  addOrderHistory(orderId: number, action: string, description: string, userId: number, options?: {
    fromArea?: Area;
    toArea?: Area;
    pieces?: number;
  }): Promise<void>;
  getOrderHistory(orderId: number): Promise<OrderHistory[]>;
  
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: number): Promise<Notification[]>;
  markNotificationRead(notificationId: number): Promise<void>;
  
  sessionStore: any;
  
  createReposition(reposition: InsertReposition & { folio: string }, pieces: InsertRepositionPiece[], createdBy: number): Promise<Reposition>;
  getRepositions(area?: Area, userArea?: Area): Promise<Reposition[]>;
  getRepositionById(id: number): Promise<Reposition | undefined>;
  getNextRepositionCounter(): Promise<number>;
  approveReposition(repositionId: number, action: RepositionStatus, userId: number, notes?: string): Promise<Reposition>;
  
  createRepositionTransfer(transfer: InsertRepositionTransfer, createdBy: number): Promise<RepositionTransfer>;
  processRepositionTransfer(transferId: number, action: 'accepted' | 'rejected', userId: number): Promise<RepositionTransfer>;
  getRepositionHistory(repositionId: number): Promise<RepositionHistory[]>;
  getRepositionTracking(repositionId: number): Promise<any>;
  getRepositionNotifications(userId: number, userArea: string): Promise<any[]>;
  deleteReposition(repositionId: number, userId: number, reason?: string): Promise<void>;
  completeReposition(repositionId: number, userId: number, notes?: string): Promise<void>;
  requestCompletionApproval(repositionId: number, userId: number, notes?: string): Promise<void>;
  getAllRepositions(includeDeleted?: boolean): Promise<Reposition[]>;
  getRecentOrders(area?: Area, limit?: number): Promise<Order[]>;
  getRecentRepositions(area?: Area, limit?: number): Promise<Reposition[]>;
  
  getReportData(type: string, startDate: string, endDate: string, filters: any): Promise<any>;
  generateReport(type: string, format: string, startDate: string, endDate: string, filters: any): Promise<Buffer>;
  saveReportToOneDrive(type: string, startDate: string, endDate: string, filters: any): Promise<any>;
  
  createAdminPassword(password: string, createdBy: number): Promise<AdminPassword>;
  verifyAdminPassword(password: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {


  async getAllUsers(): Promise<User[]> {
  return await db.select().from(users).orderBy(asc(users.id));
  }

   async deleteUserById(userId: string): Promise<boolean> {
    const result = await db.delete(users)
      .where(eq(users.id, Number(userId)))
      .returning()
      .catch(() => []);
    return result.length > 0;
  }

  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAdminUser(): Promise<User | undefined> {
    const [admin] = await db.select().from(users).where(eq(users.area, 'admin')).limit(1);
    return admin || undefined;
  }

  async resetUserPassword(userId: number, hashedPassword: string): Promise<void> {
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));
  }

  async createOrder(order: InsertOrder, createdBy: number): Promise<Order> {
    const [newOrder] = await db
      .insert(orders)
      .values({ ...order, createdBy })
      .returning();

    await db.insert(orderPieces).values({
      orderId: newOrder.id,
      area: 'corte',
      pieces: order.totalPiezas,
    });

    console.log(`Created order ${newOrder.id} with ${order.totalPiezas} pieces in corte area`);

    await this.addOrderHistory(
      newOrder.id,
      'created',
      `Pedido creado con ${order.totalPiezas} piezas`,
      createdBy
    );

    return newOrder;
  }

  async getOrders(area?: Area): Promise<Order[]> {
    if (area) {
      return await db.select().from(orders)
        .where(eq(orders.currentArea, area))
        .orderBy(desc(orders.createdAt));
    }
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrderById(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async getOrderByFolio(folio: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.folio, folio));
    return order || undefined;
  }

  async completeOrder(orderId: number): Promise<void> {
    await db.update(orders)
      .set({ 
        status: 'completed',
        completedAt: new Date()
      })
      .where(eq(orders.id, orderId));
  }

  async deleteOrder(orderId: number): Promise<void> {
    await db.delete(orderPieces).where(eq(orderPieces.orderId, orderId));
    await db.delete(transfers).where(eq(transfers.orderId, orderId));
    await db.delete(orderHistory).where(eq(orderHistory.orderId, orderId));
    await db.delete(notifications).where(eq(notifications.orderId, orderId));
    await db.delete(orders).where(eq(orders.id, orderId));
  }

  async getOrderPieces(orderId: number): Promise<any[]> {
    const pieces = await db.select().from(orderPieces)
      .where(eq(orderPieces.orderId, orderId))
      .orderBy(asc(orderPieces.area));
    
    console.log(`Order pieces for order ${orderId}:`, pieces);
    return pieces;
  }

  async updateOrderPieces(orderId: number, area: Area, pieces: number): Promise<void> {
    const existing = await db.select().from(orderPieces)
      .where(and(
        eq(orderPieces.orderId, orderId),
        eq(orderPieces.area, area)
      ));

    if (existing.length > 0) {
      await db.update(orderPieces)
        .set({ pieces, updatedAt: new Date() })
        .where(and(
          eq(orderPieces.orderId, orderId),
          eq(orderPieces.area, area)
        ));
    } else {
      await db.insert(orderPieces).values({
        orderId,
        area,
        pieces,
      });
    }
  }

  async createTransfer(transfer: InsertTransfer, createdBy: number): Promise<Transfer> {
    const [newTransfer] = await db
      .insert(transfers)
      .values({ ...transfer, createdBy })
      .returning();

    await this.addOrderHistory(
      transfer.orderId,
      'transfer_created',
      `${transfer.pieces} piezas enviadas a ${transfer.toArea}`,
      createdBy,
      {
        fromArea: transfer.fromArea,
        toArea: transfer.toArea,
        pieces: transfer.pieces
      }
    );

    return newTransfer;
  }

  async getTransfersByArea(area: Area): Promise<Transfer[]> {
    return await db.select().from(transfers)
      .where(or(
        eq(transfers.fromArea, area),
        eq(transfers.toArea, area)
      ))
      .orderBy(desc(transfers.createdAt));
  }

  async getPendingTransfersForUser(userId: number): Promise<Transfer[]> {
    const user = await this.getUser(userId);
    if (!user) return [];

    return await db.select().from(transfers)
      .where(and(
        eq(transfers.toArea, user.area),
        eq(transfers.status, 'pending')
      ))
      .orderBy(desc(transfers.createdAt));
  }

  async acceptTransfer(transferId: number, processedBy: number): Promise<void> {
    const [transfer] = await db.select().from(transfers)
      .where(eq(transfers.id, transferId));
    
    if (!transfer) return;

    await db.update(transfers)
      .set({
        status: 'accepted',
        processedBy,
        processedAt: new Date()
      })
      .where(eq(transfers.id, transferId));

    const fromAreaPieces = await db.select().from(orderPieces)
      .where(and(
        eq(orderPieces.orderId, transfer.orderId),
        eq(orderPieces.area, transfer.fromArea)
      ));

    if (fromAreaPieces.length > 0) {
      const currentPieces = fromAreaPieces[0].pieces;
      const remainingPieces = currentPieces - transfer.pieces;
      
      if (remainingPieces > 0) {
        await db.update(orderPieces)
          .set({ pieces: remainingPieces, updatedAt: new Date() })
          .where(and(
            eq(orderPieces.orderId, transfer.orderId),
            eq(orderPieces.area, transfer.fromArea)
          ));
      } else {
        await db.delete(orderPieces)
          .where(and(
            eq(orderPieces.orderId, transfer.orderId),
            eq(orderPieces.area, transfer.fromArea)
          ));
      }
    }

    const toAreaPieces = await db.select().from(orderPieces)
      .where(and(
        eq(orderPieces.orderId, transfer.orderId),
        eq(orderPieces.area, transfer.toArea)
      ));

    if (toAreaPieces.length > 0) {
      await db.update(orderPieces)
        .set({ 
          pieces: toAreaPieces[0].pieces + transfer.pieces, 
          updatedAt: new Date() 
        })
        .where(and(
          eq(orderPieces.orderId, transfer.orderId),
          eq(orderPieces.area, transfer.toArea)
        ));
    } else {
      await db.insert(orderPieces).values({
        orderId: transfer.orderId,
        area: transfer.toArea,
        pieces: transfer.pieces,
      });
    }

    const allOrderPieces = await db.select().from(orderPieces)
      .where(eq(orderPieces.orderId, transfer.orderId));
    
    if (allOrderPieces.length === 1 && allOrderPieces[0].area === transfer.toArea) {
      await db.update(orders)
        .set({ currentArea: transfer.toArea })
        .where(eq(orders.id, transfer.orderId));
    }

    await this.addOrderHistory(
      transfer.orderId,
      'transfer_accepted',
      `Transferencia aceptada - ${transfer.pieces} piezas movidas de ${transfer.fromArea} a ${transfer.toArea}`,
      processedBy,
      {
        fromArea: transfer.fromArea,
        toArea: transfer.toArea,
        pieces: transfer.pieces
      }
    );
  }

  async rejectTransfer(transferId: number, processedBy: number): Promise<void> {
    const [transfer] = await db.select().from(transfers)
      .where(eq(transfers.id, transferId));
    
    if (!transfer) return;

    await db.update(transfers)
      .set({
        status: 'rejected',
        processedBy,
        processedAt: new Date()
      })
      .where(eq(transfers.id, transferId));

    await this.addOrderHistory(
      transfer.orderId,
      'transfer_rejected',
      `Transferencia rechazada - ${transfer.pieces} piezas devueltas a ${transfer.fromArea}`,
      processedBy,
      {
        fromArea: transfer.fromArea,
        toArea: transfer.toArea,
        pieces: transfer.pieces
      }
    );
  }

  async addOrderHistory(
    orderId: number, 
    action: string, 
    description: string, 
    userId: number,
    options?: {
      fromArea?: Area;
      toArea?: Area;
      pieces?: number;
    }
  ): Promise<void> {
    await db.insert(orderHistory).values({
      orderId,
      action,
      description,
      userId,
      fromArea: options?.fromArea,
      toArea: options?.toArea,
      pieces: options?.pieces,
    });
  }

  async getOrderHistory(orderId: number): Promise<OrderHistory[]> {
    return await db.select().from(orderHistory)
      .where(eq(orderHistory.orderId, orderId))
      .orderBy(asc(orderHistory.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    return newNotification;
  }

  async getUserNotifications(userId: number): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationRead(notificationId: number): Promise<void> {
    await db.update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, notificationId));
  }

  async createReposition(repositionData: InsertReposition & { folio: string }, pieces: InsertRepositionPiece[], createdBy: number): Promise<Reposition> {
    const [reposition] = await db.insert(repositions)
      .values({
        ...repositionData,
        createdBy,
      })
      .returning();

    if (pieces.length > 0) {
      await db.insert(repositionPieces)
        .values(pieces.map(piece => ({
          ...piece,
          repositionId: reposition.id
        })));
    }

    await db.insert(repositionHistory)
      .values({
        repositionId: reposition.id,
        action: 'created',
        description: `Reposition ${reposition.type} created`,
        userId: createdBy,
      });

    // Notificar a admin y operaciones sobre nueva reposición
    const adminUsers = await db.select().from(users)
      .where(or(eq(users.area, 'admin'), eq(users.area, 'operaciones')));

    for (const admin of adminUsers) {
      await this.createNotification({
        userId: admin.id,
        type: 'new_reposition',
        title: 'Nueva Solicitud de Reposición',
        message: `Se ha creado una nueva solicitud de ${reposition.type}: ${reposition.folio}`,
        repositionId: reposition.id,
      });
    }

    return reposition;
  }

  async getRepositions(area?: Area, userArea?: Area): Promise<Reposition[]> {
    let query = db.select().from(repositions);
    
    if (userArea !== 'admin' && userArea !== 'envios') {
        query = query.where(ne(repositions.status, 'eliminado' as RepositionStatus))
                     .where(ne(repositions.status, 'completado' as RepositionStatus));
    }
    
    return await query.orderBy(desc(repositions.createdAt));
}

  async getRepositionById(id: number): Promise<Reposition | undefined> {
    const [reposition] = await db.select().from(repositions).where(eq(repositions.id, id));
    return reposition || undefined;
  }

  async getNextRepositionCounter(): Promise<number> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    
    const yearStr = year.toString();
    const monthStr = String(month).padStart(2, '0');
    const folioPrefix = `JN-REQ-${monthStr}-${yearStr.slice(-2)}-`;
    
    const result = await db.select().from(repositions);
    const thisMonthCount = result.filter(r => r.folio.startsWith(folioPrefix)).length;
    
    return thisMonthCount + 1;
  }

  async approveReposition(repositionId: number, action: RepositionStatus, userId: number, notes?: string): Promise<Reposition> {
    const [reposition] = await db.update(repositions)
      .set({
        status: action,
        approvedBy: userId,
        approvedAt: new Date(),
      })
      .where(eq(repositions.id, repositionId))
      .returning();

    await db.insert(repositionHistory)
      .values({
        repositionId,
        action: action === 'aprobado' ? 'approved' : 'rejected',
        description: `Reposition ${action} by admin/operations${notes ? `: ${notes}` : ''}`,
        userId,
      });

    return reposition;
  }

  async createRepositionTransfer(transfer: InsertRepositionTransfer, createdBy: number): Promise<RepositionTransfer> {
    const [repositionTransfer] = await db.insert(repositionTransfers)
      .values({
        ...transfer,
        createdBy,
      })
      .returning();

    await db.insert(repositionHistory)
      .values({
        repositionId: transfer.repositionId,
        action: 'transfer_requested',
        description: `Transfer requested from ${transfer.fromArea} to ${transfer.toArea}`,
        fromArea: transfer.fromArea,
        toArea: transfer.toArea,
        userId: createdBy,
      });

    // Obtener la reposición para el folio
    const reposition = await this.getRepositionById(transfer.repositionId);

    // Notificar a usuarios del área de destino
    const targetAreaUsers = await db.select().from(users)
      .where(eq(users.area, transfer.toArea));

    for (const user of targetAreaUsers) {
      await this.createNotification({
        userId: user.id,
        type: 'reposition_transfer',
        title: 'Nueva Transferencia de Reposición',
        message: `Se ha solicitado transferir la reposición ${reposition?.folio} de ${transfer.fromArea} a ${transfer.toArea}`,
        repositionId: transfer.repositionId,
      });
    }

    return repositionTransfer;
  }

  async processRepositionTransfer(transferId: number, action: 'accepted' | 'rejected', userId: number): Promise<RepositionTransfer> {
    const [transfer] = await db.update(repositionTransfers)
      .set({
        status: action,
        processedBy: userId,
        processedAt: new Date(),
      })
      .where(eq(repositionTransfers.id, transferId))
      .returning();

    if (action === 'accepted') {
      await db.update(repositions)
        .set({ currentArea: transfer.toArea })
        .where(eq(repositions.id, transfer.repositionId));
    }

    await db.insert(repositionHistory)
      .values({
        repositionId: transfer.repositionId,
        action: `transfer_${action}`,
        description: `Transfer ${action} from ${transfer.fromArea} to ${transfer.toArea}`,
        fromArea: transfer.fromArea,
        toArea: transfer.toArea,
        userId,
      });

    // Obtener la reposición para el folio
    const reposition = await this.getRepositionById(transfer.repositionId);

    // Notificar al solicitante original
    await this.createNotification({
      userId: transfer.createdBy,
      type: 'transfer_processed',
      title: `Transferencia ${action === 'accepted' ? 'Aceptada' : 'Rechazada'}`,
      message: `La transferencia de la reposición ${reposition?.folio} ha sido ${action === 'accepted' ? 'aceptada' : 'rechazada'}`,
      repositionId: transfer.repositionId,
    });

    // Si fue aceptada, notificar a usuarios del área de destino
    if (action === 'accepted') {
      const targetAreaUsers = await db.select().from(users)
        .where(eq(users.area, transfer.toArea));

      for (const user of targetAreaUsers) {
        if (user.id !== userId) { // No notificar al que procesó
          await this.createNotification({
            userId: user.id,
            type: 'reposition_received',
            title: 'Nueva Reposición Recibida',
            message: `La reposición ${reposition?.folio} ha llegado a tu área`,
            repositionId: transfer.repositionId,
          });
        }
      }
    }

    return transfer;
  }

  async getRepositionHistory(repositionId: number): Promise<RepositionHistory[]> {
    return await db.select().from(repositionHistory)
      .where(eq(repositionHistory.repositionId, repositionId))
      .orderBy(asc(repositionHistory.createdAt));
  }

  async createAdminPassword(password: string, createdBy: number): Promise<AdminPassword> {
    const [adminPassword] = await db.insert(adminPasswords)
      .values({
        password,
        createdBy,
      })
      .returning();

    return adminPassword;
  }

  async verifyAdminPassword(password: string): Promise<boolean> {
    const [adminPassword] = await db.select().from(adminPasswords)
      .where(and(eq(adminPasswords.password, password), eq(adminPasswords.isActive, true)))
      .orderBy(desc(adminPasswords.createdAt));
    
    return !!adminPassword;
  }

  async deleteReposition(repositionId: number, userId: number, reason: string): Promise<void> {
    console.log('Deleting reposition:', repositionId, 'by user:', userId, 'reason:', reason);
    
    // Obtener la reposición antes de eliminarla
    const reposition = await this.getRepositionById(repositionId);
    if (!reposition) {
      throw new Error('Reposición no encontrada');
    }
    
    console.log('Found reposition:', reposition.folio);
    
    await db.update(repositions)
      .set({
        status: 'eliminado' as RepositionStatus,
        completedAt: new Date(),
      })
      .where(eq(repositions.id, repositionId));

    console.log('Updated reposition status to eliminado');

    await db.insert(repositionHistory)
      .values({
        repositionId,
        action: 'deleted',
        description: `Reposición eliminada. Motivo: ${reason}`,
        userId,
      });

    console.log('Added history entry');

    // Crear notificación para el solicitante
    if (reposition.createdBy !== userId) {
      await this.createNotification({
        userId: reposition.createdBy,
        type: 'reposition_deleted',
        title: 'Reposición Eliminada',
        message: `La reposición ${reposition.folio} ha sido eliminada. Motivo: ${reason}`,
        repositionId: repositionId,
      });
      console.log('Created notification for user:', reposition.createdBy);
    }
  }

  async completeReposition(repositionId: number, userId: number, notes?: string): Promise<void> {
    await db.update(repositions)
      .set({
        status: 'completado' as RepositionStatus,
        completedAt: new Date(),
        approvedBy: userId,
      })
      .where(eq(repositions.id, repositionId));

    await db.insert(repositionHistory)
      .values({
        repositionId,
        action: 'completed',
        description: `Reposición finalizada${notes ? `: ${notes}` : ''}`,
        userId,
      });

    // Crear notificación para el solicitante
    const reposition = await this.getRepositionById(repositionId);
    if (reposition) {
      await this.createNotification({
        userId: reposition.createdBy,
        type: 'reposition_completed',
        title: 'Reposición Completada',
        message: `La reposición ${reposition.folio} ha sido completada${notes ? `: ${notes}` : ''}`,
        repositionId: repositionId,
      });
    }
  }

  async requestCompletionApproval(repositionId: number, userId: number, notes?: string): Promise<void> {
    await db.insert(repositionHistory)
        .values({
            repositionId,
            action: 'completion_requested',
            description: `Solicitud de finalización enviada${notes ? `: ${notes}` : ''}`,
            userId,
        });

    // Crear notificaciones para admin y Adriana
    const adminUsers = await db.select().from(users)
        .where(or(eq(users.area, 'admin'), eq(users.name, 'Adriana'))); // Asumiendo que hay un campo name para Adriana

    const reposition = await this.getRepositionById(repositionId);
    if (reposition) {
        for (const admin of adminUsers) {
            await this.createNotification({
                userId: admin.id,
                type: 'completion_approval_needed',
                title: 'Solicitud de Finalización',
                message: `Se solicita aprobación para finalizar la reposición ${reposition.folio}${notes ? `: ${notes}` : ''}`,
                repositionId: repositionId,
            });
        }
    }
}

  async getAllRepositions(includeDeleted: boolean = false): Promise<Reposition[]> {
    let query = db.select().from(repositions);
    
    if (!includeDeleted) {
      query = query.where(ne(repositions.status, 'eliminado' as RepositionStatus));
    }
    
    return await query.orderBy(desc(repositions.createdAt));
  }

  async getRecentOrders(area?: Area, limit: number = 10): Promise<Order[]> {
    let query = db.select().from(orders);
    
    if (area && area !== 'admin') {
      query = query.where(eq(orders.currentArea, area));
    }
    
    return await query
      .orderBy(desc(orders.createdAt))
      .limit(limit);
  }

  async getRecentRepositions(area?: Area, limit: number = 10): Promise<Reposition[]> {
    let query = db.select().from(repositions)
      .where(ne(repositions.status, 'eliminado' as RepositionStatus));
    
    if (area && area !== 'admin') {
      query = query.where(eq(repositions.currentArea, area));
    }
    
    return await query
      .orderBy(desc(repositions.createdAt))
      .limit(limit);
  }

  async getRepositionTracking(repositionId: number): Promise<any> {
    const reposition = await this.getRepositionById(repositionId);
    if (!reposition) throw new Error('Reposition not found');

    const history = await this.getRepositionHistory(repositionId);

    // Definir el flujo de áreas para reposiciones
    const workflowAreas = ['patronaje', 'corte', 'bordado', 'ensamble', 'plancha', 'calidad', 'operaciones'];
    
    const steps = workflowAreas.map((area, index) => {
      const areaHistory = history.find(h => h.toArea === area || (h.action === 'created' && reposition.currentArea === area));
      
      let status: 'completed' | 'current' | 'pending' = 'pending';
      
      if (areaHistory) {
        status = 'completed';
      } else if (reposition.currentArea === area) {
        status = 'current';
      }

      return {
        id: index + 1,
        area,
        status,
        timestamp: areaHistory?.createdAt,
        user: areaHistory ? `Usuario ${areaHistory.userId}` : undefined,
        notes: areaHistory?.description
      };
    });

    // Calcular progreso
    const completedSteps = steps.filter(s => s.status === 'completed').length;
    const currentStep = steps.find(s => s.status === 'current');
    const progress = currentStep 
      ? Math.round(((completedSteps + 0.5) / steps.length) * 100)
      : Math.round((completedSteps / steps.length) * 100);

    return {
      reposition: {
        folio: reposition.folio,
        status: reposition.status,
        currentArea: reposition.currentArea,
        progress
      },
      steps,
      history: history.map(h => ({
        id: h.id,
        action: h.action,
        description: h.description,
        timestamp: h.createdAt,
        userName: `Usuario ${h.userId}`,
        fromArea: h.fromArea,
        toArea: h.toArea
      }))
    };
  }

  async getRepositionNotifications(userId: number, userArea: string): Promise<any[]> {
    const notifications = await db.select().from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.read, false)
      ))
      .orderBy(desc(notifications.createdAt));

    return notifications.filter(n => n.type?.includes('reposition') || n.type?.includes('completion'));
  }

  async getPendingRepositionTransfers(userArea: Area): Promise<RepositionTransfer[]> {
    return await db.select().from(repositionTransfers)
      .where(and(
        eq(repositionTransfers.toArea, userArea),
        eq(repositionTransfers.status, 'pending')
      ))
      .orderBy(desc(repositionTransfers.createdAt));
  }
}

export const storage = new DatabaseStorage();
