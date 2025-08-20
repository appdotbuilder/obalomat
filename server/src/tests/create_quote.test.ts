import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, supplierProfilesTable, inquiriesTable, inquirySuppliersTable, quotesTable } from '../db/schema';
import { type CreateQuoteInput } from '../schema';
import { createQuote } from '../handlers/create_quote';
import { eq } from 'drizzle-orm';

describe('createQuote', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let buyerId: number;
  let supplierId: number;
  let inquiryId: number;

  beforeEach(async () => {
    // Create test buyer
    const buyerResult = await db.insert(usersTable)
      .values({
        email: 'buyer@test.com',
        password_hash: 'hashed',
        company_name: 'Buyer Company',
        contact_person: 'John Buyer',
        phone: '+1234567890',
        role: 'buyer',
        location: 'New York, NY',
        description: 'Test buyer',
        website: 'https://buyer.com'
      })
      .returning()
      .execute();
    buyerId = buyerResult[0].id;

    // Create test supplier
    const supplierResult = await db.insert(usersTable)
      .values({
        email: 'supplier@test.com',
        password_hash: 'hashed',
        company_name: 'Supplier Company',
        contact_person: 'Jane Supplier',
        phone: '+1234567891',
        role: 'supplier',
        location: 'Los Angeles, CA',
        description: 'Test supplier',
        website: 'https://supplier.com'
      })
      .returning()
      .execute();
    supplierId = supplierResult[0].id;

    // Create supplier profile
    await db.insert(supplierProfilesTable)
      .values({
        user_id: supplierId,
        packaging_types: ['boxes', 'bottles'],
        materials: ['cardboard', 'plastic'],
        min_order_quantity: 100,
        personalization_available: true,
        price_range_min: '1.00',
        price_range_max: '10.00',
        delivery_time_days: 7,
        certifications: ['fsc', 'iso14001']
      })
      .execute();

    // Create test inquiry
    const inquiryResult = await db.insert(inquiriesTable)
      .values({
        buyer_id: buyerId,
        packaging_type: 'boxes',
        material: 'cardboard',
        quantity: 500,
        personalization_needed: true,
        description: 'Need custom boxes for products',
        budget_min: '2.00',
        budget_max: '8.00',
        delivery_deadline: new Date('2024-12-31'),
        status: 'pending'
      })
      .returning()
      .execute();
    inquiryId = inquiryResult[0].id;

    // Link inquiry to supplier
    await db.insert(inquirySuppliersTable)
      .values({
        inquiry_id: inquiryId,
        supplier_id: supplierId
      })
      .execute();
  });

  const testInput: CreateQuoteInput = {
    inquiry_id: 0, // Will be set in tests
    supplier_id: 0, // Will be set in tests
    price_per_unit: 5.50,
    total_price: 2750.00,
    delivery_time_days: 10,
    notes: 'High quality custom boxes with logo'
  };

  it('should create a quote successfully', async () => {
    const input = {
      ...testInput,
      inquiry_id: inquiryId,
      supplier_id: supplierId
    };

    const result = await createQuote(input);

    // Basic field validation
    expect(result.inquiry_id).toEqual(inquiryId);
    expect(result.supplier_id).toEqual(supplierId);
    expect(result.price_per_unit).toEqual(5.50);
    expect(typeof result.price_per_unit).toEqual('number');
    expect(result.total_price).toEqual(2750.00);
    expect(typeof result.total_price).toEqual('number');
    expect(result.delivery_time_days).toEqual(10);
    expect(result.notes).toEqual('High quality custom boxes with logo');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save quote to database', async () => {
    const input = {
      ...testInput,
      inquiry_id: inquiryId,
      supplier_id: supplierId
    };

    const result = await createQuote(input);

    // Query database to verify quote was saved
    const quotes = await db.select()
      .from(quotesTable)
      .where(eq(quotesTable.id, result.id))
      .execute();

    expect(quotes).toHaveLength(1);
    expect(quotes[0].inquiry_id).toEqual(inquiryId);
    expect(quotes[0].supplier_id).toEqual(supplierId);
    expect(parseFloat(quotes[0].price_per_unit)).toEqual(5.50);
    expect(parseFloat(quotes[0].total_price)).toEqual(2750.00);
    expect(quotes[0].delivery_time_days).toEqual(10);
    expect(quotes[0].notes).toEqual('High quality custom boxes with logo');
  });

  it('should update inquiry status from pending to responded', async () => {
    const input = {
      ...testInput,
      inquiry_id: inquiryId,
      supplier_id: supplierId
    };

    await createQuote(input);

    // Check that inquiry status was updated
    const inquiries = await db.select()
      .from(inquiriesTable)
      .where(eq(inquiriesTable.id, inquiryId))
      .execute();

    expect(inquiries).toHaveLength(1);
    expect(inquiries[0].status).toEqual('responded');
  });

  it('should not update inquiry status if already responded', async () => {
    // Set inquiry status to 'responded'
    await db.update(inquiriesTable)
      .set({ status: 'responded' })
      .where(eq(inquiriesTable.id, inquiryId))
      .execute();

    const input = {
      ...testInput,
      inquiry_id: inquiryId,
      supplier_id: supplierId
    };

    await createQuote(input);

    // Check that inquiry status remains 'responded'
    const inquiries = await db.select()
      .from(inquiriesTable)
      .where(eq(inquiriesTable.id, inquiryId))
      .execute();

    expect(inquiries).toHaveLength(1);
    expect(inquiries[0].status).toEqual('responded');
  });

  it('should create quote with null notes', async () => {
    const input = {
      ...testInput,
      inquiry_id: inquiryId,
      supplier_id: supplierId,
      notes: null
    };

    const result = await createQuote(input);

    expect(result.notes).toBeNull();
  });

  it('should throw error if supplier does not exist', async () => {
    const input = {
      ...testInput,
      inquiry_id: inquiryId,
      supplier_id: 99999
    };

    await expect(createQuote(input)).rejects.toThrow(/supplier with id 99999 not found/i);
  });

  it('should throw error if user is not a supplier', async () => {
    const input = {
      ...testInput,
      inquiry_id: inquiryId,
      supplier_id: buyerId // Use buyer ID instead of supplier ID
    };

    await expect(createQuote(input)).rejects.toThrow(/user with id .+ is not a supplier/i);
  });

  it('should throw error if inquiry does not exist', async () => {
    const input = {
      ...testInput,
      inquiry_id: 99999,
      supplier_id: supplierId
    };

    await expect(createQuote(input)).rejects.toThrow(/inquiry with id 99999 not found/i);
  });

  it('should throw error if supplier was not sent the inquiry', async () => {
    // Create another supplier not linked to the inquiry
    const anotherSupplierResult = await db.insert(usersTable)
      .values({
        email: 'another@supplier.com',
        password_hash: 'hashed',
        company_name: 'Another Supplier',
        contact_person: 'Bob Supplier',
        role: 'supplier',
        location: 'Chicago, IL'
      })
      .returning()
      .execute();
    const anotherSupplierId = anotherSupplierResult[0].id;

    const input = {
      ...testInput,
      inquiry_id: inquiryId,
      supplier_id: anotherSupplierId
    };

    await expect(createQuote(input)).rejects.toThrow(/supplier .+ was not sent inquiry .+/i);
  });

  it('should handle multiple quotes for same inquiry', async () => {
    const input1 = {
      ...testInput,
      inquiry_id: inquiryId,
      supplier_id: supplierId,
      price_per_unit: 5.50,
      total_price: 2750.00
    };

    // Create another supplier and link to same inquiry
    const supplier2Result = await db.insert(usersTable)
      .values({
        email: 'supplier2@test.com',
        password_hash: 'hashed',
        company_name: 'Supplier 2',
        contact_person: 'Mike Supplier',
        role: 'supplier',
        location: 'Seattle, WA'
      })
      .returning()
      .execute();
    const supplier2Id = supplier2Result[0].id;

    await db.insert(inquirySuppliersTable)
      .values({
        inquiry_id: inquiryId,
        supplier_id: supplier2Id
      })
      .execute();

    const input2 = {
      ...testInput,
      inquiry_id: inquiryId,
      supplier_id: supplier2Id,
      price_per_unit: 4.75,
      total_price: 2375.00
    };

    // Create both quotes
    const result1 = await createQuote(input1);
    const result2 = await createQuote(input2);

    // Verify both quotes exist
    expect(result1.id).not.toEqual(result2.id);
    expect(result1.price_per_unit).toEqual(5.50);
    expect(result2.price_per_unit).toEqual(4.75);

    // Verify both are saved in database
    const quotes = await db.select()
      .from(quotesTable)
      .where(eq(quotesTable.inquiry_id, inquiryId))
      .execute();

    expect(quotes).toHaveLength(2);
  });
});