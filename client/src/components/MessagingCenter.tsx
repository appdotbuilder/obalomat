import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, Plus, Clock, CheckCircle2, Circle } from 'lucide-react';
import { trpc } from '@/utils/trpc';

// Import types
import type { User, Message, CreateMessageInput } from '../../../server/src/schema';

// Mock message data (since backend returns stubs)
const mockMessages: (Message & { sender_name?: string; recipient_name?: string })[] = [
  {
    id: 1,
    sender_id: 2,
    recipient_id: 1,
    inquiry_id: 1,
    subject: 'Quote for Custom Shipping Boxes',
    content: 'Hi there! Thank you for your inquiry about custom shipping boxes. I\'ve reviewed your requirements and would like to discuss the specifications in more detail. We can offer premium FSC-certified cardboard with full-color printing at competitive rates. Could we schedule a call to discuss your timeline and volume requirements?',
    sent_at: new Date('2024-01-12T10:30:00'),
    read_at: new Date('2024-01-12T14:20:00'),
    sender_name: 'EcoPack Solutions',
    recipient_name: 'ABC Manufacturing'
  },
  {
    id: 2,
    sender_id: 1,
    recipient_id: 2,
    inquiry_id: 1,
    subject: 'Re: Quote for Custom Shipping Boxes',
    content: 'Hello! Thank you for your quick response. I\'d be happy to schedule a call to discuss the details. We\'re looking at a volume of 5,000 units initially with potential for monthly reorders. The timeline is flexible, but we\'d prefer delivery within 2-3 weeks. What would be the best time for a call this week?',
    sent_at: new Date('2024-01-12T16:45:00'),
    read_at: null,
    sender_name: 'ABC Manufacturing',
    recipient_name: 'EcoPack Solutions'
  },
  {
    id: 3,
    sender_id: 3,
    recipient_id: 1,
    inquiry_id: 2,
    subject: 'Glass Bottle Inquiry - Quick Quote',
    content: 'Greetings! I saw your inquiry for 330ml glass bottles. We specialize in craft beer bottles and have several options available. Our standard amber bottles are in stock and can be shipped within 5 business days. Would you be interested in samples? Also, do you need any special closures or labels?',
    sent_at: new Date('2024-01-20T09:15:00'),
    read_at: new Date('2024-01-20T11:30:00'),
    sender_name: 'Premium Glass Co',
    recipient_name: 'ABC Manufacturing'
  }
];

interface MessagingCenterProps {
  currentUser: User;
}

export default function MessagingCenter({ currentUser }: MessagingCenterProps) {
  const [messages, setMessages] = useState<(Message & { sender_name?: string; recipient_name?: string })[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message & { sender_name?: string; recipient_name?: string } | null>(null);
  const [showComposeDialog, setShowComposeDialog] = useState(false);
  const [replyText, setReplyText] = useState('');

  // Form state for new message
  const [newMessageForm, setNewMessageForm] = useState<Omit<CreateMessageInput, 'sender_id'>>({
    recipient_id: 0,
    inquiry_id: null,
    subject: '',
    content: ''
  });

  const loadMessages = useCallback(async () => {
    setIsLoading(true);
    try {
      // Call actual tRPC endpoint (will return empty array from stub)
      await trpc.getMessagesForUser.query({ userId: currentUser.id });
      
      // Use mock data for demo - filter based on user
      const userMessages = mockMessages.filter(m => 
        m.sender_id === currentUser.id || m.recipient_id === currentUser.id
      );
      setMessages(userMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const handleMarkAsRead = async (messageId: number) => {
    try {
      // Call actual tRPC endpoint
      await trpc.markMessageAsRead.mutate({ messageId, userId: currentUser.id });
      
      // Update local state for demo
      setMessages((prev: (Message & { sender_name?: string; recipient_name?: string })[]) =>
        prev.map(m => m.id === messageId ? { ...m, read_at: new Date() } : m)
      );
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const input: CreateMessageInput = {
        ...newMessageForm,
        sender_id: currentUser.id
      };

      // Call actual tRPC endpoint
      await trpc.createMessage.mutate(input);

      // Mock successful creation for demo
      const newMessage: Message & { sender_name?: string; recipient_name?: string } = {
        id: Date.now(),
        ...input,
        sent_at: new Date(),
        read_at: null,
        sender_name: currentUser.company_name,
        recipient_name: 'Recipient Company' // Would be fetched in real app
      };

      setMessages((prev: (Message & { sender_name?: string; recipient_name?: string })[]) => [newMessage, ...prev]);
      setShowComposeDialog(false);
      setNewMessageForm({
        recipient_id: 0,
        inquiry_id: null,
        subject: '',
        content: ''
      });
      
      alert('✅ Message sent successfully!');
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('❌ Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendReply = async (originalMessage: Message & { sender_name?: string; recipient_name?: string }) => {
    if (!replyText.trim()) return;

    setIsLoading(true);
    try {
      const input: CreateMessageInput = {
        sender_id: currentUser.id,
        recipient_id: originalMessage.sender_id,
        inquiry_id: originalMessage.inquiry_id,
        subject: originalMessage.subject.startsWith('Re:') ? originalMessage.subject : `Re: ${originalMessage.subject}`,
        content: replyText
      };

      // Call actual tRPC endpoint
      await trpc.createMessage.mutate(input);

      // Mock successful reply for demo
      const replyMessage: Message & { sender_name?: string; recipient_name?: string } = {
        id: Date.now(),
        ...input,
        sent_at: new Date(),
        read_at: null,
        sender_name: currentUser.company_name,
        recipient_name: originalMessage.sender_name
      };

      setMessages((prev: (Message & { sender_name?: string; recipient_name?: string })[]) => [replyMessage, ...prev]);
      setReplyText('');
      setSelectedMessage(null);
      
      alert('✅ Reply sent successfully!');
    } catch (error) {
      console.error('Failed to send reply:', error);
      alert('❌ Failed to send reply. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMessageClick = (message: Message & { sender_name?: string; recipient_name?: string }) => {
    setSelectedMessage(message);
    
    // Mark as read if it's an incoming message that hasn't been read
    if (message.recipient_id === currentUser.id && !message.read_at) {
      handleMarkAsRead(message.id);
    }
  };

  const isIncoming = (message: Message) => message.recipient_id === currentUser.id;
  const unreadCount = messages.filter(m => isIncoming(m) && !m.read_at).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">Messages</h2>
          {unreadCount > 0 && (
            <Badge className="bg-red-500">
              {unreadCount} unread
            </Badge>
          )}
        </div>
        <Dialog open={showComposeDialog} onOpenChange={setShowComposeDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Compose Message
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>New Message</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSendMessage} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recipient">Recipient ID</Label>
                <Input
                  id="recipient"
                  type="number"
                  value={newMessageForm.recipient_id || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewMessageForm((prev: Omit<CreateMessageInput, 'sender_id'>) => ({
                      ...prev,
                      recipient_id: parseInt(e.target.value) || 0
                    }))
                  }
                  required
                  placeholder="Enter recipient user ID"
                />
                <p className="text-xs text-gray-500">
                  🚧 Demo: In a real app, this would be a user/company selector
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={newMessageForm.subject}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewMessageForm((prev: Omit<CreateMessageInput, 'sender_id'>) => ({
                      ...prev,
                      subject: e.target.value
                    }))
                  }
                  required
                  placeholder="Enter message subject"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inquiry-id">Related Inquiry (optional)</Label>
                <Input
                  id="inquiry-id"
                  type="number"
                  value={newMessageForm.inquiry_id || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewMessageForm((prev: Omit<CreateMessageInput, 'sender_id'>) => ({
                      ...prev,
                      inquiry_id: e.target.value ? parseInt(e.target.value) : null
                    }))
                  }
                  placeholder="Enter inquiry ID if related"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Message</Label>
                <Textarea
                  id="content"
                  value={newMessageForm.content}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setNewMessageForm((prev: Omit<CreateMessageInput, 'sender_id'>) => ({
                      ...prev,
                      content: e.target.value
                    }))
                  }
                  required
                  placeholder="Type your message here..."
                  rows={5}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowComposeDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Sending...' : 'Send Message'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Messages Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[600px]">
        {/* Messages List */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">Conversations</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {messages.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No messages yet</p>
                    <Button
                      variant="link"
                      onClick={() => setShowComposeDialog(true)}
                      className="text-sm"
                    >
                      Send your first message
                    </Button>
                  </div>
                ) : (
                  messages.map((message: Message & { sender_name?: string; recipient_name?: string }) => (
                    <div
                      key={message.id}
                      className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                        selectedMessage?.id === message.id ? 'bg-blue-50 border-r-2 border-r-blue-500' : ''
                      }`}
                      onClick={() => handleMessageClick(message)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {isIncoming(message) ? (
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {message.sender_name || `User ${message.sender_id}`}
                              </span>
                            ) : (
                              <span className="text-sm font-medium text-blue-600 truncate">
                                To: {message.recipient_name || `User ${message.recipient_id}`}
                              </span>
                            )}
                            {isIncoming(message) && !message.read_at && (
                              <Circle className="w-2 h-2 text-blue-500 fill-current flex-shrink-0" />
                            )}
                          </div>
                          <h4 className="text-sm font-medium truncate">{message.subject}</h4>
                          <p className="text-xs text-gray-600 truncate mt-1">{message.content}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-500">
                              {message.sent_at.toLocaleDateString()} {message.sent_at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {message.read_at && !isIncoming(message) && (
                              <CheckCircle2 className="w-3 h-3 text-green-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Message Detail */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            {selectedMessage ? (
              <>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{selectedMessage.subject}</CardTitle>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <span>
                          {isIncoming(selectedMessage) ? 'From' : 'To'}: {' '}
                          <strong>
                            {isIncoming(selectedMessage) 
                              ? selectedMessage.sender_name || `User ${selectedMessage.sender_id}`
                              : selectedMessage.recipient_name || `User ${selectedMessage.recipient_id}`
                            }
                          </strong>
                        </span>
                        <span>
                          {selectedMessage.sent_at.toLocaleDateString()} {selectedMessage.sent_at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {selectedMessage.inquiry_id && (
                          <Badge variant="outline" className="text-xs">
                            Inquiry #{selectedMessage.inquiry_id}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {selectedMessage.read_at && !isIncoming(selectedMessage) && (
                      <Badge variant="outline" className="text-xs">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Read
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Message Content */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="whitespace-pre-wrap">{selectedMessage.content}</p>
                    </div>

                    <Separator />

                    {/* Reply Section */}
                    {isIncoming(selectedMessage) && (
                      <div className="space-y-4">
                        <Label htmlFor="reply">Reply</Label>
                        <Textarea
                          id="reply"
                          value={replyText}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReplyText(e.target.value)}
                          placeholder="Type your reply..."
                          rows={4}
                        />
                        <div className="flex justify-end">
                          <Button
                            onClick={() => handleSendReply(selectedMessage)}
                            disabled={!replyText.trim() || isLoading}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            {isLoading ? 'Sending...' : 'Send Reply'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="h-full flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Select a message to view</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}