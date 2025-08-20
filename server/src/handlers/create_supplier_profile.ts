import { db } from '../db';
import { supplierProfilesTable, usersTable } from '../db/schema';
import { type CreateSupplierProfileInput, type SupplierProfile, type PackagingType, type MaterialType, type CertificationType } from '../schema';
import { eq } from 'drizzle-orm';

export const createSupplierProfile = async (input: CreateSupplierProfileInput): Promise<SupplierProfile> => {
  try {
    // First, verify that the user exists and has supplier role
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with ID ${input.user_id} not found`);
    }

    if (user[0].role !== 'supplier') {
      throw new Error(`User with ID ${input.user_id} is not a supplier`);
    }

    // Check if supplier profile already exists for this user
    const existingProfile = await db.select()
      .from(supplierProfilesTable)
      .where(eq(supplierProfilesTable.user_id, input.user_id))
      .execute();

    if (existingProfile.length > 0) {
      throw new Error(`Supplier profile already exists for user ID ${input.user_id}`);
    }

    // Insert supplier profile record
    const result = await db.insert(supplierProfilesTable)
      .values({
        user_id: input.user_id,
        packaging_types: input.packaging_types,
        materials: input.materials,
        min_order_quantity: input.min_order_quantity,
        personalization_available: input.personalization_available,
        price_range_min: input.price_range_min?.toString(),
        price_range_max: input.price_range_max?.toString(),
        delivery_time_days: input.delivery_time_days,
        certifications: input.certifications
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers and cast JSONB arrays to proper types
    const profile = result[0];
    return {
      ...profile,
      packaging_types: profile.packaging_types as PackagingType[],
      materials: profile.materials as MaterialType[],
      price_range_min: profile.price_range_min ? parseFloat(profile.price_range_min) : null,
      price_range_max: profile.price_range_max ? parseFloat(profile.price_range_max) : null,
      certifications: profile.certifications as CertificationType[]
    };
  } catch (error) {
    console.error('Supplier profile creation failed:', error);
    throw error;
  }
};