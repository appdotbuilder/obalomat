import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, inquiriesTable, ratingsTable } from '../db/schema';
import { type CreateRatingInput } from '../schema';
import { createRating } from '../handlers/create_rating';
import { eq, and } from 'drizzle-orm';

describe('createRating', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let buyerId: number;
  let supplierId: number;
  let inquiryId: number;

  beforeEach(async () => {
    // Create a buyer user
    const buyerResult = await db.insert(usersTable)
      .values({
        email: 'buyer@test.com',
        password_hash: 'hash123',
        company_name: 'Test Buyer Co',
        contact_person: 'John Buyer',
        phone: '123-456-7890',
        role: 'buyer',
        location: 'New York',
        description: 'Test buyer',
        website: 'https://buyer.com'
      })
      .returning()
      .execute();
    buyerId = buyerResult[0].id;

    // Create a supplier user
    const supplierResult = await db.insert(usersTable)
      .values({
        email: 'supplier@test.com',
        password_hash: 'hash456',
        company_name: 'Test Supplier Co',
        contact_person: 'Jane Supplier',
        phone: '987-654-3210',
        role: 'supplier',
        location: 'California',
        description: 'Test supplier',
        website: 'https://supplier.com'
      })
      .returning()
      .execute();
    supplierId = supplierResult[0].id;

    // Create an inquiry
    const inquiryResult = await db.insert(inquiriesTable)
      .values({
        buyer_id: buyerId,
        packaging_type: 'boxes',
        material: 'cardboard',
        quantity: 1000,
        personalization_needed: false,
        description: 'Test inquiry',
        budget_min: '100.00',
        budget_max: '500.00',
        delivery_deadline: new Date('2024-12-31'),
        status: 'pending'
      })
      .returning()
      .execute();
    inquiryId = inquiryResult[0].id;
  });

  const validRatingInput: CreateRatingInput = {
    rater_id: 0, // Will be set in tests
    rated_id: 0, // Will be set in tests
    inquiry_id: 0, // Will be set in tests
    rating: 5,
    comment: 'Excellent service!'
  };

  it('should create a rating from buyer to supplier', async () => {
    const input = {
      ...validRatingInput,
      rater_id: buyerId,
      rated_id: supplierId,
      inquiry_id: inquiryId
    };

    const result = await createRating(input);

    expect(result.rater_id).toEqual(buyerId);
    expect(result.rated_id).toEqual(supplierId);
    expect(result.inquiry_id).toEqual(inquiryId);
    expect(result.rating).toEqual(5);
    expect(result.comment).toEqual('Excellent service!');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a rating from supplier to buyer', async () => {
    const input = {
      ...validRatingInput,
      rater_id: supplierId,
      rated_id: buyerId,
      inquiry_id: inquiryId,
      rating: 4,
      comment: 'Great buyer, prompt payment'
    };

    const result = await createRating(input);

    expect(result.rater_id).toEqual(supplierId);
    expect(result.rated_id).toEqual(buyerId);
    expect(result.inquiry_id).toEqual(inquiryId);
    expect(result.rating).toEqual(4);
    expect(result.comment).toEqual('Great buyer, prompt payment');
  });

  it('should create a rating without inquiry_id', async () => {
    const input = {
      ...validRatingInput,
      rater_id: buyerId,
      rated_id: supplierId,
      inquiry_id: null,
      rating: 3,
      comment: 'General feedback'
    };

    const result = await createRating(input);

    expect(result.rater_id).toEqual(buyerId);
    expect(result.rated_id).toEqual(supplierId);
    expect(result.inquiry_id).toBeNull();
    expect(result.rating).toEqual(3);
    expect(result.comment).toEqual('General feedback');
  });

  it('should create a rating without comment', async () => {
    const input = {
      ...validRatingInput,
      rater_id: buyerId,
      rated_id: supplierId,
      inquiry_id: inquiryId,
      rating: 2,
      comment: null
    };

    const result = await createRating(input);

    expect(result.rater_id).toEqual(buyerId);
    expect(result.rated_id).toEqual(supplierId);
    expect(result.inquiry_id).toEqual(inquiryId);
    expect(result.rating).toEqual(2);
    expect(result.comment).toBeNull();
  });

  it('should save rating to database', async () => {
    const input = {
      ...validRatingInput,
      rater_id: buyerId,
      rated_id: supplierId,
      inquiry_id: inquiryId
    };

    const result = await createRating(input);

    const ratings = await db.select()
      .from(ratingsTable)
      .where(eq(ratingsTable.id, result.id))
      .execute();

    expect(ratings).toHaveLength(1);
    expect(ratings[0].rater_id).toEqual(buyerId);
    expect(ratings[0].rated_id).toEqual(supplierId);
    expect(ratings[0].inquiry_id).toEqual(inquiryId);
    expect(ratings[0].rating).toEqual(5);
    expect(ratings[0].comment).toEqual('Excellent service!');
    expect(ratings[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error if rater does not exist', async () => {
    const input = {
      ...validRatingInput,
      rater_id: 99999, // Non-existent user
      rated_id: supplierId,
      inquiry_id: inquiryId
    };

    await expect(createRating(input)).rejects.toThrow(/one or both users do not exist/i);
  });

  it('should throw error if rated user does not exist', async () => {
    const input = {
      ...validRatingInput,
      rater_id: buyerId,
      rated_id: 99999, // Non-existent user
      inquiry_id: inquiryId
    };

    await expect(createRating(input)).rejects.toThrow(/one or both users do not exist/i);
  });

  it('should throw error if both users have same role', async () => {
    // Create another buyer
    const anotherBuyerResult = await db.insert(usersTable)
      .values({
        email: 'buyer2@test.com',
        password_hash: 'hash789',
        company_name: 'Another Buyer Co',
        contact_person: 'Bob Buyer',
        phone: '555-123-4567',
        role: 'buyer',
        location: 'Texas',
        description: 'Another buyer',
        website: 'https://buyer2.com'
      })
      .returning()
      .execute();

    const input = {
      ...validRatingInput,
      rater_id: buyerId,
      rated_id: anotherBuyerResult[0].id, // Both are buyers
      inquiry_id: inquiryId
    };

    await expect(createRating(input)).rejects.toThrow(/must have different roles/i);
  });

  it('should throw error if inquiry does not exist', async () => {
    const input = {
      ...validRatingInput,
      rater_id: buyerId,
      rated_id: supplierId,
      inquiry_id: 99999 // Non-existent inquiry
    };

    await expect(createRating(input)).rejects.toThrow(/inquiry does not exist/i);
  });

  it('should throw error if duplicate rating exists for same inquiry', async () => {
    const input = {
      ...validRatingInput,
      rater_id: buyerId,
      rated_id: supplierId,
      inquiry_id: inquiryId
    };

    // Create first rating
    await createRating(input);

    // Try to create duplicate rating
    await expect(createRating(input)).rejects.toThrow(/rating already exists/i);
  });

  it('should allow multiple ratings for different inquiries between same users', async () => {
    // Create another inquiry
    const anotherInquiryResult = await db.insert(inquiriesTable)
      .values({
        buyer_id: buyerId,
        packaging_type: 'bottles',
        material: 'glass',
        quantity: 500,
        personalization_needed: true,
        description: 'Another test inquiry',
        budget_min: '200.00',
        budget_max: '800.00',
        delivery_deadline: new Date('2024-11-30'),
        status: 'pending'
      })
      .returning()
      .execute();

    // Create rating for first inquiry
    const input1 = {
      ...validRatingInput,
      rater_id: buyerId,
      rated_id: supplierId,
      inquiry_id: inquiryId,
      rating: 5
    };
    await createRating(input1);

    // Create rating for second inquiry - should succeed
    const input2 = {
      ...validRatingInput,
      rater_id: buyerId,
      rated_id: supplierId,
      inquiry_id: anotherInquiryResult[0].id,
      rating: 4
    };
    const result = await createRating(input2);

    expect(result.inquiry_id).toEqual(anotherInquiryResult[0].id);
    expect(result.rating).toEqual(4);
  });

  it('should allow ratings without inquiry_id even if users have existing ratings', async () => {
    // Create rating with inquiry_id
    const input1 = {
      ...validRatingInput,
      rater_id: buyerId,
      rated_id: supplierId,
      inquiry_id: inquiryId
    };
    await createRating(input1);

    // Create rating without inquiry_id - should succeed
    const input2 = {
      ...validRatingInput,
      rater_id: buyerId,
      rated_id: supplierId,
      inquiry_id: null,
      rating: 3,
      comment: 'General feedback'
    };
    const result = await createRating(input2);

    expect(result.inquiry_id).toBeNull();
    expect(result.rating).toEqual(3);
  });

  it('should validate rating bounds', async () => {
    const input = {
      ...validRatingInput,
      rater_id: buyerId,
      rated_id: supplierId,
      inquiry_id: inquiryId,
      rating: 1 // Minimum valid rating
    };

    const result = await createRating(input);
    expect(result.rating).toEqual(1);
  });
});