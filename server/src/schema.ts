import { z } from 'zod';

// User roles enum
export const userRoleSchema = z.enum(['buyer', 'supplier']);
export type UserRole = z.infer<typeof userRoleSchema>;

// Packaging types enum
export const packagingTypeSchema = z.enum([
  'boxes',
  'bottles',
  'bags',
  'containers',
  'labels',
  'pouches',
  'tubes',
  'cans',
  'jars',
  'wrapping',
  'other'
]);
export type PackagingType = z.infer<typeof packagingTypeSchema>;

// Material types enum
export const materialTypeSchema = z.enum([
  'cardboard',
  'plastic',
  'glass',
  'metal',
  'paper',
  'fabric',
  'wood',
  'biodegradable',
  'recyclable',
  'compostable',
  'other'
]);
export type MaterialType = z.infer<typeof materialTypeSchema>;

// Certification types enum
export const certificationTypeSchema = z.enum([
  'fsc',
  'pefc',
  'iso14001',
  'iso9001',
  'brc',
  'fda',
  'eu_organic',
  'cradle_to_cradle',
  'other'
]);
export type CertificationType = z.infer<typeof certificationTypeSchema>;

// Inquiry status enum
export const inquiryStatusSchema = z.enum([
  'pending',
  'responded',
  'closed'
]);
export type InquiryStatus = z.infer<typeof inquiryStatusSchema>;

// Rating values enum
export const ratingValueSchema = z.enum(['1', '2', '3', '4', '5']);
export type RatingValue = z.infer<typeof ratingValueSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  company_name: z.string(),
  contact_person: z.string(),
  phone: z.string().nullable(),
  role: userRoleSchema,
  location: z.string(),
  description: z.string().nullable(),
  website: z.string().url().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type User = z.infer<typeof userSchema>;

// Supplier profile schema
export const supplierProfileSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  packaging_types: z.array(packagingTypeSchema),
  materials: z.array(materialTypeSchema),
  min_order_quantity: z.number().int(),
  personalization_available: z.boolean(),
  price_range_min: z.number().nullable(),
  price_range_max: z.number().nullable(),
  delivery_time_days: z.number().int(),
  certifications: z.array(certificationTypeSchema),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type SupplierProfile = z.infer<typeof supplierProfileSchema>;

// Inquiry schema
export const inquirySchema = z.object({
  id: z.number(),
  buyer_id: z.number(),
  packaging_type: packagingTypeSchema,
  material: materialTypeSchema,
  quantity: z.number().int(),
  personalization_needed: z.boolean(),
  description: z.string(),
  budget_min: z.number().nullable(),
  budget_max: z.number().nullable(),
  delivery_deadline: z.coerce.date().nullable(),
  status: inquiryStatusSchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type Inquiry = z.infer<typeof inquirySchema>;

// Inquiry suppliers (junction table for bulk inquiries)
export const inquirySupplierSchema = z.object({
  id: z.number(),
  inquiry_id: z.number(),
  supplier_id: z.number(),
  sent_at: z.coerce.date()
});
export type InquirySupplier = z.infer<typeof inquirySupplierSchema>;

// Quote schema
export const quoteSchema = z.object({
  id: z.number(),
  inquiry_id: z.number(),
  supplier_id: z.number(),
  price_per_unit: z.number(),
  total_price: z.number(),
  delivery_time_days: z.number().int(),
  notes: z.string().nullable(),
  created_at: z.coerce.date()
});
export type Quote = z.infer<typeof quoteSchema>;

// Message schema
export const messageSchema = z.object({
  id: z.number(),
  sender_id: z.number(),
  recipient_id: z.number(),
  inquiry_id: z.number().nullable(),
  subject: z.string(),
  content: z.string(),
  sent_at: z.coerce.date(),
  read_at: z.coerce.date().nullable()
});
export type Message = z.infer<typeof messageSchema>;

// File attachment schema
export const fileAttachmentSchema = z.object({
  id: z.number(),
  inquiry_id: z.number().nullable(),
  message_id: z.number().nullable(),
  filename: z.string(),
  file_path: z.string(),
  file_size: z.number().int(),
  mime_type: z.string(),
  uploaded_at: z.coerce.date()
});
export type FileAttachment = z.infer<typeof fileAttachmentSchema>;

// Rating schema
export const ratingSchema = z.object({
  id: z.number(),
  rater_id: z.number(),
  rated_id: z.number(),
  inquiry_id: z.number().nullable(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().nullable(),
  created_at: z.coerce.date()
});
export type Rating = z.infer<typeof ratingSchema>;

// Input schemas for creating records

export const createUserInputSchema = z.object({
  email: z.string().email(),
  password_hash: z.string(),
  company_name: z.string(),
  contact_person: z.string(),
  phone: z.string().nullable(),
  role: userRoleSchema,
  location: z.string(),
  description: z.string().nullable(),
  website: z.string().url().nullable()
});
export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const createSupplierProfileInputSchema = z.object({
  user_id: z.number(),
  packaging_types: z.array(packagingTypeSchema),
  materials: z.array(materialTypeSchema),
  min_order_quantity: z.number().int().positive(),
  personalization_available: z.boolean(),
  price_range_min: z.number().positive().nullable(),
  price_range_max: z.number().positive().nullable(),
  delivery_time_days: z.number().int().positive(),
  certifications: z.array(certificationTypeSchema)
});
export type CreateSupplierProfileInput = z.infer<typeof createSupplierProfileInputSchema>;

export const createInquiryInputSchema = z.object({
  buyer_id: z.number(),
  packaging_type: packagingTypeSchema,
  material: materialTypeSchema,
  quantity: z.number().int().positive(),
  personalization_needed: z.boolean(),
  description: z.string(),
  budget_min: z.number().positive().nullable(),
  budget_max: z.number().positive().nullable(),
  delivery_deadline: z.coerce.date().nullable(),
  supplier_ids: z.array(z.number()) // For bulk inquiries
});
export type CreateInquiryInput = z.infer<typeof createInquiryInputSchema>;

export const createQuoteInputSchema = z.object({
  inquiry_id: z.number(),
  supplier_id: z.number(),
  price_per_unit: z.number().positive(),
  total_price: z.number().positive(),
  delivery_time_days: z.number().int().positive(),
  notes: z.string().nullable()
});
export type CreateQuoteInput = z.infer<typeof createQuoteInputSchema>;

export const createMessageInputSchema = z.object({
  sender_id: z.number(),
  recipient_id: z.number(),
  inquiry_id: z.number().nullable(),
  subject: z.string(),
  content: z.string()
});
export type CreateMessageInput = z.infer<typeof createMessageInputSchema>;

export const createRatingInputSchema = z.object({
  rater_id: z.number(),
  rated_id: z.number(),
  inquiry_id: z.number().nullable(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().nullable()
});
export type CreateRatingInput = z.infer<typeof createRatingInputSchema>;

// Search and filter schemas

export const searchSuppliersInputSchema = z.object({
  packaging_types: z.array(packagingTypeSchema).optional(),
  materials: z.array(materialTypeSchema).optional(),
  location: z.string().optional(),
  max_min_order_quantity: z.number().int().optional(),
  personalization_required: z.boolean().optional(),
  certifications: z.array(certificationTypeSchema).optional(),
  price_range_max: z.number().optional(),
  delivery_time_max_days: z.number().int().optional()
});
export type SearchSuppliersInput = z.infer<typeof searchSuppliersInputSchema>;

// Update schemas

export const updateUserInputSchema = z.object({
  id: z.number(),
  company_name: z.string().optional(),
  contact_person: z.string().optional(),
  phone: z.string().nullable().optional(),
  location: z.string().optional(),
  description: z.string().nullable().optional(),
  website: z.string().url().nullable().optional()
});
export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

export const updateSupplierProfileInputSchema = z.object({
  id: z.number(),
  packaging_types: z.array(packagingTypeSchema).optional(),
  materials: z.array(materialTypeSchema).optional(),
  min_order_quantity: z.number().int().positive().optional(),
  personalization_available: z.boolean().optional(),
  price_range_min: z.number().positive().nullable().optional(),
  price_range_max: z.number().positive().nullable().optional(),
  delivery_time_days: z.number().int().positive().optional(),
  certifications: z.array(certificationTypeSchema).optional()
});
export type UpdateSupplierProfileInput = z.infer<typeof updateSupplierProfileInputSchema>;

export const updateInquiryStatusInputSchema = z.object({
  id: z.number(),
  status: inquiryStatusSchema
});
export type UpdateInquiryStatusInput = z.infer<typeof updateInquiryStatusInputSchema>;