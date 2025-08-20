import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input for buyer
const testBuyerInput: CreateUserInput = {
  email: 'buyer@example.com',
  password_hash: 'hashed_password_123',
  company_name: 'Test Buyer Co',
  contact_person: 'John Buyer',
  phone: '+1234567890',
  role: 'buyer',
  location: 'New York, NY',
  description: 'A test buyer company',
  website: 'https://buyer.example.com'
};

// Test input for supplier
const testSupplierInput: CreateUserInput = {
  email: 'supplier@example.com',
  password_hash: 'hashed_password_456',
  company_name: 'Test Supplier Inc',
  contact_person: 'Jane Supplier',
  phone: null,
  role: 'supplier',
  location: 'Los Angeles, CA',
  description: null,
  website: null
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a buyer user with all fields', async () => {
    const result = await createUser(testBuyerInput);

    // Basic field validation
    expect(result.email).toEqual('buyer@example.com');
    expect(result.password_hash).toEqual('hashed_password_123');
    expect(result.company_name).toEqual('Test Buyer Co');
    expect(result.contact_person).toEqual('John Buyer');
    expect(result.phone).toEqual('+1234567890');
    expect(result.role).toEqual('buyer');
    expect(result.location).toEqual('New York, NY');
    expect(result.description).toEqual('A test buyer company');
    expect(result.website).toEqual('https://buyer.example.com');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a supplier user with optional null fields', async () => {
    const result = await createUser(testSupplierInput);

    // Basic field validation
    expect(result.email).toEqual('supplier@example.com');
    expect(result.password_hash).toEqual('hashed_password_456');
    expect(result.company_name).toEqual('Test Supplier Inc');
    expect(result.contact_person).toEqual('Jane Supplier');
    expect(result.phone).toBeNull();
    expect(result.role).toEqual('supplier');
    expect(result.location).toEqual('Los Angeles, CA');
    expect(result.description).toBeNull();
    expect(result.website).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testBuyerInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('buyer@example.com');
    expect(users[0].company_name).toEqual('Test Buyer Co');
    expect(users[0].role).toEqual('buyer');
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create multiple users with different emails', async () => {
    const buyer = await createUser(testBuyerInput);
    const supplier = await createUser(testSupplierInput);

    expect(buyer.id).not.toEqual(supplier.id);
    expect(buyer.email).toEqual('buyer@example.com');
    expect(supplier.email).toEqual('supplier@example.com');
    expect(buyer.role).toEqual('buyer');
    expect(supplier.role).toEqual('supplier');
  });

  it('should throw error for duplicate email', async () => {
    // Create first user
    await createUser(testBuyerInput);

    // Try to create second user with same email
    const duplicateInput = { ...testSupplierInput, email: 'buyer@example.com' };
    
    await expect(createUser(duplicateInput)).rejects.toThrow(/unique/i);
  });

  it('should handle timestamps correctly', async () => {
    const beforeCreation = new Date();
    const result = await createUser(testBuyerInput);
    const afterCreation = new Date();

    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
  });

  it('should verify all users in database after creation', async () => {
    await createUser(testBuyerInput);
    await createUser(testSupplierInput);

    const allUsers = await db.select()
      .from(usersTable)
      .execute();

    expect(allUsers).toHaveLength(2);
    
    const emails = allUsers.map(user => user.email);
    expect(emails).toContain('buyer@example.com');
    expect(emails).toContain('supplier@example.com');
    
    const roles = allUsers.map(user => user.role);
    expect(roles).toContain('buyer');
    expect(roles).toContain('supplier');
  });
});