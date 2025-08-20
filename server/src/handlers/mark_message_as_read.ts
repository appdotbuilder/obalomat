import { db } from '../db';
import { messagesTable } from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { type Message } from '../schema';

export async function markMessageAsRead(messageId: number, userId: number): Promise<Message> {
  try {
    // First verify the message exists and the user is the recipient
    const existingMessages = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.id, messageId))
      .execute();

    if (existingMessages.length === 0) {
      throw new Error('Message not found');
    }

    const message = existingMessages[0];

    // Verify the user is the recipient of the message
    if (message.recipient_id !== userId) {
      throw new Error('User is not authorized to mark this message as read');
    }

    // Only update if the message hasn't been read yet (read_at is null)
    if (message.read_at !== null) {
      // Message already read, return current state
      return {
        ...message,
        sent_at: message.sent_at!,
        read_at: message.read_at!
      };
    }

    // Update the message to mark it as read
    const result = await db.update(messagesTable)
      .set({ read_at: new Date() })
      .where(and(
        eq(messagesTable.id, messageId),
        eq(messagesTable.recipient_id, userId),
        isNull(messagesTable.read_at)
      ))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Failed to mark message as read');
    }

    const updatedMessage = result[0];
    return {
      ...updatedMessage,
      sent_at: updatedMessage.sent_at!,
      read_at: updatedMessage.read_at!
    };
  } catch (error) {
    console.error('Failed to mark message as read:', error);
    throw error;
  }
}