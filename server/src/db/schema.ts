import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  numeric, 
  integer, 
  boolean,
  pgEnum,
  jsonb
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['buyer', 'supplier']);
export const packagingTypeEnum = pgEnum('packaging_type', [
  'boxes', 'bottles', 'bags', 'containers', 'labels', 'pouches', 
  'tubes', 'cans', 'jars', 'wrapping', 'other'
]);
export const materialTypeEnum = pgEnum('material_type', [
  'cardboard', 'plastic', 'glass', 'metal', 'paper', 'fabric', 
  'wood', 'biodegradable', 'recyclable', 'compostable', 'other'
]);
export const certificationTypeEnum = pgEnum('certification_type', [
  'fsc', 'pefc', 'iso14001', 'iso9001', 'brc', 'fda', 
  'eu_organic', 'cradle_to_cradle', 'other'
]);
export const inquiryStatusEnum = pgEnum('inquiry_status', [
  'pending', 'responded', 'closed'
]);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  company_name: text('company_name').notNull(),
  contact_person: text('contact_person').notNull(),
  phone: text('phone'),
  role: userRoleEnum('role').notNull(),
  location: text('location').notNull(),
  description: text('description'),
  website: text('website'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Supplier profiles table
export const supplierProfilesTable = pgTable('supplier_profiles', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  packaging_types: jsonb('packaging_types').notNull(), // Array of packaging types
  materials: jsonb('materials').notNull(), // Array of materials
  min_order_quantity: integer('min_order_quantity').notNull(),
  personalization_available: boolean('personalization_available').notNull(),
  price_range_min: numeric('price_range_min', { precision: 10, scale: 2 }),
  price_range_max: numeric('price_range_max', { precision: 10, scale: 2 }),
  delivery_time_days: integer('delivery_time_days').notNull(),
  certifications: jsonb('certifications').notNull(), // Array of certifications
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Inquiries table
export const inquiriesTable = pgTable('inquiries', {
  id: serial('id').primaryKey(),
  buyer_id: integer('buyer_id').references(() => usersTable.id).notNull(),
  packaging_type: packagingTypeEnum('packaging_type').notNull(),
  material: materialTypeEnum('material').notNull(),
  quantity: integer('quantity').notNull(),
  personalization_needed: boolean('personalization_needed').notNull(),
  description: text('description').notNull(),
  budget_min: numeric('budget_min', { precision: 10, scale: 2 }),
  budget_max: numeric('budget_max', { precision: 10, scale: 2 }),
  delivery_deadline: timestamp('delivery_deadline'),
  status: inquiryStatusEnum('status').notNull().default('pending'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Inquiry suppliers junction table for bulk inquiries
export const inquirySuppliersTable = pgTable('inquiry_suppliers', {
  id: serial('id').primaryKey(),
  inquiry_id: integer('inquiry_id').references(() => inquiriesTable.id).notNull(),
  supplier_id: integer('supplier_id').references(() => usersTable.id).notNull(),
  sent_at: timestamp('sent_at').defaultNow().notNull()
});

// Quotes table
export const quotesTable = pgTable('quotes', {
  id: serial('id').primaryKey(),
  inquiry_id: integer('inquiry_id').references(() => inquiriesTable.id).notNull(),
  supplier_id: integer('supplier_id').references(() => usersTable.id).notNull(),
  price_per_unit: numeric('price_per_unit', { precision: 10, scale: 2 }).notNull(),
  total_price: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
  delivery_time_days: integer('delivery_time_days').notNull(),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Messages table
export const messagesTable = pgTable('messages', {
  id: serial('id').primaryKey(),
  sender_id: integer('sender_id').references(() => usersTable.id).notNull(),
  recipient_id: integer('recipient_id').references(() => usersTable.id).notNull(),
  inquiry_id: integer('inquiry_id').references(() => inquiriesTable.id),
  subject: text('subject').notNull(),
  content: text('content').notNull(),
  sent_at: timestamp('sent_at').defaultNow().notNull(),
  read_at: timestamp('read_at')
});

// File attachments table
export const fileAttachmentsTable = pgTable('file_attachments', {
  id: serial('id').primaryKey(),
  inquiry_id: integer('inquiry_id').references(() => inquiriesTable.id),
  message_id: integer('message_id').references(() => messagesTable.id),
  filename: text('filename').notNull(),
  file_path: text('file_path').notNull(),
  file_size: integer('file_size').notNull(),
  mime_type: text('mime_type').notNull(),
  uploaded_at: timestamp('uploaded_at').defaultNow().notNull()
});

// Ratings table
export const ratingsTable = pgTable('ratings', {
  id: serial('id').primaryKey(),
  rater_id: integer('rater_id').references(() => usersTable.id).notNull(),
  rated_id: integer('rated_id').references(() => usersTable.id).notNull(),
  inquiry_id: integer('inquiry_id').references(() => inquiriesTable.id),
  rating: integer('rating').notNull(), // 1-5 scale
  comment: text('comment'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ one, many }) => ({
  supplierProfile: one(supplierProfilesTable),
  inquiries: many(inquiriesTable),
  sentMessages: many(messagesTable, { relationName: 'sentMessages' }),
  receivedMessages: many(messagesTable, { relationName: 'receivedMessages' }),
  quotes: many(quotesTable),
  ratingsGiven: many(ratingsTable, { relationName: 'ratingsGiven' }),
  ratingsReceived: many(ratingsTable, { relationName: 'ratingsReceived' }),
  inquirySuppliers: many(inquirySuppliersTable)
}));

export const supplierProfilesRelations = relations(supplierProfilesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [supplierProfilesTable.user_id],
    references: [usersTable.id]
  })
}));

export const inquiriesRelations = relations(inquiriesTable, ({ one, many }) => ({
  buyer: one(usersTable, {
    fields: [inquiriesTable.buyer_id],
    references: [usersTable.id]
  }),
  quotes: many(quotesTable),
  messages: many(messagesTable),
  fileAttachments: many(fileAttachmentsTable),
  ratings: many(ratingsTable),
  inquirySuppliers: many(inquirySuppliersTable)
}));

export const inquirySuppliersRelations = relations(inquirySuppliersTable, ({ one }) => ({
  inquiry: one(inquiriesTable, {
    fields: [inquirySuppliersTable.inquiry_id],
    references: [inquiriesTable.id]
  }),
  supplier: one(usersTable, {
    fields: [inquirySuppliersTable.supplier_id],
    references: [usersTable.id]
  })
}));

export const quotesRelations = relations(quotesTable, ({ one }) => ({
  inquiry: one(inquiriesTable, {
    fields: [quotesTable.inquiry_id],
    references: [inquiriesTable.id]
  }),
  supplier: one(usersTable, {
    fields: [quotesTable.supplier_id],
    references: [usersTable.id]
  })
}));

export const messagesRelations = relations(messagesTable, ({ one, many }) => ({
  sender: one(usersTable, {
    fields: [messagesTable.sender_id],
    references: [usersTable.id],
    relationName: 'sentMessages'
  }),
  recipient: one(usersTable, {
    fields: [messagesTable.recipient_id],
    references: [usersTable.id],
    relationName: 'receivedMessages'
  }),
  inquiry: one(inquiriesTable, {
    fields: [messagesTable.inquiry_id],
    references: [inquiriesTable.id]
  }),
  fileAttachments: many(fileAttachmentsTable)
}));

export const fileAttachmentsRelations = relations(fileAttachmentsTable, ({ one }) => ({
  inquiry: one(inquiriesTable, {
    fields: [fileAttachmentsTable.inquiry_id],
    references: [inquiriesTable.id]
  }),
  message: one(messagesTable, {
    fields: [fileAttachmentsTable.message_id],
    references: [messagesTable.id]
  })
}));

export const ratingsRelations = relations(ratingsTable, ({ one }) => ({
  rater: one(usersTable, {
    fields: [ratingsTable.rater_id],
    references: [usersTable.id],
    relationName: 'ratingsGiven'
  }),
  rated: one(usersTable, {
    fields: [ratingsTable.rated_id],
    references: [usersTable.id],
    relationName: 'ratingsReceived'
  }),
  inquiry: one(inquiriesTable, {
    fields: [ratingsTable.inquiry_id],
    references: [inquiriesTable.id]
  })
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type SupplierProfile = typeof supplierProfilesTable.$inferSelect;
export type NewSupplierProfile = typeof supplierProfilesTable.$inferInsert;
export type Inquiry = typeof inquiriesTable.$inferSelect;
export type NewInquiry = typeof inquiriesTable.$inferInsert;
export type InquirySupplier = typeof inquirySuppliersTable.$inferSelect;
export type NewInquirySupplier = typeof inquirySuppliersTable.$inferInsert;
export type Quote = typeof quotesTable.$inferSelect;
export type NewQuote = typeof quotesTable.$inferInsert;
export type Message = typeof messagesTable.$inferSelect;
export type NewMessage = typeof messagesTable.$inferInsert;
export type FileAttachment = typeof fileAttachmentsTable.$inferSelect;
export type NewFileAttachment = typeof fileAttachmentsTable.$inferInsert;
export type Rating = typeof ratingsTable.$inferSelect;
export type NewRating = typeof ratingsTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  supplierProfiles: supplierProfilesTable,
  inquiries: inquiriesTable,
  inquirySuppliers: inquirySuppliersTable,
  quotes: quotesTable,
  messages: messagesTable,
  fileAttachments: fileAttachmentsTable,
  ratings: ratingsTable
};