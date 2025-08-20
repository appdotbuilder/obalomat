import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, inquiriesTable } from '../db/schema';
import { type UpdateInquiryStatusInput } from '../schema';
import { updateInquiryStatus } from '../handlers/update_inquiry_status';
import { eq } from 'drizzle-orm';

describe('updateInquiryStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test user (buyer)
  const createTestUser = async () => {
    const result = await db.insert(usersTable)
      .values({
        email: 'buyer@test.com',
        password_hash: 'hashedpassword',
        company_name: 'Test Buyer Company',
        contact_person: 'John Buyer',
        phone: '+1234567890',
        role: 'buyer',
        location: 'Test City',
        description: 'Test buyer description',
        website: 'https://buyer.test.com'
      })
      .returning()
      .execute();
    return result[0];
  };

  // Helper function to create a test inquiry
  const createTestInquiry = async (buyerId: number, status = 'pending') => {
    const result = await db.insert(inquiriesTable)
      .values({
        buyer_id: buyerId,
        packaging_type: 'boxes',
        material: 'cardboard',
        quantity: 1000,
        personalization_needed: true,
        description: 'Test inquiry for cardboard boxes',
        budget_min: '10.50',
        budget_max: '15.75',
        delivery_deadline: new Date('2024-12-31'),
        status: status as any
      })
      .returning()
      .execute();
    
    // Convert numeric fields for consistent testing
    const inquiry = result[0];
    return {
      ...inquiry,
      budget_min: inquiry.budget_min ? parseFloat(inquiry.budget_min) : null,
      budget_max: inquiry.budget_max ? parseFloat(inquiry.budget_max) : null
    };
  };

  it('should update inquiry status successfully', async () => {
    const user = await createTestUser();
    const inquiry = await createTestInquiry(user.id);
    
    const input: UpdateInquiryStatusInput = {
      id: inquiry.id,
      status: 'responded'
    };

    const result = await updateInquiryStatus(input);

    // Verify the response
    expect(result.id).toBe(inquiry.id);
    expect(result.status).toBe('responded');
    expect(result.buyer_id).toBe(user.id);
    expect(result.packaging_type).toBe('boxes');
    expect(result.material).toBe('cardboard');
    expect(result.quantity).toBe(1000);
    expect(result.personalization_needed).toBe(true);
    expect(result.description).toBe('Test inquiry for cardboard boxes');
    expect(typeof result.budget_min).toBe('number');
    expect(result.budget_min).toBe(10.50);
    expect(typeof result.budget_max).toBe('number');
    expect(result.budget_max).toBe(15.75);
    expect(result.delivery_deadline).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > result.created_at).toBe(true);
  });

  it('should save updated status to database', async () => {
    const user = await createTestUser();
    const inquiry = await createTestInquiry(user.id);
    
    const input: UpdateInquiryStatusInput = {
      id: inquiry.id,
      status: 'closed'
    };

    const originalUpdatedAt = inquiry.updated_at;
    
    await updateInquiryStatus(input);

    // Query database directly to verify changes
    const updatedInquiry = await db.select()
      .from(inquiriesTable)
      .where(eq(inquiriesTable.id, inquiry.id))
      .execute();

    expect(updatedInquiry).toHaveLength(1);
    expect(updatedInquiry[0].status).toBe('closed');
    expect(updatedInquiry[0].updated_at > originalUpdatedAt).toBe(true);
  });

  it('should allow valid status transitions', async () => {
    const user = await createTestUser();
    
    // Test pending -> responded
    const inquiry1 = await createTestInquiry(user.id, 'pending');
    const result1 = await updateInquiryStatus({ id: inquiry1.id, status: 'responded' });
    expect(result1.status).toBe('responded');
    
    // Test responded -> closed
    const result2 = await updateInquiryStatus({ id: inquiry1.id, status: 'closed' });
    expect(result2.status).toBe('closed');
    
    // Test pending -> closed (skip responded)
    const inquiry2 = await createTestInquiry(user.id, 'pending');
    const result3 = await updateInquiryStatus({ id: inquiry2.id, status: 'closed' });
    expect(result3.status).toBe('closed');
  });

  it('should throw error for inquiry not found', async () => {
    const input: UpdateInquiryStatusInput = {
      id: 999,
      status: 'responded'
    };

    await expect(updateInquiryStatus(input)).rejects.toThrow(/Inquiry with id 999 not found/i);
  });

  it('should prevent invalid status transitions', async () => {
    const user = await createTestUser();
    
    // Create inquiry with 'responded' status
    const inquiry = await createTestInquiry(user.id, 'responded');
    
    const input: UpdateInquiryStatusInput = {
      id: inquiry.id,
      status: 'pending'
    };

    // Should throw error when trying to go from 'responded' back to 'pending'
    await expect(updateInquiryStatus(input)).rejects.toThrow(/Invalid status transition.*responded.*pending/i);
  });

  it('should prevent closed to previous status transitions', async () => {
    const user = await createTestUser();
    
    // Create inquiry with 'closed' status
    const inquiry = await createTestInquiry(user.id, 'closed');
    
    const input1: UpdateInquiryStatusInput = {
      id: inquiry.id,
      status: 'responded'
    };

    const input2: UpdateInquiryStatusInput = {
      id: inquiry.id,
      status: 'pending'
    };

    // Should throw error when trying to go from 'closed' to 'responded'
    await expect(updateInquiryStatus(input1)).rejects.toThrow(/Invalid status transition.*closed.*responded/i);
    
    // Should throw error when trying to go from 'closed' to 'pending'
    await expect(updateInquiryStatus(input2)).rejects.toThrow(/Invalid status transition.*closed.*pending/i);
  });

  it('should allow same status update (no change)', async () => {
    const user = await createTestUser();
    const inquiry = await createTestInquiry(user.id, 'pending');
    
    const input: UpdateInquiryStatusInput = {
      id: inquiry.id,
      status: 'pending'
    };

    const result = await updateInquiryStatus(input);
    expect(result.status).toBe('pending');
    expect(result.updated_at >= inquiry.updated_at).toBe(true);
  });

  it('should handle inquiries with null budget values', async () => {
    const user = await createTestUser();
    
    // Create inquiry without budget
    const result = await db.insert(inquiriesTable)
      .values({
        buyer_id: user.id,
        packaging_type: 'bottles',
        material: 'glass',
        quantity: 500,
        personalization_needed: false,
        description: 'Test inquiry without budget',
        budget_min: null,
        budget_max: null,
        delivery_deadline: null,
        status: 'pending'
      })
      .returning()
      .execute();

    const inquiry = result[0];
    
    const input: UpdateInquiryStatusInput = {
      id: inquiry.id,
      status: 'responded'
    };

    const updatedInquiry = await updateInquiryStatus(input);
    
    expect(updatedInquiry.status).toBe('responded');
    expect(updatedInquiry.budget_min).toBeNull();
    expect(updatedInquiry.budget_max).toBeNull();
    expect(updatedInquiry.delivery_deadline).toBeNull();
  });
});