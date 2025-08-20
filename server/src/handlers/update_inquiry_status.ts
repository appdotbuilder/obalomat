import { db } from '../db';
import { inquiriesTable } from '../db/schema';
import { type UpdateInquiryStatusInput, type Inquiry } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateInquiryStatus(input: UpdateInquiryStatusInput): Promise<Inquiry> {
  try {
    // First, verify the inquiry exists
    const existingInquiry = await db.select()
      .from(inquiriesTable)
      .where(eq(inquiriesTable.id, input.id))
      .execute();

    if (existingInquiry.length === 0) {
      throw new Error(`Inquiry with id ${input.id} not found`);
    }

    // Validate status transition (optional business logic)
    const currentStatus = existingInquiry[0].status;
    const newStatus = input.status;
    
    // Business rule: prevent going backwards in status flow
    const statusOrder = ['pending', 'responded', 'closed'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const newIndex = statusOrder.indexOf(newStatus);
    
    if (newIndex < currentIndex) {
      throw new Error(`Invalid status transition: cannot change from '${currentStatus}' to '${newStatus}'`);
    }

    // Update the inquiry with new status and updated timestamp
    const result = await db.update(inquiriesTable)
      .set({
        status: input.status,
        updated_at: new Date()
      })
      .where(eq(inquiriesTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers
    const inquiry = result[0];
    return {
      ...inquiry,
      budget_min: inquiry.budget_min ? parseFloat(inquiry.budget_min) : null,
      budget_max: inquiry.budget_max ? parseFloat(inquiry.budget_max) : null
    };
  } catch (error) {
    console.error('Update inquiry status failed:', error);
    throw error;
  }
}