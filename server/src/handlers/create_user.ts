import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        password_hash: input.password_hash,
        company_name: input.company_name,
        contact_person: input.contact_person,
        phone: input.phone,
        role: input.role,
        location: input.location,
        description: input.description,
        website: input.website
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};