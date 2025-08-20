import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const updateUserProfile = async (input: UpdateUserInput): Promise<User> => {
  try {
    // First, check if user exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.id))
      .execute();

    if (existingUser.length === 0) {
      throw new Error(`User with id ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: Partial<typeof usersTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.company_name !== undefined) {
      updateData.company_name = input.company_name;
    }
    if (input.contact_person !== undefined) {
      updateData.contact_person = input.contact_person;
    }
    if (input.phone !== undefined) {
      updateData.phone = input.phone;
    }
    if (input.location !== undefined) {
      updateData.location = input.location;
    }
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    if (input.website !== undefined) {
      updateData.website = input.website;
    }

    // Update the user record
    const result = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User profile update failed:', error);
    throw error;
  }
};