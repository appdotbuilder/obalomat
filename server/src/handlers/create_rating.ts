import { db } from '../db';
import { ratingsTable, usersTable, inquiriesTable } from '../db/schema';
import { type CreateRatingInput, type Rating } from '../schema';
import { eq, and } from 'drizzle-orm';

export const createRating = async (input: CreateRatingInput): Promise<Rating> => {
  try {
    // Validate that both rater and rated users exist and have different roles
    const users = await db.select({
      id: usersTable.id,
      role: usersTable.role
    })
    .from(usersTable)
    .where(eq(usersTable.id, input.rater_id))
    .union(
      db.select({
        id: usersTable.id,
        role: usersTable.role
      })
      .from(usersTable)
      .where(eq(usersTable.id, input.rated_id))
    )
    .execute();

    if (users.length !== 2) {
      throw new Error('One or both users do not exist');
    }

    const rater = users.find(user => user.id === input.rater_id);
    const rated = users.find(user => user.id === input.rated_id);

    if (!rater || !rated) {
      throw new Error('User validation failed');
    }

    // Validate that users have different roles (buyer <-> supplier)
    if (rater.role === rated.role) {
      throw new Error('Rater and rated users must have different roles (buyer <-> supplier)');
    }

    // If inquiry_id is provided, validate it exists and check for duplicate ratings
    if (input.inquiry_id !== null) {
      // Validate inquiry exists
      const inquiry = await db.select()
        .from(inquiriesTable)
        .where(eq(inquiriesTable.id, input.inquiry_id))
        .execute();

      if (inquiry.length === 0) {
        throw new Error('Inquiry does not exist');
      }

      // Check for duplicate ratings for the same inquiry between same users
      const existingRating = await db.select()
        .from(ratingsTable)
        .where(and(
          eq(ratingsTable.rater_id, input.rater_id),
          eq(ratingsTable.rated_id, input.rated_id),
          eq(ratingsTable.inquiry_id, input.inquiry_id)
        ))
        .execute();

      if (existingRating.length > 0) {
        throw new Error('Rating already exists for this inquiry between these users');
      }
    }

    // Insert the rating
    const result = await db.insert(ratingsTable)
      .values({
        rater_id: input.rater_id,
        rated_id: input.rated_id,
        inquiry_id: input.inquiry_id,
        rating: input.rating,
        comment: input.comment
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Rating creation failed:', error);
    throw error;
  }
};