import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import all schema types
import {
  createUserInputSchema,
  createSupplierProfileInputSchema,
  createInquiryInputSchema,
  createQuoteInputSchema,
  createMessageInputSchema,
  createRatingInputSchema,
  searchSuppliersInputSchema,
  updateUserInputSchema,
  updateSupplierProfileInputSchema,
  updateInquiryStatusInputSchema
} from './schema';

// Import all handlers
import { createUser } from './handlers/create_user';
import { createSupplierProfile } from './handlers/create_supplier_profile';
import { searchSuppliers } from './handlers/search_suppliers';
import { createInquiry } from './handlers/create_inquiry';
import { getInquiriesForSupplier } from './handlers/get_inquiries_for_supplier';
import { getInquiriesForBuyer } from './handlers/get_inquiries_for_buyer';
import { createQuote } from './handlers/create_quote';
import { getQuotesForInquiry } from './handlers/get_quotes_for_inquiry';
import { createMessage } from './handlers/create_message';
import { getMessagesForUser } from './handlers/get_messages_for_user';
import { markMessageAsRead } from './handlers/mark_message_as_read';
import { createRating } from './handlers/create_rating';
import { getRatingsForUser } from './handlers/get_ratings_for_user';
import { getUserProfile } from './handlers/get_user_profile';
import { updateUserProfile } from './handlers/update_user_profile';
import { updateSupplierProfile } from './handlers/update_supplier_profile';
import { updateInquiryStatus } from './handlers/update_inquiry_status';
import { uploadFileAttachment } from './handlers/upload_file_attachment';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  getUserProfile: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserProfile(input.userId)),

  updateUserProfile: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUserProfile(input)),

  // Supplier profile management
  createSupplierProfile: publicProcedure
    .input(createSupplierProfileInputSchema)
    .mutation(({ input }) => createSupplierProfile(input)),

  updateSupplierProfile: publicProcedure
    .input(updateSupplierProfileInputSchema)
    .mutation(({ input }) => updateSupplierProfile(input)),

  // Supplier search and discovery
  searchSuppliers: publicProcedure
    .input(searchSuppliersInputSchema)
    .query(({ input }) => searchSuppliers(input)),

  // Inquiry management
  createInquiry: publicProcedure
    .input(createInquiryInputSchema)
    .mutation(({ input }) => createInquiry(input)),

  getInquiriesForSupplier: publicProcedure
    .input(z.object({ supplierId: z.number() }))
    .query(({ input }) => getInquiriesForSupplier(input.supplierId)),

  getInquiriesForBuyer: publicProcedure
    .input(z.object({ buyerId: z.number() }))
    .query(({ input }) => getInquiriesForBuyer(input.buyerId)),

  updateInquiryStatus: publicProcedure
    .input(updateInquiryStatusInputSchema)
    .mutation(({ input }) => updateInquiryStatus(input)),

  // Quote management
  createQuote: publicProcedure
    .input(createQuoteInputSchema)
    .mutation(({ input }) => createQuote(input)),

  getQuotesForInquiry: publicProcedure
    .input(z.object({ inquiryId: z.number() }))
    .query(({ input }) => getQuotesForInquiry(input.inquiryId)),

  // Messaging system
  createMessage: publicProcedure
    .input(createMessageInputSchema)
    .mutation(({ input }) => createMessage(input)),

  getMessagesForUser: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getMessagesForUser(input.userId)),

  markMessageAsRead: publicProcedure
    .input(z.object({ messageId: z.number(), userId: z.number() }))
    .mutation(({ input }) => markMessageAsRead(input.messageId, input.userId)),

  // Rating and feedback system
  createRating: publicProcedure
    .input(createRatingInputSchema)
    .mutation(({ input }) => createRating(input)),

  getRatingsForUser: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getRatingsForUser(input.userId)),

  // File attachment handling
  uploadFileAttachment: publicProcedure
    .input(z.object({
      filename: z.string(),
      filePath: z.string(),
      fileSize: z.number().int(),
      mimeType: z.string(),
      inquiryId: z.number().optional(),
      messageId: z.number().optional()
    }))
    .mutation(({ input }) => uploadFileAttachment(
      input.filename,
      input.filePath,
      input.fileSize,
      input.mimeType,
      input.inquiryId,
      input.messageId
    )),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Obalomat TRPC server listening at port: ${port}`);
}

start();