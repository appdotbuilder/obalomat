import { db } from '../db';
import { ratingsTable, usersTable, inquiriesTable } from '../db/schema';
import { type Rating } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getRatingsForUser = async (userId: number): Promise<Rating[]> => {
  try {
    // Query ratings received by the user with rater and inquiry information
    const results = await db.select({
      // Rating fields
      id: ratingsTable.id,
      rater_id: ratingsTable.rater_id,
      rated_id: ratingsTable.rated_id,
      inquiry_id: ratingsTable.inquiry_id,
      rating: ratingsTable.rating,
      comment: ratingsTable.comment,
      created_at: ratingsTable.created_at
    })
    .from(ratingsTable)
    .leftJoin(usersTable, eq(ratingsTable.rater_id, usersTable.id))
    .leftJoin(inquiriesTable, eq(ratingsTable.inquiry_id, inquiriesTable.id))
    .where(eq(ratingsTable.rated_id, userId))
    .orderBy(desc(ratingsTable.created_at))
    .execute();

    // Convert the results to Rating objects
    return results.map(result => ({
      id: result.id,
      rater_id: result.rater_id,
      rated_id: result.rated_id,
      inquiry_id: result.inquiry_id,
      rating: result.rating,
      comment: result.comment,
      created_at: result.created_at
    }));
  } catch (error) {
    console.error('Failed to get ratings for user:', error);
    throw error;
  }
};