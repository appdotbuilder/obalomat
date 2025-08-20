import { db } from '../db';
import { inquiriesTable, inquirySuppliersTable } from '../db/schema';
import { type Inquiry } from '../schema';
import { eq } from 'drizzle-orm';

export async function getInquiriesForSupplier(supplierId: number): Promise<Inquiry[]> {
  try {
    const results = await db
      .select()
      .from(inquiriesTable)
      .innerJoin(
        inquirySuppliersTable,
        eq(inquiriesTable.id, inquirySuppliersTable.inquiry_id)
      )
      .where(eq(inquirySuppliersTable.supplier_id, supplierId))
      .execute();

    // Convert numeric fields to numbers and handle the joined result structure
    return results.map(result => {
      const inquiry = result.inquiries;
      return {
        ...inquiry,
        budget_min: inquiry.budget_min ? parseFloat(inquiry.budget_min) : null,
        budget_max: inquiry.budget_max ? parseFloat(inquiry.budget_max) : null
      };
    });
  } catch (error) {
    console.error('Failed to get inquiries for supplier:', error);
    throw error;
  }
}