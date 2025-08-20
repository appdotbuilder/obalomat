import { db } from '../db';
import { messagesTable, usersTable, inquiriesTable } from '../db/schema';
import { type CreateMessageInput, type Message } from '../schema';
import { eq } from 'drizzle-orm';

export const createMessage = async (input: CreateMessageInput): Promise<Message> => {
  try {
    // Validate that sender exists
    const sender = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.sender_id))
      .execute();
    
    if (sender.length === 0) {
      throw new Error(`Sender with id ${input.sender_id} does not exist`);
    }

    // Validate that recipient exists
    const recipient = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.recipient_id))
      .execute();
    
    if (recipient.length === 0) {
      throw new Error(`Recipient with id ${input.recipient_id} does not exist`);
    }

    // If inquiry_id is provided, validate that it exists
    if (input.inquiry_id !== null) {
      const inquiry = await db.select()
        .from(inquiriesTable)
        .where(eq(inquiriesTable.id, input.inquiry_id))
        .execute();
      
      if (inquiry.length === 0) {
        throw new Error(`Inquiry with id ${input.inquiry_id} does not exist`);
      }
    }

    // Insert message record
    const result = await db.insert(messagesTable)
      .values({
        sender_id: input.sender_id,
        recipient_id: input.recipient_id,
        inquiry_id: input.inquiry_id,
        subject: input.subject,
        content: input.content
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Message creation failed:', error);
    throw error;
  }
};