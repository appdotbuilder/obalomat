import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, supplierProfilesTable, ratingsTable } from '../db/schema';
import { getUserProfile } from '../handlers/get_user_profile';

describe('getUserProfile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null for non-existent user', async () => {
    const result = await getUserProfile(999);
    expect(result).toBeNull();
  });

  it('should get basic buyer profile', async () => {
    // Create a buyer user
    const [user] = await db.insert(usersTable).values({
      email: 'buyer@test.com',
      password_hash: 'hashed_password',
      company_name: 'Test Buyer Company',
      contact_person: 'John Buyer',
      phone: '+1234567890',
      role: 'buyer',
      location: 'New York',
      description: 'A test buyer',
      website: 'https://buyer.test.com'
    }).returning().execute();

    const result = await getUserProfile(user.id);

    expect(result).toBeDefined();
    expect(result!.id).toBe(user.id);
    expect(result!.email).toBe('buyer@test.com');
    expect(result!.company_name).toBe('Test Buyer Company');
    expect(result!.contact_person).toBe('John Buyer');
    expect(result!.phone).toBe('+1234567890');
    expect(result!.role).toBe('buyer');
    expect(result!.location).toBe('New York');
    expect(result!.description).toBe('A test buyer');
    expect(result!.website).toBe('https://buyer.test.com');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
    expect(result!.supplier_profile).toBeUndefined();
    expect(result!.rating_stats).toBeUndefined();
  });

  it('should get supplier profile with supplier data', async () => {
    // Create a supplier user
    const [user] = await db.insert(usersTable).values({
      email: 'supplier@test.com',
      password_hash: 'hashed_password',
      company_name: 'Test Supplier Company',
      contact_person: 'Jane Supplier',
      phone: '+0987654321',
      role: 'supplier',
      location: 'California',
      description: 'A test supplier',
      website: 'https://supplier.test.com'
    }).returning().execute();

    // Create supplier profile
    await db.insert(supplierProfilesTable).values({
      user_id: user.id,
      packaging_types: ['boxes', 'bottles'],
      materials: ['cardboard', 'plastic'],
      min_order_quantity: 1000,
      personalization_available: true,
      price_range_min: '5.50',
      price_range_max: '15.99',
      delivery_time_days: 14,
      certifications: ['iso9001', 'fsc']
    }).execute();

    const result = await getUserProfile(user.id);

    expect(result).toBeDefined();
    expect(result!.id).toBe(user.id);
    expect(result!.role).toBe('supplier');
    expect(result!.supplier_profile).toBeDefined();
    expect(result!.supplier_profile!.user_id).toBe(user.id);
    expect(result!.supplier_profile!.packaging_types).toEqual(['boxes', 'bottles']);
    expect(result!.supplier_profile!.materials).toEqual(['cardboard', 'plastic']);
    expect(result!.supplier_profile!.min_order_quantity).toBe(1000);
    expect(result!.supplier_profile!.personalization_available).toBe(true);
    expect(result!.supplier_profile!.price_range_min).toBe(5.5);
    expect(result!.supplier_profile!.price_range_max).toBe(15.99);
    expect(result!.supplier_profile!.delivery_time_days).toBe(14);
    expect(result!.supplier_profile!.certifications).toEqual(['iso9001', 'fsc']);
    expect(result!.supplier_profile!.created_at).toBeInstanceOf(Date);
    expect(result!.supplier_profile!.updated_at).toBeInstanceOf(Date);
  });

  it('should handle supplier user without supplier profile', async () => {
    // Create a supplier user without supplier profile
    const [user] = await db.insert(usersTable).values({
      email: 'supplier-incomplete@test.com',
      password_hash: 'hashed_password',
      company_name: 'Incomplete Supplier',
      contact_person: 'Incomplete Supplier',
      role: 'supplier',
      location: 'Texas',
      description: 'Supplier without profile'
    }).returning().execute();

    const result = await getUserProfile(user.id);

    expect(result).toBeDefined();
    expect(result!.role).toBe('supplier');
    expect(result!.supplier_profile).toBeUndefined();
  });

  it('should include rating statistics when user has ratings', async () => {
    // Create supplier user
    const [supplier] = await db.insert(usersTable).values({
      email: 'rated-supplier@test.com',
      password_hash: 'hashed_password',
      company_name: 'Rated Supplier',
      contact_person: 'Rated Person',
      role: 'supplier',
      location: 'Florida'
    }).returning().execute();

    // Create some buyers to rate the supplier
    const [buyer1] = await db.insert(usersTable).values({
      email: 'rater1@test.com',
      password_hash: 'hashed_password',
      company_name: 'Rater 1',
      contact_person: 'Rater One',
      role: 'buyer',
      location: 'Georgia'
    }).returning().execute();

    const [buyer2] = await db.insert(usersTable).values({
      email: 'rater2@test.com',
      password_hash: 'hashed_password',
      company_name: 'Rater 2',
      contact_person: 'Rater Two',
      role: 'buyer',
      location: 'Nevada'
    }).returning().execute();

    // Add ratings: 5, 4, 3 (average = 4.0)
    await db.insert(ratingsTable).values([
      {
        rater_id: buyer1.id,
        rated_id: supplier.id,
        rating: 5,
        comment: 'Excellent service!'
      },
      {
        rater_id: buyer2.id,
        rated_id: supplier.id,
        rating: 4,
        comment: 'Very good!'
      },
      {
        rater_id: buyer1.id,
        rated_id: supplier.id,
        rating: 3,
        comment: 'Good enough'
      }
    ]).execute();

    const result = await getUserProfile(supplier.id);

    expect(result).toBeDefined();
    expect(result!.rating_stats).toBeDefined();
    expect(result!.rating_stats!.average_rating).toBe(4);
    expect(result!.rating_stats!.total_ratings).toBe(3);
  });

  it('should handle user with no ratings gracefully', async () => {
    // Create a user without any ratings
    const [user] = await db.insert(usersTable).values({
      email: 'unrated@test.com',
      password_hash: 'hashed_password',
      company_name: 'Unrated Company',
      contact_person: 'Unrated Person',
      role: 'buyer',
      location: 'Oregon'
    }).returning().execute();

    const result = await getUserProfile(user.id);

    expect(result).toBeDefined();
    expect(result!.rating_stats).toBeUndefined();
  });

  it('should handle numeric conversions correctly', async () => {
    // Create supplier with numeric price ranges
    const [user] = await db.insert(usersTable).values({
      email: 'numeric-supplier@test.com',
      password_hash: 'hashed_password',
      company_name: 'Numeric Supplier',
      contact_person: 'Numeric Person',
      role: 'supplier',
      location: 'Arizona'
    }).returning().execute();

    // Create supplier profile with precise decimal values
    await db.insert(supplierProfilesTable).values({
      user_id: user.id,
      packaging_types: ['bags'],
      materials: ['paper'],
      min_order_quantity: 500,
      personalization_available: false,
      price_range_min: '0.75',
      price_range_max: '12.25',
      delivery_time_days: 7,
      certifications: []
    }).execute();

    const result = await getUserProfile(user.id);

    expect(result).toBeDefined();
    expect(result!.supplier_profile).toBeDefined();
    expect(typeof result!.supplier_profile!.price_range_min).toBe('number');
    expect(typeof result!.supplier_profile!.price_range_max).toBe('number');
    expect(result!.supplier_profile!.price_range_min).toBe(0.75);
    expect(result!.supplier_profile!.price_range_max).toBe(12.25);
  });

  it('should handle null price ranges correctly', async () => {
    // Create supplier with null price ranges
    const [user] = await db.insert(usersTable).values({
      email: 'null-price-supplier@test.com',
      password_hash: 'hashed_password',
      company_name: 'Null Price Supplier',
      contact_person: 'Null Price Person',
      role: 'supplier',
      location: 'Montana'
    }).returning().execute();

    await db.insert(supplierProfilesTable).values({
      user_id: user.id,
      packaging_types: ['containers'],
      materials: ['metal'],
      min_order_quantity: 100,
      personalization_available: true,
      price_range_min: null,
      price_range_max: null,
      delivery_time_days: 21,
      certifications: ['iso14001']
    }).execute();

    const result = await getUserProfile(user.id);

    expect(result).toBeDefined();
    expect(result!.supplier_profile).toBeDefined();
    expect(result!.supplier_profile!.price_range_min).toBeNull();
    expect(result!.supplier_profile!.price_range_max).toBeNull();
  });
});