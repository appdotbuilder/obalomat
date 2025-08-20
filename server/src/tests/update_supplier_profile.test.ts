import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, supplierProfilesTable } from '../db/schema';
import { type UpdateSupplierProfileInput } from '../schema';
import { updateSupplierProfile } from '../handlers/update_supplier_profile';
import { eq } from 'drizzle-orm';

describe('updateSupplierProfile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let profileId: number;

  beforeEach(async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'supplier@test.com',
        password_hash: 'hash123',
        company_name: 'Test Supplier Co',
        contact_person: 'John Doe',
        phone: '+1234567890',
        role: 'supplier',
        location: 'New York, NY',
        description: 'Test supplier',
        website: 'https://testsupplier.com'
      })
      .returning()
      .execute();

    userId = userResult[0].id;

    // Create a supplier profile
    const profileResult = await db.insert(supplierProfilesTable)
      .values({
        user_id: userId,
        packaging_types: ['boxes', 'bags'],
        materials: ['cardboard', 'plastic'],
        min_order_quantity: 100,
        personalization_available: true,
        price_range_min: '10.00',
        price_range_max: '50.00',
        delivery_time_days: 7,
        certifications: ['fsc', 'iso9001']
      })
      .returning()
      .execute();

    profileId = profileResult[0].id;
  });

  it('should update supplier profile with all fields', async () => {
    const input: UpdateSupplierProfileInput = {
      id: profileId,
      packaging_types: ['bottles', 'containers'],
      materials: ['glass', 'metal'],
      min_order_quantity: 200,
      personalization_available: false,
      price_range_min: 15.00,
      price_range_max: 75.00,
      delivery_time_days: 10,
      certifications: ['fda', 'eu_organic']
    };

    const result = await updateSupplierProfile(input);

    // Verify returned data
    expect(result.id).toEqual(profileId);
    expect(result.user_id).toEqual(userId);
    expect(result.packaging_types).toEqual(['bottles', 'containers']);
    expect(result.materials).toEqual(['glass', 'metal']);
    expect(result.min_order_quantity).toEqual(200);
    expect(result.personalization_available).toEqual(false);
    expect(result.price_range_min).toEqual(15.00);
    expect(result.price_range_max).toEqual(75.00);
    expect(result.delivery_time_days).toEqual(10);
    expect(result.certifications).toEqual(['fda', 'eu_organic']);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify types
    expect(typeof result.price_range_min).toBe('number');
    expect(typeof result.price_range_max).toBe('number');
    expect(Array.isArray(result.packaging_types)).toBe(true);
    expect(Array.isArray(result.materials)).toBe(true);
    expect(Array.isArray(result.certifications)).toBe(true);
  });

  it('should update only provided fields', async () => {
    const input: UpdateSupplierProfileInput = {
      id: profileId,
      min_order_quantity: 300,
      delivery_time_days: 14
    };

    const result = await updateSupplierProfile(input);

    // Updated fields
    expect(result.min_order_quantity).toEqual(300);
    expect(result.delivery_time_days).toEqual(14);

    // Unchanged fields should remain the same
    expect(result.packaging_types).toEqual(['boxes', 'bags']);
    expect(result.materials).toEqual(['cardboard', 'plastic']);
    expect(result.personalization_available).toEqual(true);
    expect(result.price_range_min).toEqual(10.00);
    expect(result.price_range_max).toEqual(50.00);
    expect(result.certifications).toEqual(['fsc', 'iso9001']);
  });

  it('should handle null price ranges', async () => {
    const input: UpdateSupplierProfileInput = {
      id: profileId,
      price_range_min: null,
      price_range_max: null
    };

    const result = await updateSupplierProfile(input);

    expect(result.price_range_min).toBeNull();
    expect(result.price_range_max).toBeNull();
  });

  it('should update empty arrays', async () => {
    const input: UpdateSupplierProfileInput = {
      id: profileId,
      packaging_types: [],
      materials: [],
      certifications: []
    };

    const result = await updateSupplierProfile(input);

    expect(result.packaging_types).toEqual([]);
    expect(result.materials).toEqual([]);
    expect(result.certifications).toEqual([]);
  });

  it('should save changes to database', async () => {
    const input: UpdateSupplierProfileInput = {
      id: profileId,
      packaging_types: ['tubes', 'cans'],
      min_order_quantity: 500,
      personalization_available: false
    };

    await updateSupplierProfile(input);

    // Query database to verify changes
    const profiles = await db.select()
      .from(supplierProfilesTable)
      .where(eq(supplierProfilesTable.id, profileId))
      .execute();

    expect(profiles).toHaveLength(1);
    const savedProfile = profiles[0];
    
    expect(savedProfile.packaging_types).toEqual(['tubes', 'cans']);
    expect(savedProfile.min_order_quantity).toEqual(500);
    expect(savedProfile.personalization_available).toEqual(false);
    expect(savedProfile.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent profile', async () => {
    const input: UpdateSupplierProfileInput = {
      id: 99999,
      min_order_quantity: 100
    };

    await expect(updateSupplierProfile(input)).rejects.toThrow(/not found/i);
  });

  it('should update timestamp on each update', async () => {
    const firstUpdate: UpdateSupplierProfileInput = {
      id: profileId,
      min_order_quantity: 150
    };

    const firstResult = await updateSupplierProfile(firstUpdate);
    const firstTimestamp = firstResult.updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const secondUpdate: UpdateSupplierProfileInput = {
      id: profileId,
      delivery_time_days: 21
    };

    const secondResult = await updateSupplierProfile(secondUpdate);
    const secondTimestamp = secondResult.updated_at;

    expect(secondTimestamp.getTime()).toBeGreaterThan(firstTimestamp.getTime());
  });

  it('should handle single field updates correctly', async () => {
    const testCases = [
      { 
        field: 'personalization_available', 
        value: false, 
        input: { id: profileId, personalization_available: false } 
      },
      { 
        field: 'min_order_quantity', 
        value: 250, 
        input: { id: profileId, min_order_quantity: 250 } 
      },
      { 
        field: 'delivery_time_days', 
        value: 30, 
        input: { id: profileId, delivery_time_days: 30 } 
      }
    ];

    for (const testCase of testCases) {
      const result = await updateSupplierProfile(testCase.input as UpdateSupplierProfileInput);
      expect((result as any)[testCase.field]).toEqual(testCase.value);
    }
  });
});