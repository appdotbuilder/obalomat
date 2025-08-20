import { db } from '../db';
import { messagesTable, usersTable, inquiriesTable } from '../db/schema';
import { type Message } from '../schema';
import { eq, or, desc } from 'drizzle-orm';

export async function getMessagesForUser(userId: number): Promise<Message[]> {
  try {
    // Fetch all messages where user is either sender or recipient
    // Include sender, recipient, and inquiry information via joins
    const results = await db.select({
      id: messagesTable.id,
      sender_id: messagesTable.sender_id,
      recipient_id: messagesTable.recipient_id,
      inquiry_id: messagesTable.inquiry_id,
      subject: messagesTable.subject,
      content: messagesTable.content,
      sent_at: messagesTable.sent_at,
      read_at: messagesTable.read_at
    })
    .from(messagesTable)
    .where(
      or(
        eq(messagesTable.sender_id, userId),
        eq(messagesTable.recipient_id, userId)
      )
    )
    .orderBy(desc(messagesTable.sent_at))
    .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch messages for user:', error);
    throw error;
  }
}