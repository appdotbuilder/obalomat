import { db } from '../db';
import { quotesTable, usersTable } from '../db/schema';
import { type Quote } from '../schema';
import { eq } from 'drizzle-orm';

export interface QuoteWithSupplier extends Quote {
  supplier: {
    id: number;
    company_name: string;
    contact_person: string;
    phone: string | null;
    location: string;
    website: string | null;
  };
}

export const getQuotesForInquiry = async (inquiryId: number): Promise<QuoteWithSupplier[]> => {
  try {
    // Join quotes with supplier information
    const results = await db.select({
      // Quote fields
      id: quotesTable.id,
      inquiry_id: quotesTable.inquiry_id,
      supplier_id: quotesTable.supplier_id,
      price_per_unit: quotesTable.price_per_unit,
      total_price: quotesTable.total_price,
      delivery_time_days: quotesTable.delivery_time_days,
      notes: quotesTable.notes,
      created_at: quotesTable.created_at,
      // Supplier fields
      supplier_company_name: usersTable.company_name,
      supplier_contact_person: usersTable.contact_person,
      supplier_phone: usersTable.phone,
      supplier_location: usersTable.location,
      supplier_website: usersTable.website
    })
      .from(quotesTable)
      .innerJoin(usersTable, eq(quotesTable.supplier_id, usersTable.id))
      .where(eq(quotesTable.inquiry_id, inquiryId))
      .execute();

    // Transform results to include supplier information and convert numeric fields
    return results.map(result => ({
      id: result.id,
      inquiry_id: result.inquiry_id,
      supplier_id: result.supplier_id,
      price_per_unit: parseFloat(result.price_per_unit),
      total_price: parseFloat(result.total_price),
      delivery_time_days: result.delivery_time_days,
      notes: result.notes,
      created_at: result.created_at,
      supplier: {
        id: result.supplier_id,
        company_name: result.supplier_company_name,
        contact_person: result.supplier_contact_person,
        phone: result.supplier_phone,
        location: result.supplier_location,
        website: result.supplier_website
      }
    }));
  } catch (error) {
    console.error('Failed to fetch quotes for inquiry:', error);
    throw error;
  }
};