import { db } from '../db';
import { fileAttachmentsTable, inquiriesTable, messagesTable } from '../db/schema';
import { type FileAttachment } from '../schema';
import { eq } from 'drizzle-orm';

// Define allowed MIME types for security
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv'
];

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function uploadFileAttachment(
  filename: string,
  filePath: string,
  fileSize: number,
  mimeType: string,
  inquiryId?: number,
  messageId?: number
): Promise<FileAttachment> {
  try {
    // Validate that either inquiryId or messageId is provided
    if (!inquiryId && !messageId) {
      throw new Error('Either inquiry_id or message_id must be provided');
    }

    // Validate file size
    if (fileSize <= 0) {
      throw new Error('File size must be greater than 0');
    }

    if (fileSize > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new Error(`File type ${mimeType} is not allowed`);
    }

    // Validate filename
    if (!filename || filename.trim().length === 0) {
      throw new Error('Filename cannot be empty');
    }

    // Validate file path
    if (!filePath || filePath.trim().length === 0) {
      throw new Error('File path cannot be empty');
    }

    // Verify that the referenced inquiry exists (if provided)
    if (inquiryId) {
      const inquiry = await db.select()
        .from(inquiriesTable)
        .where(eq(inquiriesTable.id, inquiryId))
        .limit(1)
        .execute();
      
      if (inquiry.length === 0) {
        throw new Error(`Inquiry with id ${inquiryId} not found`);
      }
    }

    // Verify that the referenced message exists (if provided)
    if (messageId) {
      const message = await db.select()
        .from(messagesTable)
        .where(eq(messagesTable.id, messageId))
        .limit(1)
        .execute();
      
      if (message.length === 0) {
        throw new Error(`Message with id ${messageId} not found`);
      }
    }

    // Insert the file attachment record
    const result = await db.insert(fileAttachmentsTable)
      .values({
        inquiry_id: inquiryId || null,
        message_id: messageId || null,
        filename: filename.trim(),
        file_path: filePath.trim(),
        file_size: fileSize,
        mime_type: mimeType
      })
      .returning()
      .execute();

    const fileAttachment = result[0];
    return {
      ...fileAttachment,
      inquiry_id: fileAttachment.inquiry_id,
      message_id: fileAttachment.message_id
    };
  } catch (error) {
    console.error('File attachment upload failed:', error);
    throw error;
  }
}