import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, inquiriesTable } from '../db/schema';
import { type CreateUserInput, type CreateInquiryInput } from '../schema';
import { getInquiriesForBuyer } from '../handlers/get_inquiries_for_buyer';

// Test data
const testBuyer: CreateUserInput = {
  email: 'buyer@test.com',
  password_hash: 'hashed_password_123',
  company_name: 'Test Buyer Corp',
  contact_person: 'John Buyer',
  phone: '+1234567890',
  role: 'buyer',
  location: 'New York, NY',
  description: 'We buy packaging materials',
  website: 'https://testbuyer.com'
};

const testSupplier: CreateUserInput = {
  email: 'supplier@test.com',
  password_hash: 'hashed_password_456',
  company_name: 'Test Supplier Inc',
  contact_person: 'Jane Supplier',
  phone: '+1987654321',
  role: 'supplier',
  location: 'Los Angeles, CA',
  description: 'We supply packaging materials',
  website: 'https://testsupplier.com'
};

const testInquiry1: CreateInquiryInput = {
  buyer_id: 1, // Will be set dynamically
  packaging_type: 'boxes',
  material: 'cardboard',
  quantity: 1000,
  personalization_needed: true,
  description: 'Need custom branded boxes for our product line',
  budget_min: 2.50,
  budget_max: 5.00,
  delivery_deadline: new Date('2024-12-31'),
  supplier_ids: []
};

const testInquiry2: CreateInquiryInput = {
  buyer_id: 1, // Will be set dynamically
  packaging_type: 'bottles',
  material: 'glass',
  quantity: 500,
  personalization_needed: false,
  description: 'Standard glass bottles for beverage packaging',
  budget_min: null,
  budget_max: 10.00,
  delivery_deadline: null,
  supplier_ids: []
};

describe('getInquiriesForBuyer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when buyer has no inquiries', async () => {
    // Create buyer but no inquiries
    const buyerResult = await db.insert(usersTable)
      .values({
        email: testBuyer.email,
        password_hash: testBuyer.password_hash,
        company_name: testBuyer.company_name,
        contact_person: testBuyer.contact_person,
        phone: testBuyer.phone,
        role: testBuyer.role,
        location: testBuyer.location,
        description: testBuyer.description,
        website: testBuyer.website
      })
      .returning()
      .execute();

    const result = await getInquiriesForBuyer(buyerResult[0].id);

    expect(result).toEqual([]);
  });

  it('should return all inquiries for a specific buyer', async () => {
    // Create buyer
    const buyerResult = await db.insert(usersTable)
      .values({
        email: testBuyer.email,
        password_hash: testBuyer.password_hash,
        company_name: testBuyer.company_name,
        contact_person: testBuyer.contact_person,
        phone: testBuyer.phone,
        role: testBuyer.role,
        location: testBuyer.location,
        description: testBuyer.description,
        website: testBuyer.website
      })
      .returning()
      .execute();

    const buyerId = buyerResult[0].id;

    // Create inquiries for this buyer
    await db.insert(inquiriesTable)
      .values([
        {
          buyer_id: buyerId,
          packaging_type: testInquiry1.packaging_type,
          material: testInquiry1.material,
          quantity: testInquiry1.quantity,
          personalization_needed: testInquiry1.personalization_needed,
          description: testInquiry1.description,
          budget_min: testInquiry1.budget_min?.toString(),
          budget_max: testInquiry1.budget_max?.toString(),
          delivery_deadline: testInquiry1.delivery_deadline
        },
        {
          buyer_id: buyerId,
          packaging_type: testInquiry2.packaging_type,
          material: testInquiry2.material,
          quantity: testInquiry2.quantity,
          personalization_needed: testInquiry2.personalization_needed,
          description: testInquiry2.description,
          budget_min: testInquiry2.budget_min?.toString(),
          budget_max: testInquiry2.budget_max?.toString(),
          delivery_deadline: testInquiry2.delivery_deadline
        }
      ])
      .execute();

    const result = await getInquiriesForBuyer(buyerId);

    expect(result).toHaveLength(2);
    
    // Check first inquiry
    const inquiry1 = result.find(i => i.packaging_type === 'boxes');
    expect(inquiry1).toBeDefined();
    expect(inquiry1!.buyer_id).toEqual(buyerId);
    expect(inquiry1!.packaging_type).toEqual('boxes');
    expect(inquiry1!.material).toEqual('cardboard');
    expect(inquiry1!.quantity).toEqual(1000);
    expect(inquiry1!.personalization_needed).toEqual(true);
    expect(inquiry1!.description).toEqual('Need custom branded boxes for our product line');
    expect(inquiry1!.budget_min).toEqual(2.50);
    expect(inquiry1!.budget_max).toEqual(5.00);
    expect(inquiry1!.delivery_deadline).toBeInstanceOf(Date);
    expect(inquiry1!.status).toEqual('pending');
    expect(inquiry1!.created_at).toBeInstanceOf(Date);
    expect(inquiry1!.updated_at).toBeInstanceOf(Date);

    // Check second inquiry
    const inquiry2 = result.find(i => i.packaging_type === 'bottles');
    expect(inquiry2).toBeDefined();
    expect(inquiry2!.buyer_id).toEqual(buyerId);
    expect(inquiry2!.packaging_type).toEqual('bottles');
    expect(inquiry2!.material).toEqual('glass');
    expect(inquiry2!.quantity).toEqual(500);
    expect(inquiry2!.personalization_needed).toEqual(false);
    expect(inquiry2!.description).toEqual('Standard glass bottles for beverage packaging');
    expect(inquiry2!.budget_min).toBeNull();
    expect(inquiry2!.budget_max).toEqual(10.00);
    expect(inquiry2!.delivery_deadline).toBeNull();
  });

  it('should not return inquiries from other buyers', async () => {
    // Create two buyers
    const buyer1Result = await db.insert(usersTable)
      .values({
        email: testBuyer.email,
        password_hash: testBuyer.password_hash,
        company_name: testBuyer.company_name,
        contact_person: testBuyer.contact_person,
        phone: testBuyer.phone,
        role: testBuyer.role,
        location: testBuyer.location,
        description: testBuyer.description,
        website: testBuyer.website
      })
      .returning()
      .execute();

    const buyer2Result = await db.insert(usersTable)
      .values({
        email: 'buyer2@test.com',
        password_hash: testBuyer.password_hash,
        company_name: 'Another Buyer Corp',
        contact_person: 'Jane Buyer',
        phone: '+1111111111',
        role: 'buyer',
        location: 'Chicago, IL',
        description: 'Another buyer company',
        website: 'https://anotherbuyer.com'
      })
      .returning()
      .execute();

    const buyer1Id = buyer1Result[0].id;
    const buyer2Id = buyer2Result[0].id;

    // Create inquiries for both buyers
    await db.insert(inquiriesTable)
      .values([
        {
          buyer_id: buyer1Id,
          packaging_type: 'boxes',
          material: 'cardboard',
          quantity: 1000,
          personalization_needed: true,
          description: 'Buyer 1 inquiry',
          budget_min: '2.50',
          budget_max: '5.00',
          delivery_deadline: new Date('2024-12-31')
        },
        {
          buyer_id: buyer2Id,
          packaging_type: 'bottles',
          material: 'glass',
          quantity: 500,
          personalization_needed: false,
          description: 'Buyer 2 inquiry',
          budget_min: null,
          budget_max: '10.00',
          delivery_deadline: null
        }
      ])
      .execute();

    // Get inquiries for buyer 1 only
    const result = await getInquiriesForBuyer(buyer1Id);

    expect(result).toHaveLength(1);
    expect(result[0].buyer_id).toEqual(buyer1Id);
    expect(result[0].description).toEqual('Buyer 1 inquiry');
  });

  it('should handle numeric field conversions correctly', async () => {
    // Create buyer
    const buyerResult = await db.insert(usersTable)
      .values({
        email: testBuyer.email,
        password_hash: testBuyer.password_hash,
        company_name: testBuyer.company_name,
        contact_person: testBuyer.contact_person,
        phone: testBuyer.phone,
        role: testBuyer.role,
        location: testBuyer.location,
        description: testBuyer.description,
        website: testBuyer.website
      })
      .returning()
      .execute();

    const buyerId = buyerResult[0].id;

    // Create inquiry with budget values
    await db.insert(inquiriesTable)
      .values({
        buyer_id: buyerId,
        packaging_type: 'boxes',
        material: 'cardboard',
        quantity: 1000,
        personalization_needed: true,
        description: 'Test inquiry with budget',
        budget_min: '15.75',
        budget_max: '25.99',
        delivery_deadline: new Date('2024-12-31')
      })
      .execute();

    const result = await getInquiriesForBuyer(buyerId);

    expect(result).toHaveLength(1);
    expect(typeof result[0].budget_min).toBe('number');
    expect(typeof result[0].budget_max).toBe('number');
    expect(result[0].budget_min).toEqual(15.75);
    expect(result[0].budget_max).toEqual(25.99);
  });

  it('should handle null budget values correctly', async () => {
    // Create buyer
    const buyerResult = await db.insert(usersTable)
      .values({
        email: testBuyer.email,
        password_hash: testBuyer.password_hash,
        company_name: testBuyer.company_name,
        contact_person: testBuyer.contact_person,
        phone: testBuyer.phone,
        role: testBuyer.role,
        location: testBuyer.location,
        description: testBuyer.description,
        website: testBuyer.website
      })
      .returning()
      .execute();

    const buyerId = buyerResult[0].id;

    // Create inquiry with null budget values
    await db.insert(inquiriesTable)
      .values({
        buyer_id: buyerId,
        packaging_type: 'boxes',
        material: 'cardboard',
        quantity: 1000,
        personalization_needed: true,
        description: 'Test inquiry without budget',
        budget_min: null,
        budget_max: null,
        delivery_deadline: null
      })
      .execute();

    const result = await getInquiriesForBuyer(buyerId);

    expect(result).toHaveLength(1);
    expect(result[0].budget_min).toBeNull();
    expect(result[0].budget_max).toBeNull();
    expect(result[0].delivery_deadline).toBeNull();
  });

  it('should return inquiries ordered by creation date', async () => {
    // Create buyer
    const buyerResult = await db.insert(usersTable)
      .values({
        email: testBuyer.email,
        password_hash: testBuyer.password_hash,
        company_name: testBuyer.company_name,
        contact_person: testBuyer.contact_person,
        phone: testBuyer.phone,
        role: testBuyer.role,
        location: testBuyer.location,
        description: testBuyer.description,
        website: testBuyer.website
      })
      .returning()
      .execute();

    const buyerId = buyerResult[0].id;

    // Create multiple inquiries with slight delays to ensure different timestamps
    await db.insert(inquiriesTable)
      .values({
        buyer_id: buyerId,
        packaging_type: 'boxes',
        material: 'cardboard',
        quantity: 1000,
        personalization_needed: true,
        description: 'First inquiry',
        budget_min: null,
        budget_max: null,
        delivery_deadline: null
      })
      .execute();

    await new Promise(resolve => setTimeout(resolve, 10)); // Small delay

    await db.insert(inquiriesTable)
      .values({
        buyer_id: buyerId,
        packaging_type: 'bottles',
        material: 'glass',
        quantity: 500,
        personalization_needed: false,
        description: 'Second inquiry',
        budget_min: null,
        budget_max: null,
        delivery_deadline: null
      })
      .execute();

    const result = await getInquiriesForBuyer(buyerId);

    expect(result).toHaveLength(2);
    
    // Inquiries should be returned (database default order might be by creation time)
    const firstInquiry = result.find(i => i.description === 'First inquiry');
    const secondInquiry = result.find(i => i.description === 'Second inquiry');
    
    expect(firstInquiry).toBeDefined();
    expect(secondInquiry).toBeDefined();
    expect(firstInquiry!.created_at).toBeInstanceOf(Date);
    expect(secondInquiry!.created_at).toBeInstanceOf(Date);
  });
});