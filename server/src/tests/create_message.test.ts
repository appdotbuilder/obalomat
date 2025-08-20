import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, inquiriesTable, messagesTable } from '../db/schema';
import { type CreateMessageInput, type CreateUserInput, type CreateInquiryInput } from '../schema';
import { createMessage } from '../handlers/create_message';
import { eq } from 'drizzle-orm';

// Test users
const testSender: CreateUserInput = {
  email: 'sender@test.com',
  password_hash: 'hash123',
  company_name: 'Sender Corp',
  contact_person: 'John Sender',
  phone: '+1234567890',
  role: 'buyer',
  location: 'New York',
  description: 'A buyer company',
  website: 'https://sender.com'
};

const testRecipient: CreateUserInput = {
  email: 'recipient@test.com',
  password_hash: 'hash456',
  company_name: 'Recipient LLC',
  contact_person: 'Jane Recipient',
  phone: '+9876543210',
  role: 'supplier',
  location: 'California',
  description: 'A supplier company',
  website: 'https://recipient.com'
};

describe('createMessage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a message between users', async () => {
    // Create sender and recipient users
    const senderResult = await db.insert(usersTable)
      .values(testSender)
      .returning()
      .execute();
    const sender = senderResult[0];

    const recipientResult = await db.insert(usersTable)
      .values(testRecipient)
      .returning()
      .execute();
    const recipient = recipientResult[0];

    const messageInput: CreateMessageInput = {
      sender_id: sender.id,
      recipient_id: recipient.id,
      inquiry_id: null,
      subject: 'Test Message Subject',
      content: 'This is a test message content.'
    };

    const result = await createMessage(messageInput);

    // Validate message fields
    expect(result.sender_id).toEqual(sender.id);
    expect(result.recipient_id).toEqual(recipient.id);
    expect(result.inquiry_id).toBeNull();
    expect(result.subject).toEqual('Test Message Subject');
    expect(result.content).toEqual('This is a test message content.');
    expect(result.id).toBeDefined();
    expect(result.sent_at).toBeInstanceOf(Date);
    expect(result.read_at).toBeNull();
  });

  it('should save message to database', async () => {
    // Create sender and recipient users
    const senderResult = await db.insert(usersTable)
      .values(testSender)
      .returning()
      .execute();
    const sender = senderResult[0];

    const recipientResult = await db.insert(usersTable)
      .values(testRecipient)
      .returning()
      .execute();
    const recipient = recipientResult[0];

    const messageInput: CreateMessageInput = {
      sender_id: sender.id,
      recipient_id: recipient.id,
      inquiry_id: null,
      subject: 'Database Test Subject',
      content: 'Database test content.'
    };

    const result = await createMessage(messageInput);

    // Query database to verify message was saved
    const messages = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.id, result.id))
      .execute();

    expect(messages).toHaveLength(1);
    expect(messages[0].sender_id).toEqual(sender.id);
    expect(messages[0].recipient_id).toEqual(recipient.id);
    expect(messages[0].inquiry_id).toBeNull();
    expect(messages[0].subject).toEqual('Database Test Subject');
    expect(messages[0].content).toEqual('Database test content.');
    expect(messages[0].sent_at).toBeInstanceOf(Date);
    expect(messages[0].read_at).toBeNull();
  });

  it('should create a message linked to an inquiry', async () => {
    // Create sender and recipient users
    const senderResult = await db.insert(usersTable)
      .values(testSender)
      .returning()
      .execute();
    const sender = senderResult[0];

    const recipientResult = await db.insert(usersTable)
      .values(testRecipient)
      .returning()
      .execute();
    const recipient = recipientResult[0];

    // Create inquiry
    const inquiryInput: CreateInquiryInput = {
      buyer_id: sender.id,
      packaging_type: 'boxes',
      material: 'cardboard',
      quantity: 1000,
      personalization_needed: true,
      description: 'Need custom boxes',
      budget_min: 100,
      budget_max: 500,
      delivery_deadline: new Date('2024-12-31'),
      supplier_ids: []
    };

    const inquiryResult = await db.insert(inquiriesTable)
      .values({
        buyer_id: inquiryInput.buyer_id,
        packaging_type: inquiryInput.packaging_type,
        material: inquiryInput.material,
        quantity: inquiryInput.quantity,
        personalization_needed: inquiryInput.personalization_needed,
        description: inquiryInput.description,
        budget_min: inquiryInput.budget_min?.toString(),
        budget_max: inquiryInput.budget_max?.toString(),
        delivery_deadline: inquiryInput.delivery_deadline
      })
      .returning()
      .execute();
    const inquiry = inquiryResult[0];

    const messageInput: CreateMessageInput = {
      sender_id: sender.id,
      recipient_id: recipient.id,
      inquiry_id: inquiry.id,
      subject: 'Inquiry Discussion',
      content: 'Let me discuss this inquiry with you.'
    };

    const result = await createMessage(messageInput);

    // Validate message is linked to inquiry
    expect(result.inquiry_id).toEqual(inquiry.id);
    expect(result.sender_id).toEqual(sender.id);
    expect(result.recipient_id).toEqual(recipient.id);
    expect(result.subject).toEqual('Inquiry Discussion');
    expect(result.content).toEqual('Let me discuss this inquiry with you.');
  });

  it('should throw error when sender does not exist', async () => {
    // Create only recipient user
    const recipientResult = await db.insert(usersTable)
      .values(testRecipient)
      .returning()
      .execute();
    const recipient = recipientResult[0];

    const messageInput: CreateMessageInput = {
      sender_id: 99999, // Non-existent sender ID
      recipient_id: recipient.id,
      inquiry_id: null,
      subject: 'Test Subject',
      content: 'Test content'
    };

    expect(createMessage(messageInput)).rejects.toThrow(/Sender with id 99999 does not exist/i);
  });

  it('should throw error when recipient does not exist', async () => {
    // Create only sender user
    const senderResult = await db.insert(usersTable)
      .values(testSender)
      .returning()
      .execute();
    const sender = senderResult[0];

    const messageInput: CreateMessageInput = {
      sender_id: sender.id,
      recipient_id: 99999, // Non-existent recipient ID
      inquiry_id: null,
      subject: 'Test Subject',
      content: 'Test content'
    };

    expect(createMessage(messageInput)).rejects.toThrow(/Recipient with id 99999 does not exist/i);
  });

  it('should throw error when inquiry does not exist', async () => {
    // Create sender and recipient users
    const senderResult = await db.insert(usersTable)
      .values(testSender)
      .returning()
      .execute();
    const sender = senderResult[0];

    const recipientResult = await db.insert(usersTable)
      .values(testRecipient)
      .returning()
      .execute();
    const recipient = recipientResult[0];

    const messageInput: CreateMessageInput = {
      sender_id: sender.id,
      recipient_id: recipient.id,
      inquiry_id: 99999, // Non-existent inquiry ID
      subject: 'Test Subject',
      content: 'Test content'
    };

    expect(createMessage(messageInput)).rejects.toThrow(/Inquiry with id 99999 does not exist/i);
  });

  it('should handle messages with long content', async () => {
    // Create sender and recipient users
    const senderResult = await db.insert(usersTable)
      .values(testSender)
      .returning()
      .execute();
    const sender = senderResult[0];

    const recipientResult = await db.insert(usersTable)
      .values(testRecipient)
      .returning()
      .execute();
    const recipient = recipientResult[0];

    const longContent = 'This is a very long message content that spans multiple lines and contains detailed information about packaging requirements, specifications, delivery terms, and other important details. '.repeat(10);

    const messageInput: CreateMessageInput = {
      sender_id: sender.id,
      recipient_id: recipient.id,
      inquiry_id: null,
      subject: 'Detailed Packaging Requirements Discussion',
      content: longContent
    };

    const result = await createMessage(messageInput);

    expect(result.content).toEqual(longContent);
    expect(result.subject).toEqual('Detailed Packaging Requirements Discussion');
    expect(result.content.length).toBeGreaterThan(1000);
  });
});