import { db } from '../db';
import { inquiriesTable } from '../db/schema';
import { type Inquiry } from '../schema';
import { eq } from 'drizzle-orm';

export const getInquiriesForBuyer = async (buyerId: number): Promise<Inquiry[]> => {
  try {
    const results = await db.select()
      .from(inquiriesTable)
      .where(eq(inquiriesTable.buyer_id, buyerId))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(inquiry => ({
      ...inquiry,
      budget_min: inquiry.budget_min ? parseFloat(inquiry.budget_min) : null,
      budget_max: inquiry.budget_max ? parseFloat(inquiry.budget_max) : null
    }));
  } catch (error) {
    console.error('Failed to fetch inquiries for buyer:', error);
    throw error;
  }
};