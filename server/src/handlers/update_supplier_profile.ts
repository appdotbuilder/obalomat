import { db } from '../db';
import { supplierProfilesTable } from '../db/schema';
import { type UpdateSupplierProfileInput, type SupplierProfile } from '../schema';
import { eq } from 'drizzle-orm';

export const updateSupplierProfile = async (input: UpdateSupplierProfileInput): Promise<SupplierProfile> => {
  try {
    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.packaging_types !== undefined) {
      updateData.packaging_types = input.packaging_types;
    }

    if (input.materials !== undefined) {
      updateData.materials = input.materials;
    }

    if (input.min_order_quantity !== undefined) {
      updateData.min_order_quantity = input.min_order_quantity;
    }

    if (input.personalization_available !== undefined) {
      updateData.personalization_available = input.personalization_available;
    }

    if (input.price_range_min !== undefined) {
      updateData.price_range_min = input.price_range_min?.toString() || null;
    }

    if (input.price_range_max !== undefined) {
      updateData.price_range_max = input.price_range_max?.toString() || null;
    }

    if (input.delivery_time_days !== undefined) {
      updateData.delivery_time_days = input.delivery_time_days;
    }

    if (input.certifications !== undefined) {
      updateData.certifications = input.certifications;
    }

    // Update the supplier profile
    const result = await db.update(supplierProfilesTable)
      .set(updateData)
      .where(eq(supplierProfilesTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Supplier profile with id ${input.id} not found`);
    }

    // Convert numeric fields back to proper types
    const profile = result[0];
    return {
      ...profile,
      price_range_min: profile.price_range_min ? parseFloat(profile.price_range_min) : null,
      price_range_max: profile.price_range_max ? parseFloat(profile.price_range_max) : null,
      packaging_types: profile.packaging_types as any,
      materials: profile.materials as any,
      certifications: profile.certifications as any
    };
  } catch (error) {
    console.error('Supplier profile update failed:', error);
    throw error;
  }
};