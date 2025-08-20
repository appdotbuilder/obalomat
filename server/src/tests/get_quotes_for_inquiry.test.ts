import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, inquiriesTable, quotesTable } from '../db/schema';
import { type CreateUserInput, type CreateInquiryInput, type CreateQuoteInput } from '../schema';
import { getQuotesForInquiry } from '../handlers/get_quotes_for_inquiry';

describe('getQuotesForInquiry', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const createTestBuyer = async () => {
    const buyerInput: CreateUserInput = {
      email: 'buyer@test.com',
      password_hash: 'hashed_password',
      company_name: 'Test Buyer Co',
      contact_person: 'John Buyer',
      phone: '+1234567890',
      role: 'buyer',
      location: 'New York, USA',
      description: 'Test buyer company',
      website: 'https://buyer.com'
    };

    const result = await db.insert(usersTable)
      .values(buyerInput)
      .returning()
      .execute();

    return result[0];
  };

  const createTestSupplier = async (email: string, companyName: string) => {
    const supplierInput: CreateUserInput = {
      email,
      password_hash: 'hashed_password',
      company_name: companyName,
      contact_person: 'Jane Supplier',
      phone: '+0987654321',
      role: 'supplier',
      location: 'California, USA',
      description: 'Test supplier company',
      website: 'https://supplier.com'
    };

    const result = await db.insert(usersTable)
      .values(supplierInput)
      .returning()
      .execute();

    return result[0];
  };

  const createTestInquiry = async (buyerId: number) => {
    const inquiryInput: CreateInquiryInput = {
      buyer_id: buyerId,
      packaging_type: 'boxes',
      material: 'cardboard',
      quantity: 1000,
      personalization_needed: true,
      description: 'Need custom boxes for product packaging',
      budget_min: 500,
      budget_max: 1500,
      delivery_deadline: new Date('2024-06-01'),
      supplier_ids: []
    };

    const result = await db.insert(inquiriesTable)
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

    return result[0];
  };

  const createTestQuote = async (inquiryId: number, supplierId: number, pricePerUnit: number) => {
    const quoteInput: CreateQuoteInput = {
      inquiry_id: inquiryId,
      supplier_id: supplierId,
      price_per_unit: pricePerUnit,
      total_price: pricePerUnit * 1000, // quantity is 1000 in test inquiry
      delivery_time_days: 14,
      notes: `Test quote from supplier ${supplierId}`
    };

    const result = await db.insert(quotesTable)
      .values({
        inquiry_id: quoteInput.inquiry_id,
        supplier_id: quoteInput.supplier_id,
        price_per_unit: quoteInput.price_per_unit.toString(),
        total_price: quoteInput.total_price.toString(),
        delivery_time_days: quoteInput.delivery_time_days,
        notes: quoteInput.notes
      })
      .returning()
      .execute();

    return result[0];
  };

  it('should fetch all quotes for an inquiry with supplier information', async () => {
    // Create test data
    const buyer = await createTestBuyer();
    const supplier1 = await createTestSupplier('supplier1@test.com', 'Supplier One Co');
    const supplier2 = await createTestSupplier('supplier2@test.com', 'Supplier Two Co');
    const inquiry = await createTestInquiry(buyer.id);

    // Create quotes from both suppliers
    await createTestQuote(inquiry.id, supplier1.id, 1.25);
    await createTestQuote(inquiry.id, supplier2.id, 1.50);

    // Test the handler
    const quotes = await getQuotesForInquiry(inquiry.id);

    expect(quotes).toHaveLength(2);

    // Verify quote structure and data
    quotes.forEach(quote => {
      expect(quote.id).toBeDefined();
      expect(quote.inquiry_id).toBe(inquiry.id);
      expect(quote.supplier_id).toBeDefined();
      expect(typeof quote.price_per_unit).toBe('number');
      expect(typeof quote.total_price).toBe('number');
      expect(quote.delivery_time_days).toBe(14);
      expect(quote.notes).toContain('Test quote from supplier');
      expect(quote.created_at).toBeInstanceOf(Date);

      // Verify supplier information is included
      expect(quote.supplier).toBeDefined();
      expect(quote.supplier.id).toBe(quote.supplier_id);
      expect(quote.supplier.company_name).toBeDefined();
      expect(quote.supplier.contact_person).toBe('Jane Supplier');
      expect(quote.supplier.phone).toBe('+0987654321');
      expect(quote.supplier.location).toBe('California, USA');
      expect(quote.supplier.website).toBe('https://supplier.com');
    });

    // Verify specific quote data
    const quote1 = quotes.find(q => q.supplier.company_name === 'Supplier One Co');
    const quote2 = quotes.find(q => q.supplier.company_name === 'Supplier Two Co');

    expect(quote1).toBeDefined();
    expect(quote1!.price_per_unit).toBe(1.25);
    expect(quote1!.total_price).toBe(1250);

    expect(quote2).toBeDefined();
    expect(quote2!.price_per_unit).toBe(1.50);
    expect(quote2!.total_price).toBe(1500);
  });

  it('should return empty array when inquiry has no quotes', async () => {
    // Create test data without quotes
    const buyer = await createTestBuyer();
    const inquiry = await createTestInquiry(buyer.id);

    // Test the handler
    const quotes = await getQuotesForInquiry(inquiry.id);

    expect(quotes).toHaveLength(0);
    expect(Array.isArray(quotes)).toBe(true);
  });

  it('should return empty array for non-existent inquiry', async () => {
    const nonExistentInquiryId = 99999;

    // Test the handler
    const quotes = await getQuotesForInquiry(nonExistentInquiryId);

    expect(quotes).toHaveLength(0);
    expect(Array.isArray(quotes)).toBe(true);
  });

  it('should handle quotes with null optional fields correctly', async () => {
    // Create test data
    const buyer = await createTestBuyer();
    const supplier = await createTestSupplier('supplier@test.com', 'Test Supplier');
    const inquiry = await createTestInquiry(buyer.id);

    // Create quote with null notes
    await db.insert(quotesTable)
      .values({
        inquiry_id: inquiry.id,
        supplier_id: supplier.id,
        price_per_unit: '2.00',
        total_price: '2000.00',
        delivery_time_days: 21,
        notes: null
      })
      .returning()
      .execute();

    // Test the handler
    const quotes = await getQuotesForInquiry(inquiry.id);

    expect(quotes).toHaveLength(1);
    expect(quotes[0].notes).toBeNull();
    expect(quotes[0].price_per_unit).toBe(2.00);
    expect(quotes[0].total_price).toBe(2000.00);
    expect(quotes[0].delivery_time_days).toBe(21);
  });

  it('should correctly convert numeric fields from strings', async () => {
    // Create test data
    const buyer = await createTestBuyer();
    const supplier = await createTestSupplier('supplier@test.com', 'Test Supplier');
    const inquiry = await createTestInquiry(buyer.id);

    // Create quote with decimal values (note: database stores with precision 10, scale 2)
    await db.insert(quotesTable)
      .values({
        inquiry_id: inquiry.id,
        supplier_id: supplier.id,
        price_per_unit: '1.23', // Only 2 decimal places due to database schema
        total_price: '1234.56',
        delivery_time_days: 10,
        notes: 'Precise pricing'
      })
      .returning()
      .execute();

    // Test the handler
    const quotes = await getQuotesForInquiry(inquiry.id);

    expect(quotes).toHaveLength(1);
    expect(quotes[0].price_per_unit).toBe(1.23); // Matches database precision
    expect(quotes[0].total_price).toBe(1234.56);
    expect(typeof quotes[0].price_per_unit).toBe('number');
    expect(typeof quotes[0].total_price).toBe('number');
  });

  it('should order quotes by creation date', async () => {
    // Create test data
    const buyer = await createTestBuyer();
    const supplier1 = await createTestSupplier('supplier1@test.com', 'First Supplier');
    const supplier2 = await createTestSupplier('supplier2@test.com', 'Second Supplier');
    const inquiry = await createTestInquiry(buyer.id);

    // Create quotes at different times (create first quote first)
    const firstQuote = await createTestQuote(inquiry.id, supplier1.id, 1.00);
    
    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const secondQuote = await createTestQuote(inquiry.id, supplier2.id, 2.00);

    // Test the handler
    const quotes = await getQuotesForInquiry(inquiry.id);

    expect(quotes).toHaveLength(2);
    
    // Verify they are returned in database order (typically by ID/creation time)
    expect(quotes[0].created_at.getTime()).toBeLessThanOrEqual(quotes[1].created_at.getTime());
  });
});