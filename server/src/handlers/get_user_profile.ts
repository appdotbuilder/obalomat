import { db } from '../db';
import { usersTable, supplierProfilesTable, ratingsTable } from '../db/schema';
import { type User, type SupplierProfile, type PackagingType, type MaterialType, type CertificationType } from '../schema';
import { eq, avg, count } from 'drizzle-orm';

export interface UserWithProfile extends User {
  supplier_profile?: SupplierProfile;
  rating_stats?: {
    average_rating: number;
    total_ratings: number;
  };
}

export async function getUserProfile(userId: number): Promise<UserWithProfile | null> {
  try {
    // Get user data
    const userResult = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1)
      .execute();

    if (userResult.length === 0) {
      return null;
    }

    const user = userResult[0];

    // Initialize the response object
    const userProfile: UserWithProfile = {
      ...user,
      created_at: new Date(user.created_at),
      updated_at: new Date(user.updated_at)
    };

    // If user is a supplier, get their supplier profile
    if (user.role === 'supplier') {
      const supplierProfileResult = await db.select()
        .from(supplierProfilesTable)
        .where(eq(supplierProfilesTable.user_id, userId))
        .limit(1)
        .execute();

      if (supplierProfileResult.length > 0) {
        const profile = supplierProfileResult[0];
        userProfile.supplier_profile = {
          ...profile,
          packaging_types: profile.packaging_types as PackagingType[],
          materials: profile.materials as MaterialType[],
          certifications: profile.certifications as CertificationType[],
          price_range_min: profile.price_range_min ? parseFloat(profile.price_range_min) : null,
          price_range_max: profile.price_range_max ? parseFloat(profile.price_range_max) : null,
          created_at: new Date(profile.created_at),
          updated_at: new Date(profile.updated_at)
        };
      }
    }

    // Get rating statistics for this user
    const ratingStatsResult = await db.select({
      average_rating: avg(ratingsTable.rating),
      total_ratings: count(ratingsTable.id)
    })
    .from(ratingsTable)
    .where(eq(ratingsTable.rated_id, userId))
    .execute();

    if (ratingStatsResult.length > 0 && ratingStatsResult[0].total_ratings > 0) {
      const stats = ratingStatsResult[0];
      userProfile.rating_stats = {
        average_rating: stats.average_rating ? parseFloat(stats.average_rating) : 0,
        total_ratings: stats.total_ratings || 0
      };
    }

    return userProfile;
  } catch (error) {
    console.error('User profile fetch failed:', error);
    throw error;
  }
}