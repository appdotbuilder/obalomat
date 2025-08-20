import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Package, Calendar, DollarSign, FileText, MessageSquare, Quote, CheckCircle } from 'lucide-react';
import { trpc } from '@/utils/trpc';

// Import types
import type { 
  User, 
  Inquiry, 
  Quote as QuoteType, 
  CreateInquiryInput, 
  PackagingType, 
  MaterialType, 
  InquiryStatus 
} from '../../../server/src/schema';

// Mock inquiry data (since backend returns stubs)
const mockInquiries: (Inquiry & { quotes?: QuoteType[], supplier_count?: number })[] = [
  {
    id: 1,
    buyer_id: 1,
    packaging_type: 'boxes',
    material: 'cardboard',
    quantity: 5000,
    personalization_needed: true,
    description: 'Need eco-friendly shipping boxes with custom logo print. Premium quality for luxury products.',
    budget_min: 2500,
    budget_max: 4000,
    delivery_deadline: new Date('2024-03-15'),
    status: 'responded',
    created_at: new Date('2024-01-10'),
    updated_at: new Date('2024-01-15'),
    supplier_count: 3,
    quotes: [
      {
        id: 1,
        inquiry_id: 1,
        supplier_id: 1,
        price_per_unit: 0.65,
        total_price: 3250,
        delivery_time_days: 14,
        notes: 'Premium FSC-certified cardboard with full-color printing',
        created_at: new Date('2024-01-12')
      },
      {
        id: 2,
        inquiry_id: 1,
        supplier_id: 2,
        price_per_unit: 0.72,
        total_price: 3600,
        delivery_time_days: 10,
        notes: 'High-quality boxes with UV coating finish',
        created_at: new Date('2024-01-14')
      }
    ]
  },
  {
    id: 2,
    buyer_id: 1,
    packaging_type: 'bottles',
    material: 'glass',
    quantity: 1000,
    personalization_needed: false,
    description: 'Standard glass bottles for craft beer. 330ml capacity.',
    budget_min: null,
    budget_max: 800,
    delivery_deadline: null,
    status: 'pending',
    created_at: new Date('2024-01-20'),
    updated_at: new Date('2024-01-20'),
    supplier_count: 2,
    quotes: []
  }
];

interface InquiryManagementProps {
  currentUser: User;
}

export default function InquiryManagement({ currentUser }: InquiryManagementProps) {
  const [inquiries, setInquiries] = useState<(Inquiry & { quotes?: QuoteType[], supplier_count?: number })[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [quotes, setQuotes] = useState<QuoteType[]>([]);

  // Form state for creating new inquiry
  const [formData, setFormData] = useState<Omit<CreateInquiryInput, 'buyer_id'>>({
    packaging_type: 'boxes',
    material: 'cardboard',
    quantity: 1000,
    personalization_needed: false,
    description: '',
    budget_min: null,
    budget_max: null,
    delivery_deadline: null,
    supplier_ids: []
  });

  const loadInquiries = useCallback(async () => {
    setIsLoading(true);
    try {
      if (currentUser.role === 'buyer') {
        // Call actual tRPC endpoint (will return empty array from stub)
        await trpc.getInquiriesForBuyer.query({ buyerId: currentUser.id });
        // Use mock data for demo
        setInquiries(mockInquiries.filter(i => i.buyer_id === currentUser.id));
      } else {
        // For suppliers, get inquiries sent to them
        await trpc.getInquiriesForSupplier.query({ supplierId: currentUser.id });
        // Use mock data for demo
        setInquiries(mockInquiries);
      }
    } catch (error) {
      console.error('Failed to load inquiries:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  const loadQuotes = useCallback(async (inquiryId: number) => {
    try {
      // Call actual tRPC endpoint (will return empty array from stub)
      await trpc.getQuotesForInquiry.query({ inquiryId });
      // Use mock data for demo
      const inquiry = mockInquiries.find(i => i.id === inquiryId);
      setQuotes(inquiry?.quotes || []);
    } catch (error) {
      console.error('Failed to load quotes:', error);
    }
  }, []);

  useEffect(() => {
    loadInquiries();
  }, [loadInquiries]);

  const handleCreateInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const input: CreateInquiryInput = {
        ...formData,
        buyer_id: currentUser.id
      };
      
      // Call actual tRPC endpoint
      await trpc.createInquiry.mutate(input);
      
      // Mock successful creation for demo
      const newInquiry: Inquiry & { quotes?: QuoteType[], supplier_count?: number } = {
        id: Date.now(), // Mock ID
        ...input,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
        supplier_count: input.supplier_ids.length,
        quotes: []
      };

      setInquiries((prev: (Inquiry & { quotes?: QuoteType[], supplier_count?: number })[]) => [newInquiry, ...prev]);
      setShowCreateDialog(false);
      
      // Reset form
      setFormData({
        packaging_type: 'boxes',
        material: 'cardboard',
        quantity: 1000,
        personalization_needed: false,
        description: '',
        budget_min: null,
        budget_max: null,
        delivery_deadline: null,
        supplier_ids: []
      });
    } catch (error) {
      console.error('Failed to create inquiry:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewQuotes = (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);
    loadQuotes(inquiry.id);
  };

  const packagingTypes: PackagingType[] = ['boxes', 'bottles', 'bags', 'containers', 'labels', 'pouches', 'tubes', 'cans', 'jars', 'wrapping', 'other'];
  const materialTypes: MaterialType[] = ['cardboard', 'plastic', 'glass', 'metal', 'paper', 'fabric', 'wood', 'biodegradable', 'recyclable', 'compostable', 'other'];

  const getStatusColor = (status: InquiryStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'responded': return 'bg-blue-100 text-blue-800';
      case 'closed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">
          {currentUser.role === 'buyer' ? 'My Inquiries' : 'Received Inquiries'}
        </h2>
        {currentUser.role === 'buyer' && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                New Inquiry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Inquiry</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateInquiry} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Packaging Type */}
                  <div className="space-y-2">
                    <Label htmlFor="packaging-type">Packaging Type</Label>
                    <Select
                      value={formData.packaging_type}
                      onValueChange={(value: PackagingType) =>
                        setFormData((prev: Omit<CreateInquiryInput, 'buyer_id'>) => ({ ...prev, packaging_type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {packagingTypes.map((type: PackagingType) => (
                          <SelectItem key={type} value={type} className="capitalize">
                            {type.replace('_', ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Material */}
                  <div className="space-y-2">
                    <Label htmlFor="material">Material</Label>
                    <Select
                      value={formData.material}
                      onValueChange={(value: MaterialType) =>
                        setFormData((prev: Omit<CreateInquiryInput, 'buyer_id'>) => ({ ...prev, material: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {materialTypes.map((material: MaterialType) => (
                          <SelectItem key={material} value={material} className="capitalize">
                            {material.replace('_', ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Quantity */}
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: Omit<CreateInquiryInput, 'buyer_id'>) => ({
                          ...prev,
                          quantity: parseInt(e.target.value) || 0
                        }))
                      }
                      required
                    />
                  </div>

                  {/* Budget Range */}
                  <div className="space-y-2">
                    <Label>Budget Range ($)</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Min"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.budget_min || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: Omit<CreateInquiryInput, 'buyer_id'>) => ({
                            ...prev,
                            budget_min: e.target.value ? parseFloat(e.target.value) : null
                          }))
                        }
                      />
                      <Input
                        placeholder="Max"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.budget_max || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: Omit<CreateInquiryInput, 'buyer_id'>) => ({
                            ...prev,
                            budget_max: e.target.value ? parseFloat(e.target.value) : null
                          }))
                        }
                      />
                    </div>
                  </div>

                  {/* Delivery Deadline */}
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="deadline">Delivery Deadline (optional)</Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={formData.delivery_deadline ? formData.delivery_deadline.toISOString().split('T')[0] : ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: Omit<CreateInquiryInput, 'buyer_id'>) => ({
                          ...prev,
                          delivery_deadline: e.target.value ? new Date(e.target.value) : null
                        }))
                      }
                    />
                  </div>
                </div>

                {/* Personalization */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="personalization"
                    checked={formData.personalization_needed}
                    onCheckedChange={(checked: boolean) =>
                      setFormData((prev: Omit<CreateInquiryInput, 'buyer_id'>) => ({
                        ...prev,
                        personalization_needed: checked
                      }))
                    }
                  />
                  <Label htmlFor="personalization">Personalization needed</Label>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your packaging requirements in detail..."
                    value={formData.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setFormData((prev: Omit<CreateInquiryInput, 'buyer_id'>) => ({
                        ...prev,
                        description: e.target.value
                      }))
                    }
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Creating...' : 'Create Inquiry'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Inquiries List */}
      <div className="space-y-4">
        {inquiries.length === 0 && !isLoading ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {currentUser.role === 'buyer' 
                ? "You haven't created any inquiries yet." 
                : "No inquiries received yet."}
            </p>
            {currentUser.role === 'buyer' && (
              <Button
                className="mt-4"
                onClick={() => setShowCreateDialog(true)}
              >
                Create Your First Inquiry
              </Button>
            )}
          </div>
        ) : (
          inquiries.map((inquiry: Inquiry & { quotes?: QuoteType[], supplier_count?: number }) => (
            <Card key={inquiry.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      {inquiry.packaging_type.charAt(0).toUpperCase() + inquiry.packaging_type.slice(1)} - {inquiry.material.charAt(0).toUpperCase() + inquiry.material.slice(1)}
                    </CardTitle>
                    <p className="text-gray-600 mt-1">
                      Quantity: {inquiry.quantity.toLocaleString()} units
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${getStatusColor(inquiry.status)} capitalize`}>
                      {inquiry.status}
                    </Badge>
                    {inquiry.personalization_needed && (
                      <Badge variant="outline">Personalization</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <p className="text-gray-700 mb-4">{inquiry.description}</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {/* Budget */}
                  {(inquiry.budget_min || inquiry.budget_max) && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">
                        Budget: 
                        {inquiry.budget_min && inquiry.budget_max 
                          ? ` $${inquiry.budget_min.toLocaleString()} - $${inquiry.budget_max.toLocaleString()}`
                          : inquiry.budget_max 
                            ? ` Up to $${inquiry.budget_max.toLocaleString()}`
                            : inquiry.budget_min 
                              ? ` From $${inquiry.budget_min.toLocaleString()}`
                              : ''}
                      </span>
                    </div>
                  )}

                  {/* Deadline */}
                  {inquiry.delivery_deadline && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">
                        Deadline: {inquiry.delivery_deadline.toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  {/* Suppliers/Quotes */}
                  <div className="flex items-center gap-2">
                    {currentUser.role === 'buyer' ? (
                      <>
                        <Quote className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">
                          {inquiry.quotes?.length || 0} quotes received
                        </span>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">
                          Sent to {inquiry.supplier_count || 0} suppliers
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <Separator className="mb-4" />

                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    Created: {inquiry.created_at.toLocaleDateString()}
                  </div>
                  <div className="space-x-2">
                    {currentUser.role === 'buyer' ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewQuotes(inquiry)}
                          disabled={!inquiry.quotes || inquiry.quotes.length === 0}
                        >
                          <Quote className="w-4 h-4 mr-2" />
                          View Quotes ({inquiry.quotes?.length || 0})
                        </Button>
                        <Button variant="outline" size="sm">
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Messages
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                          <Quote className="w-4 h-4 mr-2" />
                          Send Quote
                        </Button>
                        <Button variant="outline" size="sm">
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Message Buyer
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Quotes Dialog */}
      {selectedInquiry && (
        <Dialog open={!!selectedInquiry} onOpenChange={() => setSelectedInquiry(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Quotes for Inquiry #{selectedInquiry.id}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {quotes.length === 0 ? (
                <p className="text-center py-8 text-gray-500">No quotes received yet.</p>
              ) : (
                quotes.map((quote: QuoteType) => (
                  <Card key={quote.id}>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Price per Unit</Label>
                          <p className="text-lg font-bold">${quote.price_per_unit.toFixed(2)}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Total Price</Label>
                          <p className="text-lg font-bold text-green-600">
                            ${quote.total_price.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Delivery Time</Label>
                          <p className="text-lg">{quote.delivery_time_days} days</p>
                        </div>
                      </div>
                      {quote.notes && (
                        <div className="mt-4">
                          <Label className="text-sm font-medium">Notes</Label>
                          <p className="text-gray-700">{quote.notes}</p>
                        </div>
                      )}
                      <div className="flex justify-between items-center mt-4">
                        <span className="text-sm text-gray-500">
                          Received: {quote.created_at.toLocaleDateString()}
                        </span>
                        <div className="space-x-2">
                          <Button variant="outline" size="sm">
                            Message Supplier
                          </Button>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Accept Quote
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}