import { db } from '../db';
import { quotesTable, usersTable, inquiriesTable, inquirySuppliersTable } from '../db/schema';
import { type CreateQuoteInput, type Quote } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function createQuote(input: CreateQuoteInput): Promise<Quote> {
  try {
    // Validate that supplier_id exists and belongs to supplier role
    const supplier = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.supplier_id))
      .execute();

    if (supplier.length === 0) {
      throw new Error(`Supplier with ID ${input.supplier_id} not found`);
    }

    if (supplier[0].role !== 'supplier') {
      throw new Error(`User with ID ${input.supplier_id} is not a supplier`);
    }

    // Validate that inquiry_id exists
    const inquiry = await db.select()
      .from(inquiriesTable)
      .where(eq(inquiriesTable.id, input.inquiry_id))
      .execute();

    if (inquiry.length === 0) {
      throw new Error(`Inquiry with ID ${input.inquiry_id} not found`);
    }

    // Validate that the supplier received this inquiry
    const inquirySupplier = await db.select()
      .from(inquirySuppliersTable)
      .where(and(
        eq(inquirySuppliersTable.inquiry_id, input.inquiry_id),
        eq(inquirySuppliersTable.supplier_id, input.supplier_id)
      ))
      .execute();

    if (inquirySupplier.length === 0) {
      throw new Error(`Supplier ${input.supplier_id} was not sent inquiry ${input.inquiry_id}`);
    }

    // Create the quote
    const result = await db.insert(quotesTable)
      .values({
        inquiry_id: input.inquiry_id,
        supplier_id: input.supplier_id,
        price_per_unit: input.price_per_unit.toString(), // Convert number to string for numeric column
        total_price: input.total_price.toString(), // Convert number to string for numeric column
        delivery_time_days: input.delivery_time_days,
        notes: input.notes
      })
      .returning()
      .execute();

    // Update inquiry status to 'responded' if it was 'pending'
    if (inquiry[0].status === 'pending') {
      await db.update(inquiriesTable)
        .set({ 
          status: 'responded',
          updated_at: new Date()
        })
        .where(eq(inquiriesTable.id, input.inquiry_id))
        .execute();
    }

    // Convert numeric fields back to numbers before returning
    const quote = result[0];
    return {
      ...quote,
      price_per_unit: parseFloat(quote.price_per_unit), // Convert string back to number
      total_price: parseFloat(quote.total_price) // Convert string back to number
    };
  } catch (error) {
    console.error('Quote creation failed:', error);
    throw error;
  }
}