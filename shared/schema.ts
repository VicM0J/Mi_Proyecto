import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const areaEnum = pgEnum("area", ["patronaje", "corte", "bordado", "ensamble", "plancha", "calidad", "operaciones", "admin"]);
export const repositionTypeEnum = pgEnum("reposition_type", ["repocision", "reproceso"]);
export const urgencyEnum = pgEnum("urgency", ["urgente", "intermedio", "poco_urgente"]);
export const repositionStatusEnum = pgEnum("reposition_status", ["pendiente", "aprobado", "rechazado", "en_proceso", "completado", "eliminado"]);
export const orderStatusEnum = pgEnum("order_status", ["active", "completed"]);
export const transferStatusEnum = pgEnum("transfer_status", ["pending", "accepted", "rejected"]);
export const notificationTypeEnum = pgEnum("notification_type", ["transfer_request", "transfer_accepted", "transfer_rejected", "order_completed"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  area: areaEnum("area").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  folio: text("folio").notNull().unique(),
  clienteHotel: text("cliente_hotel").notNull(),
  noSolicitud: text("no_solicitud").notNull(),
  noHoja: text("no_hoja"),
  modelo: text("modelo").notNull(),
  tipoPrenda: text("tipo_prenda").notNull(),
  color: text("color").notNull(),
  tela: text("tela").notNull(),
  totalPiezas: integer("total_piezas").notNull(),
  currentArea: areaEnum("current_area").notNull().default("corte"),
  status: orderStatusEnum("status").notNull().default("active"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const orderPieces = pgTable("order_pieces", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  area: areaEnum("area").notNull(),
  pieces: integer("pieces").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const transfers = pgTable("transfers", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  fromArea: areaEnum("from_area").notNull(),
  toArea: areaEnum("to_area").notNull(),
  pieces: integer("pieces").notNull(),
  status: transferStatusEnum("status").notNull().default("pending"),
  notes: text("notes"),
  createdBy: integer("created_by").notNull(),
  processedBy: integer("processed_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
});

export const orderHistory = pgTable("order_history", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  action: text("action").notNull(),
  description: text("description").notNull(),
  fromArea: areaEnum("from_area"),
  toArea: areaEnum("to_area"),
  pieces: integer("pieces"),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  transferId: integer("transfer_id"),
  orderId: integer("order_id"),
  repositionId: integer("reposition_id"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const repositions = pgTable("repositions", {
  id: serial("id").primaryKey(),
  folio: text("folio").notNull().unique(),
  type: repositionTypeEnum("type").notNull(),

  solicitanteNombre: text("solicitante_nombre").notNull(),
  solicitanteArea: areaEnum("solicitante_area").notNull(),
  fechaSolicitud: timestamp("fecha_solicitud").defaultNow().notNull(),

  noSolicitud: text("no_solicitud").notNull(),
  noHoja: text("no_hoja"),

  causanteDano: text("causante_dano").notNull(),
  descripcionSuceso: text("descripcion_suceso").notNull(),

  modeloPrenda: text("modelo_prenda").notNull(),
  tela: text("tela").notNull(),
  color: text("color").notNull(),
  tipoPieza: text("tipo_pieza").notNull(),

  urgencia: urgencyEnum("urgencia").notNull(),
  observaciones: text("observaciones"),

  currentArea: areaEnum("current_area").notNull(),
  status: repositionStatusEnum("status").notNull().default("pendiente"),

  createdBy: integer("created_by").notNull(),
  approvedBy: integer("approved_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  approvedAt: timestamp("approved_at"),
  completedAt: timestamp("completed_at"),
});

export const repositionPieces = pgTable("reposition_pieces", {
  id: serial("id").primaryKey(),
  repositionId: integer("reposition_id").notNull(),
  talla: text("talla").notNull(),
  cantidad: integer("cantidad").notNull(),
  folioOriginal: text("folio_original"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const repositionTransfers = pgTable("reposition_transfers", {
  id: serial("id").primaryKey(),
  repositionId: integer("reposition_id").notNull(),
  fromArea: areaEnum("from_area").notNull(),
  toArea: areaEnum("to_area").notNull(),
  notes: text("notes"),
  createdBy: integer("created_by").notNull(),
  processedBy: integer("processed_by"),
  status: transferStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
});

export const repositionHistory = pgTable("reposition_history", {
  id: serial("id").primaryKey(),
  repositionId: integer("reposition_id").notNull(),
  action: text("action").notNull(),
  description: text("description").notNull(),
  fromArea: areaEnum("from_area"),
  toArea: areaEnum("to_area"),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const adminPasswords = pgTable("admin_passwords", {
  id: serial("id").primaryKey(),
  password: text("password").notNull(),
  createdBy: integer("created_by").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});


export const ordersRelations = relations(orders, ({ one, many }) => ({
  creator: one(users, {
    fields: [orders.createdBy],
    references: [users.id],
  }),
  pieces: many(orderPieces),
  transfers: many(transfers),
  history: many(orderHistory),
}));

export const orderPiecesRelations = relations(orderPieces, ({ one }) => ({
  order: one(orders, {
    fields: [orderPieces.orderId],
    references: [orders.id],
  }),
}));

export const transfersRelations = relations(transfers, ({ one }) => ({
  order: one(orders, {
    fields: [transfers.orderId],
    references: [orders.id],
  }),
  creator: one(users, {
    fields: [transfers.createdBy],
    references: [users.id],
  }),
  processor: one(users, {
    fields: [transfers.processedBy],
    references: [users.id],
  }),
}));

export const orderHistoryRelations = relations(orderHistory, ({ one }) => ({
  order: one(orders, {
    fields: [orderHistory.orderId],
    references: [orders.id],
  }),
  user: one(users, {
    fields: [orderHistory.userId],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  createdOrders: many(orders),
  transfers: many(transfers),
  notifications: many(notifications),
  orderHistory: many(orderHistory),
  createdRepositions: many(repositions, { relationName: "creator" }),
  approvedRepositions: many(repositions, { relationName: "approver" }),
  repositionTransfers: many(repositionTransfers, { relationName: "transferCreator" }),
  repositionHistory: many(repositionHistory),
  adminPasswords: many(adminPasswords),
}));

export const repositionsRelations = relations(repositions, ({ one, many }) => ({
  creator: one(users, {
    fields: [repositions.createdBy],
    references: [users.id],
    relationName: "creator",
  }),
  approver: one(users, {
    fields: [repositions.approvedBy],
    references: [users.id],
    relationName: "approver",
  }),
  pieces: many(repositionPieces),
  transfers: many(repositionTransfers),
  history: many(repositionHistory),
}));

export const repositionPiecesRelations = relations(repositionPieces, ({ one }) => ({
  reposition: one(repositions, {
    fields: [repositionPieces.repositionId],
    references: [repositions.id],
  }),
}));

export const repositionTransfersRelations = relations(repositionTransfers, ({ one }) => ({
  reposition: one(repositions, {
    fields: [repositionTransfers.repositionId],
    references: [repositions.id],
  }),
  creator: one(users, {
    fields: [repositionTransfers.createdBy],
    references: [users.id],
    relationName: "transferCreator",
  }),
  processor: one(users, {
    fields: [repositionTransfers.processedBy],
    references: [users.id],
    relationName: "transferProcessor",
  }),
}));

export const repositionHistoryRelations = relations(repositionHistory, ({ one }) => ({
  reposition: one(repositions, {
    fields: [repositionHistory.repositionId],
    references: [repositions.id],
  }),
  user: one(users, {
    fields: [repositionHistory.userId],
    references: [users.id],
  }),
}));

export const adminPasswordsRelations = relations(adminPasswords, ({ one }) => ({
  creator: one(users, {
    fields: [adminPasswords.createdBy],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  transfer: one(transfers, {
    fields: [notifications.transferId],
    references: [transfers.id],
  }),
  order: one(orders, {
    fields: [notifications.orderId],
    references: [orders.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  area: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdBy: true,
  createdAt: true,
  completedAt: true,
});

export const insertTransferSchema = createInsertSchema(transfers).omit({
  id: true,
  status: true,
  createdBy: true,
  processedBy: true,
  createdAt: true,
  processedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  read: true,
  createdAt: true,
});

export const insertRepositionSchema = createInsertSchema(repositions).omit({
  id: true,
  folio: true,
  createdBy: true,
  approvedBy: true,
  createdAt: true,
  approvedAt: true,
  completedAt: true,
});

export const insertRepositionPieceSchema = createInsertSchema(repositionPieces).omit({
  id: true,
  createdAt: true,
});

export const insertRepositionTransferSchema = createInsertSchema(repositionTransfers).omit({
  id: true,
  status: true,
  createdBy: true,
  processedBy: true,
  createdAt: true,
  processedAt: true,
});

export const insertAdminPasswordSchema = createInsertSchema(adminPasswords).omit({
  id: true,
  createdBy: true,
  createdAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OrderPieces = typeof orderPieces.$inferSelect;
export type Transfer = typeof transfers.$inferSelect;
export type InsertTransfer = z.infer<typeof insertTransferSchema>;
export type OrderHistory = typeof orderHistory.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type Reposition = typeof repositions.$inferSelect;
export type InsertReposition = z.infer<typeof insertRepositionSchema>;
export type RepositionPiece = typeof repositionPieces.$inferSelect;
export type InsertRepositionPiece = z.infer<typeof insertRepositionPieceSchema>;
export type RepositionTransfer = typeof repositionTransfers.$inferSelect;
export type InsertRepositionTransfer = z.infer<typeof insertRepositionTransferSchema>;
export type RepositionHistory = typeof repositionHistory.$inferSelect;
export type AdminPassword = typeof adminPasswords.$inferSelect;
export type InsertAdminPassword = z.infer<typeof insertAdminPasswordSchema>;

export type Area = "patronaje" | "corte" | "bordado" | "ensamble" | "plancha" | "calidad" | "operaciones" | "admin";
export type RepositionType = "repocision" | "reproceso";
export type Urgency = "urgente" | "intermedio" | "poco_urgente";
export type RepositionStatus = "pendiente" | "aprobado" | "rechazado" | "en_proceso" | "completado" | "eliminado";