import { type Message } from '../schema';

export async function markMessageAsRead(messageId: number, userId: number): Promise<Message> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is marking a message as read by setting read_at timestamp.
    // Should validate that the user is the recipient of the message.
    // Should only update read_at if it's currently null (not already read).
    return Promise.resolve({
        id: messageId,
        sender_id: 0,
        recipient_id: userId,
        inquiry_id: null,
        subject: '',
        content: '',
        sent_at: new Date(),
        read_at: new Date()
    } as Message);
}