import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type CreateUserInput } from '../schema';
import { updateUserProfile } from '../handlers/update_user_profile';
import { eq } from 'drizzle-orm';

// Helper to create a test user
const createTestUser = async (userData: Partial<CreateUserInput> = {}) => {
  const testUser: CreateUserInput = {
    email: 'test@example.com',
    password_hash: 'hashed_password',
    company_name: 'Test Company',
    contact_person: 'John Doe',
    phone: '+1234567890',
    role: 'buyer',
    location: 'New York',
    description: 'Test description',
    website: 'https://example.com',
    ...userData
  };

  const result = await db.insert(usersTable)
    .values(testUser)
    .returning()
    .execute();

  return result[0];
};

describe('updateUserProfile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update user profile with all fields', async () => {
    // Create a test user
    const user = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: user.id,
      company_name: 'Updated Company',
      contact_person: 'Jane Smith',
      phone: '+9876543210',
      location: 'San Francisco',
      description: 'Updated description',
      website: 'https://updated.com'
    };

    const result = await updateUserProfile(updateInput);

    // Verify all updated fields
    expect(result.id).toEqual(user.id);
    expect(result.email).toEqual(user.email); // Should remain unchanged
    expect(result.password_hash).toEqual(user.password_hash); // Should remain unchanged
    expect(result.role).toEqual(user.role); // Should remain unchanged
    expect(result.company_name).toEqual('Updated Company');
    expect(result.contact_person).toEqual('Jane Smith');
    expect(result.phone).toEqual('+9876543210');
    expect(result.location).toEqual('San Francisco');
    expect(result.description).toEqual('Updated description');
    expect(result.website).toEqual('https://updated.com');
    expect(result.created_at).toEqual(user.created_at); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > user.updated_at).toBe(true);
  });

  it('should update only provided fields', async () => {
    const user = await createTestUser({
      company_name: 'Original Company',
      contact_person: 'Original Person',
      location: 'Original Location'
    });

    const updateInput: UpdateUserInput = {
      id: user.id,
      company_name: 'Updated Company Only'
    };

    const result = await updateUserProfile(updateInput);

    // Verify only company_name was updated
    expect(result.company_name).toEqual('Updated Company Only');
    expect(result.contact_person).toEqual('Original Person'); // Should remain unchanged
    expect(result.location).toEqual('Original Location'); // Should remain unchanged
    expect(result.phone).toEqual(user.phone); // Should remain unchanged
    expect(result.description).toEqual(user.description); // Should remain unchanged
    expect(result.website).toEqual(user.website); // Should remain unchanged
    expect(result.updated_at > user.updated_at).toBe(true);
  });

  it('should handle null values correctly', async () => {
    const user = await createTestUser({
      phone: '+1234567890',
      description: 'Original description',
      website: 'https://original.com'
    });

    const updateInput: UpdateUserInput = {
      id: user.id,
      phone: null,
      description: null,
      website: null
    };

    const result = await updateUserProfile(updateInput);

    expect(result.phone).toBeNull();
    expect(result.description).toBeNull();
    expect(result.website).toBeNull();
    expect(result.updated_at > user.updated_at).toBe(true);
  });

  it('should update database record', async () => {
    const user = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: user.id,
      company_name: 'Database Updated Company',
      location: 'Database Updated Location'
    };

    await updateUserProfile(updateInput);

    // Query database directly to verify update
    const updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    expect(updatedUser).toHaveLength(1);
    expect(updatedUser[0].company_name).toEqual('Database Updated Company');
    expect(updatedUser[0].location).toEqual('Database Updated Location');
    expect(updatedUser[0].updated_at).toBeInstanceOf(Date);
    expect(updatedUser[0].updated_at > user.updated_at).toBe(true);
  });

  it('should throw error for non-existent user', async () => {
    const updateInput: UpdateUserInput = {
      id: 99999,
      company_name: 'Non-existent User Company'
    };

    await expect(updateUserProfile(updateInput)).rejects.toThrow(/User with id 99999 not found/);
  });

  it('should handle partial updates with different field combinations', async () => {
    const user = await createTestUser();

    // Test updating contact_person and phone only
    const updateInput1: UpdateUserInput = {
      id: user.id,
      contact_person: 'New Contact Person',
      phone: '+5555555555'
    };

    const result1 = await updateUserProfile(updateInput1);
    expect(result1.contact_person).toEqual('New Contact Person');
    expect(result1.phone).toEqual('+5555555555');
    expect(result1.company_name).toEqual(user.company_name); // Unchanged

    // Test updating description and website only
    const updateInput2: UpdateUserInput = {
      id: user.id,
      description: 'New description',
      website: 'https://newwebsite.com'
    };

    const result2 = await updateUserProfile(updateInput2);
    expect(result2.description).toEqual('New description');
    expect(result2.website).toEqual('https://newwebsite.com');
    expect(result2.contact_person).toEqual('New Contact Person'); // From previous update
    expect(result2.phone).toEqual('+5555555555'); // From previous update
  });

  it('should handle supplier role user update', async () => {
    const supplierUser = await createTestUser({
      role: 'supplier',
      company_name: 'Supplier Company',
      description: 'We supply packaging materials'
    });

    const updateInput: UpdateUserInput = {
      id: supplierUser.id,
      company_name: 'Updated Supplier Company',
      description: 'We supply premium packaging materials'
    };

    const result = await updateUserProfile(updateInput);

    expect(result.role).toEqual('supplier'); // Should remain unchanged
    expect(result.company_name).toEqual('Updated Supplier Company');
    expect(result.description).toEqual('We supply premium packaging materials');
  });
});