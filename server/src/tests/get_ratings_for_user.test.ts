import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, ratingsTable, inquiriesTable } from '../db/schema';
import { type CreateUserInput, type CreateRatingInput, type CreateInquiryInput } from '../schema';
import { getRatingsForUser } from '../handlers/get_ratings_for_user';

// Test data
const buyerInput: CreateUserInput = {
  email: 'buyer@test.com',
  password_hash: 'hashedpass',
  company_name: 'Buyer Corp',
  contact_person: 'John Buyer',
  phone: '+1234567890',
  role: 'buyer',
  location: 'New York',
  description: 'A test buyer company',
  website: 'https://buyer.com'
};

const supplierInput: CreateUserInput = {
  email: 'supplier@test.com',
  password_hash: 'hashedpass',
  company_name: 'Supplier Corp',
  contact_person: 'Jane Supplier',
  phone: '+0987654321',
  role: 'supplier',
  location: 'California',
  description: 'A test supplier company',
  website: 'https://supplier.com'
};

const raterInput: CreateUserInput = {
  email: 'rater@test.com',
  password_hash: 'hashedpass',
  company_name: 'Rater Corp',
  contact_person: 'Bob Rater',
  phone: '+1122334455',
  role: 'buyer',
  location: 'Texas',
  description: 'Another test company',
  website: 'https://rater.com'
};

describe('getRatingsForUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no ratings', async () => {
    // Create a user
    const [user] = await db.insert(usersTable)
      .values(buyerInput)
      .returning()
      .execute();

    const result = await getRatingsForUser(user.id);

    expect(result).toEqual([]);
  });

  it('should return ratings for a user', async () => {
    // Create users
    const [buyer] = await db.insert(usersTable)
      .values(buyerInput)
      .returning()
      .execute();

    const [supplier] = await db.insert(usersTable)
      .values(supplierInput)
      .returning()
      .execute();

    const [rater] = await db.insert(usersTable)
      .values(raterInput)
      .returning()
      .execute();

    // Create an inquiry
    const inquiryInput: CreateInquiryInput = {
      buyer_id: buyer.id,
      packaging_type: 'boxes',
      material: 'cardboard',
      quantity: 1000,
      personalization_needed: true,
      description: 'Need custom boxes',
      budget_min: 100,
      budget_max: 500,
      delivery_deadline: new Date('2024-12-31'),
      supplier_ids: [supplier.id]
    };

    const [inquiry] = await db.insert(inquiriesTable)
      .values({
        buyer_id: inquiryInput.buyer_id,
        packaging_type: inquiryInput.packaging_type,
        material: inquiryInput.material,
        quantity: inquiryInput.quantity,
        personalization_needed: inquiryInput.personalization_needed,
        description: inquiryInput.description,
        budget_min: inquiryInput.budget_min?.toString(),
        budget_max: inquiryInput.budget_max?.toString(),
        delivery_deadline: inquiryInput.delivery_deadline
      })
      .returning()
      .execute();

    // Create first rating
    const [rating1] = await db.insert(ratingsTable)
      .values({
        rater_id: buyer.id,
        rated_id: supplier.id,
        inquiry_id: inquiry.id,
        rating: 5,
        comment: 'Excellent service!'
      })
      .returning()
      .execute();

    // Wait to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 10));

    // Create second rating
    const [rating2] = await db.insert(ratingsTable)
      .values({
        rater_id: rater.id,
        rated_id: supplier.id,
        inquiry_id: null,
        rating: 4,
        comment: 'Good quality work'
      })
      .returning()
      .execute();

    const result = await getRatingsForUser(supplier.id);

    expect(result).toHaveLength(2);
    
    // Verify all ratings are present with correct basic properties
    const ratingComments = result.map(r => r.comment);
    expect(ratingComments).toContain('Excellent service!');
    expect(ratingComments).toContain('Good quality work');

    // Find each rating in the result
    const excellentRating = result.find(r => r.comment === 'Excellent service!');
    const goodRating = result.find(r => r.comment === 'Good quality work');

    // Check excellent service rating
    expect(excellentRating).toBeDefined();
    expect(excellentRating!.rater_id).toEqual(buyer.id);
    expect(excellentRating!.rated_id).toEqual(supplier.id);
    expect(excellentRating!.inquiry_id).toEqual(inquiry.id);
    expect(excellentRating!.rating).toEqual(5);
    expect(excellentRating!.created_at).toBeInstanceOf(Date);

    // Check good quality rating
    expect(goodRating).toBeDefined();
    expect(goodRating!.rater_id).toEqual(rater.id);
    expect(goodRating!.rated_id).toEqual(supplier.id);
    expect(goodRating!.inquiry_id).toEqual(null);
    expect(goodRating!.rating).toEqual(4);
    expect(goodRating!.created_at).toBeInstanceOf(Date);

    // Verify ordering (most recent first)
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });

  it('should only return ratings for the specified user', async () => {
    // Create users
    const [supplier1] = await db.insert(usersTable)
      .values({
        ...supplierInput,
        email: 'supplier1@test.com'
      })
      .returning()
      .execute();

    const [supplier2] = await db.insert(usersTable)
      .values({
        ...supplierInput,
        email: 'supplier2@test.com'
      })
      .returning()
      .execute();

    const [buyer] = await db.insert(usersTable)
      .values(buyerInput)
      .returning()
      .execute();

    // Create ratings for both suppliers
    await db.insert(ratingsTable)
      .values([
        {
          rater_id: buyer.id,
          rated_id: supplier1.id,
          inquiry_id: null,
          rating: 5,
          comment: 'Great supplier 1'
        },
        {
          rater_id: buyer.id,
          rated_id: supplier2.id,
          inquiry_id: null,
          rating: 3,
          comment: 'Okay supplier 2'
        }
      ])
      .execute();

    // Get ratings for supplier1 only
    const result = await getRatingsForUser(supplier1.id);

    expect(result).toHaveLength(1);
    expect(result[0].rated_id).toEqual(supplier1.id);
    expect(result[0].comment).toEqual('Great supplier 1');
  });

  it('should handle ratings without comments', async () => {
    // Create users
    const [buyer] = await db.insert(usersTable)
      .values(buyerInput)
      .returning()
      .execute();

    const [supplier] = await db.insert(usersTable)
      .values(supplierInput)
      .returning()
      .execute();

    // Create rating without comment
    await db.insert(ratingsTable)
      .values({
        rater_id: buyer.id,
        rated_id: supplier.id,
        inquiry_id: null,
        rating: 4,
        comment: null
      })
      .execute();

    const result = await getRatingsForUser(supplier.id);

    expect(result).toHaveLength(1);
    expect(result[0].rating).toEqual(4);
    expect(result[0].comment).toEqual(null);
  });

  it('should order ratings by creation date descending', async () => {
    // Create users
    const [buyer] = await db.insert(usersTable)
      .values(buyerInput)
      .returning()
      .execute();

    const [supplier] = await db.insert(usersTable)
      .values(supplierInput)
      .returning()
      .execute();

    // Create multiple ratings with different timestamps
    const [rating1] = await db.insert(ratingsTable)
      .values({
        rater_id: buyer.id,
        rated_id: supplier.id,
        inquiry_id: null,
        rating: 3,
        comment: 'First rating'
      })
      .returning()
      .execute();

    // Wait a moment to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const [rating2] = await db.insert(ratingsTable)
      .values({
        rater_id: buyer.id,
        rated_id: supplier.id,
        inquiry_id: null,
        rating: 5,
        comment: 'Second rating'
      })
      .returning()
      .execute();

    const result = await getRatingsForUser(supplier.id);

    expect(result).toHaveLength(2);
    // Most recent should be first
    expect(result[0].comment).toEqual('Second rating');
    expect(result[1].comment).toEqual('First rating');
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });

  it('should handle non-existent user gracefully', async () => {
    const result = await getRatingsForUser(999999);
    expect(result).toEqual([]);
  });
});