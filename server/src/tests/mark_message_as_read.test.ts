import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, messagesTable, inquiriesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { markMessageAsRead } from '../handlers/mark_message_as_read';

describe('markMessageAsRead', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let senderId: number;
  let recipientId: number;
  let messageId: number;

  beforeEach(async () => {
    // Create test users
    const senderResult = await db.insert(usersTable)
      .values({
        email: 'sender@example.com',
        password_hash: 'hashed_password',
        company_name: 'Sender Company',
        contact_person: 'John Sender',
        phone: '+1234567890',
        role: 'supplier',
        location: 'New York',
        description: 'Test sender',
        website: 'https://sender.com'
      })
      .returning()
      .execute();

    const recipientResult = await db.insert(usersTable)
      .values({
        email: 'recipient@example.com',
        password_hash: 'hashed_password',
        company_name: 'Recipient Company',
        contact_person: 'Jane Recipient',
        phone: '+0987654321',
        role: 'buyer',
        location: 'Los Angeles',
        description: 'Test recipient',
        website: 'https://recipient.com'
      })
      .returning()
      .execute();

    senderId = senderResult[0].id;
    recipientId = recipientResult[0].id;

    // Create test message
    const messageResult = await db.insert(messagesTable)
      .values({
        sender_id: senderId,
        recipient_id: recipientId,
        inquiry_id: null,
        subject: 'Test Message',
        content: 'This is a test message content'
      })
      .returning()
      .execute();

    messageId = messageResult[0].id;
  });

  it('should mark an unread message as read', async () => {
    const result = await markMessageAsRead(messageId, recipientId);

    expect(result.id).toEqual(messageId);
    expect(result.sender_id).toEqual(senderId);
    expect(result.recipient_id).toEqual(recipientId);
    expect(result.subject).toEqual('Test Message');
    expect(result.content).toEqual('This is a test message content');
    expect(result.inquiry_id).toBeNull();
    expect(result.sent_at).toBeInstanceOf(Date);
    expect(result.read_at).toBeInstanceOf(Date);
    expect(result.read_at!.getTime()).toBeGreaterThan(result.sent_at.getTime());
  });

  it('should update message in database with read_at timestamp', async () => {
    const beforeUpdate = new Date();
    
    await markMessageAsRead(messageId, recipientId);

    // Query database to verify the update
    const messages = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.id, messageId))
      .execute();

    expect(messages).toHaveLength(1);
    const message = messages[0];
    expect(message.read_at).toBeInstanceOf(Date);
    expect(message.read_at!.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
  });

  it('should return current state if message is already read', async () => {
    // First, mark the message as read
    await markMessageAsRead(messageId, recipientId);
    
    // Get the first read_at timestamp
    const firstResult = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.id, messageId))
      .execute();
    const firstReadAt = firstResult[0].read_at;
    expect(firstReadAt).not.toBeNull(); // Ensure it's not null before using

    // Wait a small amount to ensure timestamps would be different
    await new Promise(resolve => setTimeout(resolve, 10));

    // Try to mark as read again
    const result = await markMessageAsRead(messageId, recipientId);

    // Should return the same read_at timestamp (not update it)
    expect(result.read_at).not.toBeNull();
    expect(result.read_at!).toEqual(firstReadAt!);

    // Verify in database that read_at wasn't changed
    const messages = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.id, messageId))
      .execute();

    expect(messages[0].read_at).toEqual(firstReadAt!);
  });

  it('should throw error if message does not exist', async () => {
    const nonExistentMessageId = 99999;

    await expect(markMessageAsRead(nonExistentMessageId, recipientId))
      .rejects.toThrow(/message not found/i);
  });

  it('should throw error if user is not the recipient', async () => {
    // Try to mark message as read with sender's ID instead of recipient's ID
    await expect(markMessageAsRead(messageId, senderId))
      .rejects.toThrow(/not authorized/i);
  });

  it('should throw error if user ID does not exist', async () => {
    const nonExistentUserId = 99999;

    await expect(markMessageAsRead(messageId, nonExistentUserId))
      .rejects.toThrow(/not authorized/i);
  });

  it('should handle concurrent read attempts correctly', async () => {
    // Attempt to mark the same message as read simultaneously
    const promises = [
      markMessageAsRead(messageId, recipientId),
      markMessageAsRead(messageId, recipientId)
    ];

    const results = await Promise.all(promises);

    // Both should succeed and return the same read_at timestamp
    expect(results[0].read_at!).toEqual(results[1].read_at!);

    // Verify only one update occurred in database
    const messages = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.id, messageId))
      .execute();

    expect(messages).toHaveLength(1);
    expect(messages[0].read_at).toBeInstanceOf(Date);
  });

  it('should work with message that has inquiry_id', async () => {
    // First create an inquiry to satisfy foreign key constraint
    const inquiryResult = await db.insert(inquiriesTable)
      .values({
        buyer_id: recipientId,
        packaging_type: 'boxes',
        material: 'cardboard',
        quantity: 1000,
        personalization_needed: false,
        description: 'Test inquiry for message'
      })
      .returning()
      .execute();

    const inquiryId = inquiryResult[0].id;

    // Create a message with inquiry_id
    const messageWithInquiryResult = await db.insert(messagesTable)
      .values({
        sender_id: senderId,
        recipient_id: recipientId,
        inquiry_id: inquiryId,
        subject: 'Inquiry Message',
        content: 'This is about an inquiry'
      })
      .returning()
      .execute();

    const messageWithInquiryId = messageWithInquiryResult[0].id;

    const result = await markMessageAsRead(messageWithInquiryId, recipientId);

    expect(result.inquiry_id).toEqual(inquiryId);
    expect(result.read_at!).toBeInstanceOf(Date);
  });
});