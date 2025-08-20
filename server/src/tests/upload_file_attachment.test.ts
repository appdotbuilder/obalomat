import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, inquiriesTable, messagesTable, fileAttachmentsTable } from '../db/schema';
import { uploadFileAttachment } from '../handlers/upload_file_attachment';
import { eq } from 'drizzle-orm';

describe('uploadFileAttachment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test user
  const createTestUser = async () => {
    const result = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        company_name: 'Test Company',
        contact_person: 'John Doe',
        phone: '123-456-7890',
        role: 'buyer',
        location: 'New York'
      })
      .returning()
      .execute();
    return result[0];
  };

  // Helper function to create test inquiry
  const createTestInquiry = async (buyerId: number) => {
    const result = await db.insert(inquiriesTable)
      .values({
        buyer_id: buyerId,
        packaging_type: 'boxes',
        material: 'cardboard',
        quantity: 1000,
        personalization_needed: true,
        description: 'Need custom boxes for our products'
      })
      .returning()
      .execute();
    return result[0];
  };

  // Helper function to create test message
  const createTestMessage = async (senderId: number, recipientId: number) => {
    const result = await db.insert(messagesTable)
      .values({
        sender_id: senderId,
        recipient_id: recipientId,
        subject: 'Test Message',
        content: 'This is a test message'
      })
      .returning()
      .execute();
    return result[0];
  };

  it('should upload file attachment for inquiry', async () => {
    const user = await createTestUser();
    const inquiry = await createTestInquiry(user.id);

    const result = await uploadFileAttachment(
      'test_document.pdf',
      '/uploads/test_document.pdf',
      1024000, // 1MB
      'application/pdf',
      inquiry.id
    );

    expect(result.filename).toEqual('test_document.pdf');
    expect(result.file_path).toEqual('/uploads/test_document.pdf');
    expect(result.file_size).toEqual(1024000);
    expect(result.mime_type).toEqual('application/pdf');
    expect(result.inquiry_id).toEqual(inquiry.id);
    expect(result.message_id).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.uploaded_at).toBeInstanceOf(Date);
  });

  it('should upload file attachment for message', async () => {
    const user1 = await createTestUser();
    const user2 = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashed_password',
        company_name: 'Test Company 2',
        contact_person: 'Jane Smith',
        role: 'supplier',
        location: 'Los Angeles'
      })
      .returning()
      .execute();

    const message = await createTestMessage(user1.id, user2[0].id);

    const result = await uploadFileAttachment(
      'attachment.jpg',
      '/uploads/attachment.jpg',
      512000, // 512KB
      'image/jpeg',
      undefined,
      message.id
    );

    expect(result.filename).toEqual('attachment.jpg');
    expect(result.file_path).toEqual('/uploads/attachment.jpg');
    expect(result.file_size).toEqual(512000);
    expect(result.mime_type).toEqual('image/jpeg');
    expect(result.inquiry_id).toBeNull();
    expect(result.message_id).toEqual(message.id);
    expect(result.id).toBeDefined();
    expect(result.uploaded_at).toBeInstanceOf(Date);
  });

  it('should upload file attachment for both inquiry and message', async () => {
    const user1 = await createTestUser();
    const user2 = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashed_password',
        company_name: 'Test Company 2',
        contact_person: 'Jane Smith',
        role: 'supplier',
        location: 'Los Angeles'
      })
      .returning()
      .execute();

    const inquiry = await createTestInquiry(user1.id);
    const message = await createTestMessage(user1.id, user2[0].id);

    const result = await uploadFileAttachment(
      'combined_attachment.png',
      '/uploads/combined_attachment.png',
      256000, // 256KB
      'image/png',
      inquiry.id,
      message.id
    );

    expect(result.inquiry_id).toEqual(inquiry.id);
    expect(result.message_id).toEqual(message.id);
    expect(result.filename).toEqual('combined_attachment.png');
  });

  it('should save file attachment to database', async () => {
    const user = await createTestUser();
    const inquiry = await createTestInquiry(user.id);

    const result = await uploadFileAttachment(
      'database_test.pdf',
      '/uploads/database_test.pdf',
      2048000, // 2MB
      'application/pdf',
      inquiry.id
    );

    const savedAttachments = await db.select()
      .from(fileAttachmentsTable)
      .where(eq(fileAttachmentsTable.id, result.id))
      .execute();

    expect(savedAttachments).toHaveLength(1);
    const attachment = savedAttachments[0];
    expect(attachment.filename).toEqual('database_test.pdf');
    expect(attachment.file_path).toEqual('/uploads/database_test.pdf');
    expect(attachment.file_size).toEqual(2048000);
    expect(attachment.mime_type).toEqual('application/pdf');
    expect(attachment.inquiry_id).toEqual(inquiry.id);
    expect(attachment.uploaded_at).toBeInstanceOf(Date);
  });

  it('should reject when neither inquiry_id nor message_id is provided', async () => {
    await expect(uploadFileAttachment(
      'test.pdf',
      '/uploads/test.pdf',
      1024,
      'application/pdf'
    )).rejects.toThrow(/either inquiry_id or message_id must be provided/i);
  });

  it('should reject files with invalid MIME types', async () => {
    const user = await createTestUser();
    const inquiry = await createTestInquiry(user.id);

    await expect(uploadFileAttachment(
      'malicious.exe',
      '/uploads/malicious.exe',
      1024,
      'application/x-executable',
      inquiry.id
    )).rejects.toThrow(/file type .* is not allowed/i);
  });

  it('should reject files exceeding size limit', async () => {
    const user = await createTestUser();
    const inquiry = await createTestInquiry(user.id);

    const oversizedFile = 11 * 1024 * 1024; // 11MB (exceeds 10MB limit)

    await expect(uploadFileAttachment(
      'large_file.pdf',
      '/uploads/large_file.pdf',
      oversizedFile,
      'application/pdf',
      inquiry.id
    )).rejects.toThrow(/file size exceeds maximum allowed size/i);
  });

  it('should reject files with zero or negative size', async () => {
    const user = await createTestUser();
    const inquiry = await createTestInquiry(user.id);

    await expect(uploadFileAttachment(
      'empty.pdf',
      '/uploads/empty.pdf',
      0,
      'application/pdf',
      inquiry.id
    )).rejects.toThrow(/file size must be greater than 0/i);

    await expect(uploadFileAttachment(
      'negative.pdf',
      '/uploads/negative.pdf',
      -100,
      'application/pdf',
      inquiry.id
    )).rejects.toThrow(/file size must be greater than 0/i);
  });

  it('should reject empty filename', async () => {
    const user = await createTestUser();
    const inquiry = await createTestInquiry(user.id);

    await expect(uploadFileAttachment(
      '',
      '/uploads/test.pdf',
      1024,
      'application/pdf',
      inquiry.id
    )).rejects.toThrow(/filename cannot be empty/i);

    await expect(uploadFileAttachment(
      '   ',
      '/uploads/test.pdf',
      1024,
      'application/pdf',
      inquiry.id
    )).rejects.toThrow(/filename cannot be empty/i);
  });

  it('should reject empty file path', async () => {
    const user = await createTestUser();
    const inquiry = await createTestInquiry(user.id);

    await expect(uploadFileAttachment(
      'test.pdf',
      '',
      1024,
      'application/pdf',
      inquiry.id
    )).rejects.toThrow(/file path cannot be empty/i);

    await expect(uploadFileAttachment(
      'test.pdf',
      '   ',
      1024,
      'application/pdf',
      inquiry.id
    )).rejects.toThrow(/file path cannot be empty/i);
  });

  it('should reject non-existent inquiry', async () => {
    await expect(uploadFileAttachment(
      'test.pdf',
      '/uploads/test.pdf',
      1024,
      'application/pdf',
      999999 // Non-existent inquiry ID
    )).rejects.toThrow(/inquiry with id 999999 not found/i);
  });

  it('should reject non-existent message', async () => {
    await expect(uploadFileAttachment(
      'test.pdf',
      '/uploads/test.pdf',
      1024,
      'application/pdf',
      undefined,
      999999 // Non-existent message ID
    )).rejects.toThrow(/message with id 999999 not found/i);
  });

  it('should handle various allowed file types', async () => {
    const user = await createTestUser();
    const inquiry = await createTestInquiry(user.id);

    const allowedTypes = [
      { filename: 'doc.pdf', mimeType: 'application/pdf' },
      { filename: 'image.jpg', mimeType: 'image/jpeg' },
      { filename: 'image.png', mimeType: 'image/png' },
      { filename: 'image.gif', mimeType: 'image/gif' },
      { filename: 'doc.doc', mimeType: 'application/msword' },
      { filename: 'doc.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
      { filename: 'sheet.xls', mimeType: 'application/vnd.ms-excel' },
      { filename: 'sheet.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
      { filename: 'text.txt', mimeType: 'text/plain' },
      { filename: 'data.csv', mimeType: 'text/csv' }
    ];

    for (const fileType of allowedTypes) {
      const result = await uploadFileAttachment(
        fileType.filename,
        `/uploads/${fileType.filename}`,
        1024,
        fileType.mimeType,
        inquiry.id
      );

      expect(result.filename).toEqual(fileType.filename);
      expect(result.mime_type).toEqual(fileType.mimeType);
      expect(result.inquiry_id).toEqual(inquiry.id);
    }
  });

  it('should trim whitespace from filename and file path', async () => {
    const user = await createTestUser();
    const inquiry = await createTestInquiry(user.id);

    const result = await uploadFileAttachment(
      '  trimmed_filename.pdf  ',
      '  /uploads/trimmed_filename.pdf  ',
      1024,
      'application/pdf',
      inquiry.id
    );

    expect(result.filename).toEqual('trimmed_filename.pdf');
    expect(result.file_path).toEqual('/uploads/trimmed_filename.pdf');
  });
});