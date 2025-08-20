import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, inquiriesTable, inquirySuppliersTable } from '../db/schema';
import { getInquiriesForSupplier } from '../handlers/get_inquiries_for_supplier';
import { eq } from 'drizzle-orm';

describe('getInquiriesForSupplier', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return inquiries sent to a specific supplier', async () => {
    // Create test users
    const buyerResult = await db.insert(usersTable).values({
      email: 'buyer@test.com',
      password_hash: 'hash123',
      company_name: 'Buyer Company',
      contact_person: 'John Buyer',
      role: 'buyer',
      location: 'New York'
    }).returning().execute();
    
    const supplierResult = await db.insert(usersTable).values({
      email: 'supplier@test.com',
      password_hash: 'hash123',
      company_name: 'Supplier Company',
      contact_person: 'Jane Supplier',
      role: 'supplier',
      location: 'California'
    }).returning().execute();

    const buyerId = buyerResult[0].id;
    const supplierId = supplierResult[0].id;

    // Create inquiry
    const inquiryResult = await db.insert(inquiriesTable).values({
      buyer_id: buyerId,
      packaging_type: 'boxes',
      material: 'cardboard',
      quantity: 1000,
      personalization_needed: true,
      description: 'Custom boxes for products',
      budget_min: '10.50',
      budget_max: '20.75'
    }).returning().execute();

    const inquiryId = inquiryResult[0].id;

    // Link inquiry to supplier
    await db.insert(inquirySuppliersTable).values({
      inquiry_id: inquiryId,
      supplier_id: supplierId
    }).execute();

    // Get inquiries for supplier
    const result = await getInquiriesForSupplier(supplierId);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(inquiryId);
    expect(result[0].buyer_id).toBe(buyerId);
    expect(result[0].packaging_type).toBe('boxes');
    expect(result[0].material).toBe('cardboard');
    expect(result[0].quantity).toBe(1000);
    expect(result[0].personalization_needed).toBe(true);
    expect(result[0].description).toBe('Custom boxes for products');
    expect(result[0].budget_min).toBe(10.50);
    expect(result[0].budget_max).toBe(20.75);
    expect(typeof result[0].budget_min).toBe('number');
    expect(typeof result[0].budget_max).toBe('number');
    expect(result[0].status).toBe('pending');
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return multiple inquiries for the same supplier', async () => {
    // Create test users
    const buyerResult = await db.insert(usersTable).values({
      email: 'buyer@test.com',
      password_hash: 'hash123',
      company_name: 'Buyer Company',
      contact_person: 'John Buyer',
      role: 'buyer',
      location: 'New York'
    }).returning().execute();
    
    const supplierResult = await db.insert(usersTable).values({
      email: 'supplier@test.com',
      password_hash: 'hash123',
      company_name: 'Supplier Company',
      contact_person: 'Jane Supplier',
      role: 'supplier',
      location: 'California'
    }).returning().execute();

    const buyerId = buyerResult[0].id;
    const supplierId = supplierResult[0].id;

    // Create multiple inquiries
    const inquiry1Result = await db.insert(inquiriesTable).values({
      buyer_id: buyerId,
      packaging_type: 'boxes',
      material: 'cardboard',
      quantity: 1000,
      personalization_needed: true,
      description: 'First inquiry'
    }).returning().execute();

    const inquiry2Result = await db.insert(inquiriesTable).values({
      buyer_id: buyerId,
      packaging_type: 'bottles',
      material: 'glass',
      quantity: 500,
      personalization_needed: false,
      description: 'Second inquiry'
    }).returning().execute();

    // Link both inquiries to supplier
    await db.insert(inquirySuppliersTable).values([
      {
        inquiry_id: inquiry1Result[0].id,
        supplier_id: supplierId
      },
      {
        inquiry_id: inquiry2Result[0].id,
        supplier_id: supplierId
      }
    ]).execute();

    // Get inquiries for supplier
    const result = await getInquiriesForSupplier(supplierId);

    expect(result).toHaveLength(2);
    
    // Find inquiries by description
    const firstInquiry = result.find(i => i.description === 'First inquiry');
    const secondInquiry = result.find(i => i.description === 'Second inquiry');
    
    expect(firstInquiry).toBeDefined();
    expect(firstInquiry?.packaging_type).toBe('boxes');
    expect(firstInquiry?.material).toBe('cardboard');
    expect(firstInquiry?.quantity).toBe(1000);
    
    expect(secondInquiry).toBeDefined();
    expect(secondInquiry?.packaging_type).toBe('bottles');
    expect(secondInquiry?.material).toBe('glass');
    expect(secondInquiry?.quantity).toBe(500);
  });

  it('should return empty array for supplier with no inquiries', async () => {
    // Create supplier
    const supplierResult = await db.insert(usersTable).values({
      email: 'supplier@test.com',
      password_hash: 'hash123',
      company_name: 'Supplier Company',
      contact_person: 'Jane Supplier',
      role: 'supplier',
      location: 'California'
    }).returning().execute();

    const supplierId = supplierResult[0].id;

    // Get inquiries for supplier (should be empty)
    const result = await getInquiriesForSupplier(supplierId);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should not return inquiries sent to other suppliers', async () => {
    // Create test users
    const buyerResult = await db.insert(usersTable).values({
      email: 'buyer@test.com',
      password_hash: 'hash123',
      company_name: 'Buyer Company',
      contact_person: 'John Buyer',
      role: 'buyer',
      location: 'New York'
    }).returning().execute();
    
    const supplier1Result = await db.insert(usersTable).values({
      email: 'supplier1@test.com',
      password_hash: 'hash123',
      company_name: 'Supplier Company 1',
      contact_person: 'Jane Supplier',
      role: 'supplier',
      location: 'California'
    }).returning().execute();

    const supplier2Result = await db.insert(usersTable).values({
      email: 'supplier2@test.com',
      password_hash: 'hash123',
      company_name: 'Supplier Company 2',
      contact_person: 'Bob Supplier',
      role: 'supplier',
      location: 'Texas'
    }).returning().execute();

    const buyerId = buyerResult[0].id;
    const supplier1Id = supplier1Result[0].id;
    const supplier2Id = supplier2Result[0].id;

    // Create inquiry
    const inquiryResult = await db.insert(inquiriesTable).values({
      buyer_id: buyerId,
      packaging_type: 'boxes',
      material: 'cardboard',
      quantity: 1000,
      personalization_needed: true,
      description: 'Inquiry for supplier 1 only'
    }).returning().execute();

    const inquiryId = inquiryResult[0].id;

    // Link inquiry only to supplier 1
    await db.insert(inquirySuppliersTable).values({
      inquiry_id: inquiryId,
      supplier_id: supplier1Id
    }).execute();

    // Get inquiries for supplier 1 (should return the inquiry)
    const result1 = await getInquiriesForSupplier(supplier1Id);
    expect(result1).toHaveLength(1);
    expect(result1[0].description).toBe('Inquiry for supplier 1 only');

    // Get inquiries for supplier 2 (should return empty)
    const result2 = await getInquiriesForSupplier(supplier2Id);
    expect(result2).toHaveLength(0);
  });

  it('should handle inquiries with null budget values', async () => {
    // Create test users
    const buyerResult = await db.insert(usersTable).values({
      email: 'buyer@test.com',
      password_hash: 'hash123',
      company_name: 'Buyer Company',
      contact_person: 'John Buyer',
      role: 'buyer',
      location: 'New York'
    }).returning().execute();
    
    const supplierResult = await db.insert(usersTable).values({
      email: 'supplier@test.com',
      password_hash: 'hash123',
      company_name: 'Supplier Company',
      contact_person: 'Jane Supplier',
      role: 'supplier',
      location: 'California'
    }).returning().execute();

    const buyerId = buyerResult[0].id;
    const supplierId = supplierResult[0].id;

    // Create inquiry with null budgets
    const inquiryResult = await db.insert(inquiriesTable).values({
      buyer_id: buyerId,
      packaging_type: 'boxes',
      material: 'cardboard',
      quantity: 1000,
      personalization_needed: false,
      description: 'Inquiry without budget',
      budget_min: null,
      budget_max: null
    }).returning().execute();

    const inquiryId = inquiryResult[0].id;

    // Link inquiry to supplier
    await db.insert(inquirySuppliersTable).values({
      inquiry_id: inquiryId,
      supplier_id: supplierId
    }).execute();

    // Get inquiries for supplier
    const result = await getInquiriesForSupplier(supplierId);

    expect(result).toHaveLength(1);
    expect(result[0].budget_min).toBeNull();
    expect(result[0].budget_max).toBeNull();
    expect(result[0].description).toBe('Inquiry without budget');
  });

  it('should handle inquiries with different status values', async () => {
    // Create test users
    const buyerResult = await db.insert(usersTable).values({
      email: 'buyer@test.com',
      password_hash: 'hash123',
      company_name: 'Buyer Company',
      contact_person: 'John Buyer',
      role: 'buyer',
      location: 'New York'
    }).returning().execute();
    
    const supplierResult = await db.insert(usersTable).values({
      email: 'supplier@test.com',
      password_hash: 'hash123',
      company_name: 'Supplier Company',
      contact_person: 'Jane Supplier',
      role: 'supplier',
      location: 'California'
    }).returning().execute();

    const buyerId = buyerResult[0].id;
    const supplierId = supplierResult[0].id;

    // Create inquiries with different statuses
    const pendingInquiryResult = await db.insert(inquiriesTable).values({
      buyer_id: buyerId,
      packaging_type: 'boxes',
      material: 'cardboard',
      quantity: 1000,
      personalization_needed: true,
      description: 'Pending inquiry',
      status: 'pending'
    }).returning().execute();

    const respondedInquiryResult = await db.insert(inquiriesTable).values({
      buyer_id: buyerId,
      packaging_type: 'bottles',
      material: 'glass',
      quantity: 500,
      personalization_needed: false,
      description: 'Responded inquiry',
      status: 'responded'
    }).returning().execute();

    // Link both inquiries to supplier
    await db.insert(inquirySuppliersTable).values([
      {
        inquiry_id: pendingInquiryResult[0].id,
        supplier_id: supplierId
      },
      {
        inquiry_id: respondedInquiryResult[0].id,
        supplier_id: supplierId
      }
    ]).execute();

    // Get inquiries for supplier
    const result = await getInquiriesForSupplier(supplierId);

    expect(result).toHaveLength(2);
    
    const pendingInquiry = result.find(i => i.description === 'Pending inquiry');
    const respondedInquiry = result.find(i => i.description === 'Responded inquiry');
    
    expect(pendingInquiry?.status).toBe('pending');
    expect(respondedInquiry?.status).toBe('responded');
  });
});