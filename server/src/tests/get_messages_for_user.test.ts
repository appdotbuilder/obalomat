import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, messagesTable, inquiriesTable } from '../db/schema';
import { type CreateUserInput, type CreateInquiryInput, type CreateMessageInput } from '../schema';
import { getMessagesForUser } from '../handlers/get_messages_for_user';

describe('getMessagesForUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test users data
  const testBuyer: CreateUserInput = {
    email: 'buyer@test.com',
    password_hash: 'hashed_password',
    company_name: 'Test Buyer Co',
    contact_person: 'John Buyer',
    phone: '123-456-7890',
    role: 'buyer',
    location: 'New York',
    description: 'A test buyer company',
    website: 'https://testbuyer.com'
  };

  const testSupplier: CreateUserInput = {
    email: 'supplier@test.com',
    password_hash: 'hashed_password',
    company_name: 'Test Supplier Co',
    contact_person: 'Jane Supplier',
    phone: '098-765-4321',
    role: 'supplier',
    location: 'California',
    description: 'A test supplier company',
    website: 'https://testsupplier.com'
  };

  const testThirdParty: CreateUserInput = {
    email: 'third@test.com',
    password_hash: 'hashed_password',
    company_name: 'Third Party Co',
    contact_person: 'Bob Third',
    phone: '555-123-4567',
    role: 'supplier',
    location: 'Texas',
    description: 'A third party company',
    website: 'https://thirdparty.com'
  };

  it('should return empty array when user has no messages', async () => {
    // Create a user but no messages
    const [user] = await db.insert(usersTable)
      .values(testBuyer)
      .returning()
      .execute();

    const result = await getMessagesForUser(user.id);

    expect(result).toEqual([]);
  });

  it('should fetch sent messages for user', async () => {
    // Create users
    const [buyer, supplier] = await db.insert(usersTable)
      .values([testBuyer, testSupplier])
      .returning()
      .execute();

    // Create a message sent by buyer
    const messageInput: CreateMessageInput = {
      sender_id: buyer.id,
      recipient_id: supplier.id,
      inquiry_id: null,
      subject: 'Test Subject',
      content: 'Test message content'
    };

    const [message] = await db.insert(messagesTable)
      .values(messageInput)
      .returning()
      .execute();

    const result = await getMessagesForUser(buyer.id);

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(message.id);
    expect(result[0].sender_id).toEqual(buyer.id);
    expect(result[0].recipient_id).toEqual(supplier.id);
    expect(result[0].subject).toEqual('Test Subject');
    expect(result[0].content).toEqual('Test message content');
    expect(result[0].inquiry_id).toBeNull();
    expect(result[0].sent_at).toBeInstanceOf(Date);
    expect(result[0].read_at).toBeNull();
  });

  it('should fetch received messages for user', async () => {
    // Create users
    const [buyer, supplier] = await db.insert(usersTable)
      .values([testBuyer, testSupplier])
      .returning()
      .execute();

    // Create a message sent to buyer
    const messageInput: CreateMessageInput = {
      sender_id: supplier.id,
      recipient_id: buyer.id,
      inquiry_id: null,
      subject: 'Reply Subject',
      content: 'Reply message content'
    };

    const [message] = await db.insert(messagesTable)
      .values(messageInput)
      .returning()
      .execute();

    const result = await getMessagesForUser(buyer.id);

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(message.id);
    expect(result[0].sender_id).toEqual(supplier.id);
    expect(result[0].recipient_id).toEqual(buyer.id);
    expect(result[0].subject).toEqual('Reply Subject');
    expect(result[0].content).toEqual('Reply message content');
  });

  it('should fetch both sent and received messages', async () => {
    // Create users
    const [buyer, supplier] = await db.insert(usersTable)
      .values([testBuyer, testSupplier])
      .returning()
      .execute();

    // Create messages in both directions
    const sentMessage: CreateMessageInput = {
      sender_id: buyer.id,
      recipient_id: supplier.id,
      inquiry_id: null,
      subject: 'Sent Message',
      content: 'Message sent by buyer'
    };

    const receivedMessage: CreateMessageInput = {
      sender_id: supplier.id,
      recipient_id: buyer.id,
      inquiry_id: null,
      subject: 'Received Message',
      content: 'Message received by buyer'
    };

    await db.insert(messagesTable)
      .values([sentMessage, receivedMessage])
      .execute();

    const result = await getMessagesForUser(buyer.id);

    expect(result).toHaveLength(2);
    
    // Should include both sent and received messages
    const sentMsg = result.find(msg => msg.subject === 'Sent Message');
    const receivedMsg = result.find(msg => msg.subject === 'Received Message');
    
    expect(sentMsg).toBeDefined();
    expect(sentMsg?.sender_id).toEqual(buyer.id);
    expect(sentMsg?.recipient_id).toEqual(supplier.id);
    
    expect(receivedMsg).toBeDefined();
    expect(receivedMsg?.sender_id).toEqual(supplier.id);
    expect(receivedMsg?.recipient_id).toEqual(buyer.id);
  });

  it('should order messages by sent_at descending (newest first)', async () => {
    // Create users
    const [buyer, supplier] = await db.insert(usersTable)
      .values([testBuyer, testSupplier])
      .returning()
      .execute();

    // Create inquiry for testing inquiry_id
    const inquiryInput: CreateInquiryInput = {
      buyer_id: buyer.id,
      packaging_type: 'boxes',
      material: 'cardboard',
      quantity: 1000,
      personalization_needed: false,
      description: 'Test inquiry',
      budget_min: 100,
      budget_max: 500,
      delivery_deadline: null,
      supplier_ids: [supplier.id]
    };

    const [inquiry] = await db.insert(inquiriesTable)
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

    // Create messages with different timestamps
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    // Insert messages with explicit timestamps
    await db.insert(messagesTable)
      .values([
        {
          sender_id: buyer.id,
          recipient_id: supplier.id,
          inquiry_id: inquiry.id,
          subject: 'Oldest Message',
          content: 'This was sent first',
          sent_at: twoHoursAgo
        },
        {
          sender_id: supplier.id,
          recipient_id: buyer.id,
          inquiry_id: inquiry.id,
          subject: 'Middle Message',
          content: 'This was sent second',
          sent_at: oneHourAgo
        },
        {
          sender_id: buyer.id,
          recipient_id: supplier.id,
          inquiry_id: null,
          subject: 'Newest Message',
          content: 'This was sent last',
          sent_at: now
        }
      ])
      .execute();

    const result = await getMessagesForUser(buyer.id);

    expect(result).toHaveLength(3);
    
    // Should be ordered by sent_at descending
    expect(result[0].subject).toEqual('Newest Message');
    expect(result[1].subject).toEqual('Middle Message');
    expect(result[2].subject).toEqual('Oldest Message');
    
    // Verify timestamps are in correct order
    expect(result[0].sent_at.getTime()).toBeGreaterThan(result[1].sent_at.getTime());
    expect(result[1].sent_at.getTime()).toBeGreaterThan(result[2].sent_at.getTime());
  });

  it('should include inquiry_id when message is related to inquiry', async () => {
    // Create users
    const [buyer, supplier] = await db.insert(usersTable)
      .values([testBuyer, testSupplier])
      .returning()
      .execute();

    // Create inquiry
    const inquiryInput: CreateInquiryInput = {
      buyer_id: buyer.id,
      packaging_type: 'bottles',
      material: 'glass',
      quantity: 500,
      personalization_needed: true,
      description: 'Glass bottles for cosmetics',
      budget_min: null,
      budget_max: 1000,
      delivery_deadline: null,
      supplier_ids: [supplier.id]
    };

    const [inquiry] = await db.insert(inquiriesTable)
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

    // Create message related to inquiry
    const messageInput: CreateMessageInput = {
      sender_id: supplier.id,
      recipient_id: buyer.id,
      inquiry_id: inquiry.id,
      subject: 'Quote for Glass Bottles',
      content: 'Here is our quote for the glass bottles'
    };

    await db.insert(messagesTable)
      .values(messageInput)
      .execute();

    const result = await getMessagesForUser(buyer.id);

    expect(result).toHaveLength(1);
    expect(result[0].inquiry_id).toEqual(inquiry.id);
    expect(result[0].subject).toEqual('Quote for Glass Bottles');
  });

  it('should not include messages from other users', async () => {
    // Create three users
    const [buyer, supplier, thirdParty] = await db.insert(usersTable)
      .values([testBuyer, testSupplier, testThirdParty])
      .returning()
      .execute();

    // Create message between buyer and supplier
    const buyerMessage: CreateMessageInput = {
      sender_id: buyer.id,
      recipient_id: supplier.id,
      inquiry_id: null,
      subject: 'Buyer to Supplier',
      content: 'Message from buyer to supplier'
    };

    // Create message between supplier and third party (buyer not involved)
    const otherMessage: CreateMessageInput = {
      sender_id: supplier.id,
      recipient_id: thirdParty.id,
      inquiry_id: null,
      subject: 'Supplier to Third Party',
      content: 'Message not involving buyer'
    };

    await db.insert(messagesTable)
      .values([buyerMessage, otherMessage])
      .execute();

    const result = await getMessagesForUser(buyer.id);

    // Should only get the message involving the buyer
    expect(result).toHaveLength(1);
    expect(result[0].subject).toEqual('Buyer to Supplier');
    expect(result[0].sender_id).toEqual(buyer.id);
  });

  it('should handle messages with read_at timestamp', async () => {
    // Create users
    const [buyer, supplier] = await db.insert(usersTable)
      .values([testBuyer, testSupplier])
      .returning()
      .execute();

    const readTime = new Date();
    
    // Create message with read_at timestamp
    await db.insert(messagesTable)
      .values({
        sender_id: supplier.id,
        recipient_id: buyer.id,
        inquiry_id: null,
        subject: 'Read Message',
        content: 'This message has been read',
        read_at: readTime
      })
      .execute();

    const result = await getMessagesForUser(buyer.id);

    expect(result).toHaveLength(1);
    expect(result[0].read_at).toBeInstanceOf(Date);
    expect(result[0].read_at?.getTime()).toEqual(readTime.getTime());
  });
});