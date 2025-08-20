import { db } from '../db';
import { inquiriesTable, inquirySuppliersTable, usersTable } from '../db/schema';
import { type CreateInquiryInput, type Inquiry } from '../schema';
import { eq, and, inArray } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export const createInquiry = async (input: CreateInquiryInput): Promise<Inquiry> => {
  try {
    // Validate that buyer exists and has buyer role
    const buyer = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.buyer_id))
      .execute();

    if (buyer.length === 0) {
      throw new Error('Buyer not found');
    }

    if (buyer[0].role !== 'buyer') {
      throw new Error('User is not a buyer');
    }

    // Validate that all supplier_ids exist and have supplier role
    if (input.supplier_ids && input.supplier_ids.length > 0) {
      const suppliers = await db.select()
        .from(usersTable)
        .where(inArray(usersTable.id, input.supplier_ids))
        .execute();

      if (suppliers.length !== input.supplier_ids.length) {
        throw new Error('One or more suppliers not found');
      }

      const nonSuppliers = suppliers.filter(s => s.role !== 'supplier');
      if (nonSuppliers.length > 0) {
        throw new Error('One or more users are not suppliers');
      }
    }

    // Create the inquiry record
    const inquiryResult = await db.insert(inquiriesTable)
      .values({
        buyer_id: input.buyer_id,
        packaging_type: input.packaging_type,
        material: input.material,
        quantity: input.quantity,
        personalization_needed: input.personalization_needed,
        description: input.description,
        budget_min: input.budget_min?.toString(),
        budget_max: input.budget_max?.toString(),
        delivery_deadline: input.delivery_deadline,
        status: 'pending'
      })
      .returning()
      .execute();

    const inquiry = inquiryResult[0];

    // Create inquiry_supplier records for bulk distribution
    if (input.supplier_ids && input.supplier_ids.length > 0) {
      const inquirySupplierRecords = input.supplier_ids.map(supplierId => ({
        inquiry_id: inquiry.id,
        supplier_id: supplierId
      }));

      await db.insert(inquirySuppliersTable)
        .values(inquirySupplierRecords)
        .execute();
    }

    // Convert numeric fields back to numbers before returning
    return {
      ...inquiry,
      budget_min: inquiry.budget_min ? parseFloat(inquiry.budget_min) : null,
      budget_max: inquiry.budget_max ? parseFloat(inquiry.budget_max) : null
    };
  } catch (error) {
    console.error('Inquiry creation failed:', error);
    throw error;
  }
};