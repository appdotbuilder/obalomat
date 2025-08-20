import { type CreateMessageInput, type Message } from '../schema';

export async function createMessage(input: CreateMessageInput): Promise<Message> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is creating a direct message between buyer and supplier.
    // Should validate that both sender_id and recipient_id exist.
    // Should optionally link to an inquiry if the message is related to specific inquiry.
    return Promise.resolve({
        id: 0, // Placeholder ID
        sender_id: input.sender_id,
        recipient_id: input.recipient_id,
        inquiry_id: input.inquiry_id,
        subject: input.subject,
        content: input.content,
        sent_at: new Date(),
        read_at: null
    } as Message);
}