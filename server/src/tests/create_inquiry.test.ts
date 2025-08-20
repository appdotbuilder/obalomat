import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, inquiriesTable, inquirySuppliersTable } from '../db/schema';
import { type CreateInquiryInput } from '../schema';
import { createInquiry } from '../handlers/create_inquiry';
import { eq } from 'drizzle-orm';

describe('createInquiry', () => {
  let buyerId: number;
  let supplier1Id: number;
  let supplier2Id: number;
  let nonBuyerId: number;

  beforeEach(async () => {
    await createDB();

    // Create test users - buyer
    const buyerResult = await db.insert(usersTable)
      .values({
        email: 'buyer@test.com',
        password_hash: 'hashedpassword',
        company_name: 'Test Buyer Co',
        contact_person: 'John Buyer',
        phone: '+1234567890',
        role: 'buyer',
        location: 'New York',
        description: 'Test buyer company',
        website: 'https://buyer.test.com'
      })
      .returning()
      .execute();
    buyerId = buyerResult[0].id;

    // Create test suppliers
    const supplier1Result = await db.insert(usersTable)
      .values({
        email: 'supplier1@test.com',
        password_hash: 'hashedpassword',
        company_name: 'Test Supplier 1',
        contact_person: 'Jane Supplier',
        phone: '+1234567891',
        role: 'supplier',
        location: 'California',
        description: 'Test supplier 1',
        website: 'https://supplier1.test.com'
      })
      .returning()
      .execute();
    supplier1Id = supplier1Result[0].id;

    const supplier2Result = await db.insert(usersTable)
      .values({
        email: 'supplier2@test.com',
        password_hash: 'hashedpassword',
        company_name: 'Test Supplier 2',
        contact_person: 'Bob Supplier',
        phone: '+1234567892',
        role: 'supplier',
        location: 'Texas',
        description: 'Test supplier 2',
        website: 'https://supplier2.test.com'
      })
      .returning()
      .execute();
    supplier2Id = supplier2Result[0].id;

    // Create a non-buyer user for negative testing
    const nonBuyerResult = await db.insert(usersTable)
      .values({
        email: 'nonsupplier@test.com',
        password_hash: 'hashedpassword',
        company_name: 'Non-buyer Co',
        contact_person: 'Alice Non-buyer',
        phone: '+1234567893',
        role: 'supplier', // This is a supplier, not buyer
        location: 'Florida',
        description: 'Non-buyer user',
        website: 'https://nonsupplier.test.com'
      })
      .returning()
      .execute();
    nonBuyerId = nonBuyerResult[0].id;
  });

  afterEach(resetDB);

  const baseTestInput: CreateInquiryInput = {
    buyer_id: 0, // Will be set in tests
    packaging_type: 'boxes',
    material: 'cardboard',
    quantity: 1000,
    personalization_needed: true,
    description: 'Custom boxes for product packaging',
    budget_min: 500,
    budget_max: 1000,
    delivery_deadline: new Date('2024-12-31'),
    supplier_ids: [] // Will be set in tests
  };

  it('should create an inquiry with valid buyer', async () => {
    const testInput = {
      ...baseTestInput,
      buyer_id: buyerId,
      supplier_ids: [supplier1Id, supplier2Id]
    };

    const result = await createInquiry(testInput);

    // Validate basic fields
    expect(result.id).toBeDefined();
    expect(result.buyer_id).toEqual(buyerId);
    expect(result.packaging_type).toEqual('boxes');
    expect(result.material).toEqual('cardboard');
    expect(result.quantity).toEqual(1000);
    expect(result.personalization_needed).toEqual(true);
    expect(result.description).toEqual('Custom boxes for product packaging');
    expect(result.budget_min).toEqual(500);
    expect(result.budget_max).toEqual(1000);
    expect(result.delivery_deadline).toBeInstanceOf(Date);
    expect(result.status).toEqual('pending');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify numeric conversion
    expect(typeof result.budget_min).toBe('number');
    expect(typeof result.budget_max).toBe('number');
  });

  it('should save inquiry to database', async () => {
    const testInput = {
      ...baseTestInput,
      buyer_id: buyerId,
      supplier_ids: [supplier1Id]
    };

    const result = await createInquiry(testInput);

    // Verify inquiry was saved
    const savedInquiries = await db.select()
      .from(inquiriesTable)
      .where(eq(inquiriesTable.id, result.id))
      .execute();

    expect(savedInquiries).toHaveLength(1);
    const savedInquiry = savedInquiries[0];
    expect(savedInquiry.buyer_id).toEqual(buyerId);
    expect(savedInquiry.packaging_type).toEqual('boxes');
    expect(savedInquiry.material).toEqual('cardboard');
    expect(savedInquiry.quantity).toEqual(1000);
    expect(savedInquiry.description).toEqual('Custom boxes for product packaging');
    expect(parseFloat(savedInquiry.budget_min!)).toEqual(500);
    expect(parseFloat(savedInquiry.budget_max!)).toEqual(1000);
    expect(savedInquiry.status).toEqual('pending');
  });

  it('should create inquiry_supplier records for bulk distribution', async () => {
    const testInput = {
      ...baseTestInput,
      buyer_id: buyerId,
      supplier_ids: [supplier1Id, supplier2Id]
    };

    const result = await createInquiry(testInput);

    // Verify inquiry_supplier records were created
    const inquirySuppliers = await db.select()
      .from(inquirySuppliersTable)
      .where(eq(inquirySuppliersTable.inquiry_id, result.id))
      .execute();

    expect(inquirySuppliers).toHaveLength(2);
    
    const supplierIds = inquirySuppliers.map(is => is.supplier_id).sort();
    expect(supplierIds).toEqual([supplier1Id, supplier2Id].sort());

    // Verify all records have the correct inquiry_id
    inquirySuppliers.forEach(is => {
      expect(is.inquiry_id).toEqual(result.id);
      expect(is.sent_at).toBeInstanceOf(Date);
    });
  });

  it('should work without supplier_ids for direct inquiries', async () => {
    const testInput = {
      ...baseTestInput,
      buyer_id: buyerId,
      supplier_ids: []
    };

    const result = await createInquiry(testInput);

    expect(result.id).toBeDefined();
    expect(result.buyer_id).toEqual(buyerId);

    // Verify no inquiry_supplier records were created
    const inquirySuppliers = await db.select()
      .from(inquirySuppliersTable)
      .where(eq(inquirySuppliersTable.inquiry_id, result.id))
      .execute();

    expect(inquirySuppliers).toHaveLength(0);
  });

  it('should handle null budget values', async () => {
    const testInput = {
      ...baseTestInput,
      buyer_id: buyerId,
      supplier_ids: [supplier1Id],
      budget_min: null,
      budget_max: null
    };

    const result = await createInquiry(testInput);

    expect(result.budget_min).toBeNull();
    expect(result.budget_max).toBeNull();
  });

  it('should handle null delivery_deadline', async () => {
    const testInput = {
      ...baseTestInput,
      buyer_id: buyerId,
      supplier_ids: [supplier1Id],
      delivery_deadline: null
    };

    const result = await createInquiry(testInput);

    expect(result.delivery_deadline).toBeNull();
  });

  it('should throw error for non-existent buyer', async () => {
    const testInput = {
      ...baseTestInput,
      buyer_id: 99999,
      supplier_ids: [supplier1Id]
    };

    expect(createInquiry(testInput)).rejects.toThrow(/buyer not found/i);
  });

  it('should throw error when user is not a buyer', async () => {
    const testInput = {
      ...baseTestInput,
      buyer_id: nonBuyerId, // This user has supplier role
      supplier_ids: [supplier1Id]
    };

    expect(createInquiry(testInput)).rejects.toThrow(/not a buyer/i);
  });

  it('should throw error for non-existent supplier', async () => {
    const testInput = {
      ...baseTestInput,
      buyer_id: buyerId,
      supplier_ids: [supplier1Id, 99999] // Non-existent supplier
    };

    expect(createInquiry(testInput)).rejects.toThrow(/suppliers not found/i);
  });

  it('should throw error when supplier user is not a supplier', async () => {
    const testInput = {
      ...baseTestInput,
      buyer_id: buyerId,
      supplier_ids: [buyerId] // Buyer ID in supplier list
    };

    expect(createInquiry(testInput)).rejects.toThrow(/not suppliers/i);
  });

  it('should handle mixed valid and invalid suppliers', async () => {
    const testInput = {
      ...baseTestInput,
      buyer_id: buyerId,
      supplier_ids: [supplier1Id, buyerId] // Mix of supplier and buyer
    };

    expect(createInquiry(testInput)).rejects.toThrow(/not suppliers/i);
  });

  it('should create inquiry with single supplier', async () => {
    const testInput = {
      ...baseTestInput,
      buyer_id: buyerId,
      supplier_ids: [supplier1Id]
    };

    const result = await createInquiry(testInput);

    expect(result.id).toBeDefined();

    // Verify single inquiry_supplier record
    const inquirySuppliers = await db.select()
      .from(inquirySuppliersTable)
      .where(eq(inquirySuppliersTable.inquiry_id, result.id))
      .execute();

    expect(inquirySuppliers).toHaveLength(1);
    expect(inquirySuppliers[0].supplier_id).toEqual(supplier1Id);
  });
});