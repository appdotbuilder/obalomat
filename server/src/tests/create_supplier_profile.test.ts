import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, supplierProfilesTable } from '../db/schema';
import { type CreateSupplierProfileInput, type CreateUserInput, type PackagingType, type MaterialType, type CertificationType } from '../schema';
import { createSupplierProfile } from '../handlers/create_supplier_profile';
import { eq } from 'drizzle-orm';

// Test supplier user
const testSupplierUser: CreateUserInput = {
  email: 'supplier@example.com',
  password_hash: 'hashed_password',
  company_name: 'Test Packaging Co',
  contact_person: 'John Supplier',
  phone: '+1234567890',
  role: 'supplier',
  location: 'New York, NY',
  description: 'Quality packaging solutions',
  website: 'https://testpackaging.com'
};

// Test buyer user (for negative testing)
const testBuyerUser: CreateUserInput = {
  email: 'buyer@example.com',
  password_hash: 'hashed_password',
  company_name: 'Test Buyer Co',
  contact_person: 'Jane Buyer',
  phone: '+1234567891',
  role: 'buyer',
  location: 'Los Angeles, CA',
  description: 'Packaging procurement',
  website: 'https://testbuyer.com'
};

// Test supplier profile input
const testSupplierProfileInput: CreateSupplierProfileInput = {
  user_id: 1, // Will be set dynamically in tests
  packaging_types: ['boxes', 'bags', 'containers'] as PackagingType[],
  materials: ['cardboard', 'plastic', 'biodegradable'] as MaterialType[],
  min_order_quantity: 1000,
  personalization_available: true,
  price_range_min: 0.50,
  price_range_max: 5.00,
  delivery_time_days: 14,
  certifications: ['fsc', 'iso14001', 'cradle_to_cradle'] as CertificationType[]
};

describe('createSupplierProfile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a supplier profile', async () => {
    // First create a supplier user
    const userResult = await db.insert(usersTable)
      .values(testSupplierUser)
      .returning()
      .execute();

    const supplierInput = {
      ...testSupplierProfileInput,
      user_id: userResult[0].id
    };

    const result = await createSupplierProfile(supplierInput);

    // Basic field validation
    expect(result.user_id).toEqual(userResult[0].id);
    expect(result.packaging_types).toEqual(['boxes', 'bags', 'containers']);
    expect(result.materials).toEqual(['cardboard', 'plastic', 'biodegradable']);
    expect(result.min_order_quantity).toEqual(1000);
    expect(result.personalization_available).toEqual(true);
    expect(result.price_range_min).toEqual(0.50);
    expect(result.price_range_max).toEqual(5.00);
    expect(result.delivery_time_days).toEqual(14);
    expect(result.certifications).toEqual(['fsc', 'iso14001', 'cradle_to_cradle']);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save supplier profile to database', async () => {
    // First create a supplier user
    const userResult = await db.insert(usersTable)
      .values(testSupplierUser)
      .returning()
      .execute();

    const supplierInput = {
      ...testSupplierProfileInput,
      user_id: userResult[0].id
    };

    const result = await createSupplierProfile(supplierInput);

    // Query database to verify data was saved correctly
    const profiles = await db.select()
      .from(supplierProfilesTable)
      .where(eq(supplierProfilesTable.id, result.id))
      .execute();

    expect(profiles).toHaveLength(1);
    const profile = profiles[0];
    
    expect(profile.user_id).toEqual(userResult[0].id);
    expect(profile.packaging_types).toEqual(['boxes', 'bags', 'containers']);
    expect(profile.materials).toEqual(['cardboard', 'plastic', 'biodegradable']);
    expect(profile.min_order_quantity).toEqual(1000);
    expect(profile.personalization_available).toEqual(true);
    expect(parseFloat(profile.price_range_min as string)).toEqual(0.50);
    expect(parseFloat(profile.price_range_max as string)).toEqual(5.00);
    expect(profile.delivery_time_days).toEqual(14);
    expect(profile.certifications).toEqual(['fsc', 'iso14001', 'cradle_to_cradle']);
    expect(profile.created_at).toBeInstanceOf(Date);
    expect(profile.updated_at).toBeInstanceOf(Date);
  });

  it('should handle null price ranges', async () => {
    // First create a supplier user
    const userResult = await db.insert(usersTable)
      .values(testSupplierUser)
      .returning()
      .execute();

    const supplierInputWithNullPrices = {
      ...testSupplierProfileInput,
      user_id: userResult[0].id,
      price_range_min: null,
      price_range_max: null
    };

    const result = await createSupplierProfile(supplierInputWithNullPrices);

    // Verify null values are handled correctly
    expect(result.price_range_min).toBeNull();
    expect(result.price_range_max).toBeNull();
    expect(typeof result.user_id).toBe('number');
    expect(Array.isArray(result.packaging_types)).toBe(true);
    expect(Array.isArray(result.materials)).toBe(true);
    expect(Array.isArray(result.certifications)).toBe(true);
  });

  it('should verify numeric type conversions', async () => {
    // First create a supplier user
    const userResult = await db.insert(usersTable)
      .values(testSupplierUser)
      .returning()
      .execute();

    const supplierInput = {
      ...testSupplierProfileInput,
      user_id: userResult[0].id
    };

    const result = await createSupplierProfile(supplierInput);

    // Verify all numeric fields are proper numbers
    expect(typeof result.price_range_min).toBe('number');
    expect(typeof result.price_range_max).toBe('number');
    expect(typeof result.min_order_quantity).toBe('number');
    expect(typeof result.delivery_time_days).toBe('number');
    expect(typeof result.user_id).toBe('number');
    expect(typeof result.id).toBe('number');
  });

  it('should throw error for non-existent user', async () => {
    const supplierInput = {
      ...testSupplierProfileInput,
      user_id: 99999 // Non-existent user ID
    };

    await expect(createSupplierProfile(supplierInput))
      .rejects.toThrow(/User with ID 99999 not found/i);
  });

  it('should throw error for buyer user (not supplier)', async () => {
    // Create a buyer user
    const userResult = await db.insert(usersTable)
      .values(testBuyerUser)
      .returning()
      .execute();

    const supplierInput = {
      ...testSupplierProfileInput,
      user_id: userResult[0].id
    };

    await expect(createSupplierProfile(supplierInput))
      .rejects.toThrow(/is not a supplier/i);
  });

  it('should throw error for duplicate supplier profile', async () => {
    // First create a supplier user
    const userResult = await db.insert(usersTable)
      .values(testSupplierUser)
      .returning()
      .execute();

    const supplierInput = {
      ...testSupplierProfileInput,
      user_id: userResult[0].id
    };

    // Create first profile
    await createSupplierProfile(supplierInput);

    // Attempt to create duplicate profile
    await expect(createSupplierProfile(supplierInput))
      .rejects.toThrow(/already exists/i);
  });

  it('should handle empty arrays for packaging types and materials', async () => {
    // First create a supplier user
    const userResult = await db.insert(usersTable)
      .values(testSupplierUser)
      .returning()
      .execute();

    const supplierInput = {
      ...testSupplierProfileInput,
      user_id: userResult[0].id,
      packaging_types: [] as PackagingType[],
      materials: [] as MaterialType[],
      certifications: [] as CertificationType[]
    };

    const result = await createSupplierProfile(supplierInput);

    expect(result.packaging_types).toEqual([]);
    expect(result.materials).toEqual([]);
    expect(result.certifications).toEqual([]);
    expect(Array.isArray(result.packaging_types)).toBe(true);
    expect(Array.isArray(result.materials)).toBe(true);
    expect(Array.isArray(result.certifications)).toBe(true);
  });

  it('should handle single-item arrays', async () => {
    // First create a supplier user
    const userResult = await db.insert(usersTable)
      .values(testSupplierUser)
      .returning()
      .execute();

    const supplierInput = {
      ...testSupplierProfileInput,
      user_id: userResult[0].id,
      packaging_types: ['boxes'] as PackagingType[],
      materials: ['cardboard'] as MaterialType[],
      certifications: ['fsc'] as CertificationType[]
    };

    const result = await createSupplierProfile(supplierInput);

    expect(result.packaging_types).toEqual(['boxes']);
    expect(result.materials).toEqual(['cardboard']);
    expect(result.certifications).toEqual(['fsc']);
  });
});