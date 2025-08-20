import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MapPin, Package, Star, Clock, DollarSign, Award, Send } from 'lucide-react';
import { trpc } from '@/utils/trpc';

// Import types - using correct relative path (2 levels up from client/src)
import type { User, SearchSuppliersInput, PackagingType, MaterialType, CertificationType } from '../../../server/src/schema';

// Mock supplier data with profiles (since backend returns stubs)
const mockSuppliersWithProfiles = [
  {
    id: 1,
    email: 'supplier1@example.com',
    password_hash: 'mock',
    company_name: 'EcoPack Solutions',
    contact_person: 'Maria Garcia',
    phone: '+1-555-0101',
    role: 'supplier' as const,
    location: 'California, USA',
    description: 'Sustainable packaging solutions with full recyclable materials',
    website: 'https://ecopack.com',
    created_at: new Date('2023-01-15'),
    updated_at: new Date('2024-01-01'),
    profile: {
      packaging_types: ['boxes', 'bags', 'containers'] as PackagingType[],
      materials: ['cardboard', 'biodegradable', 'recyclable'] as MaterialType[],
      min_order_quantity: 1000,
      personalization_available: true,
      price_range_min: 0.15,
      price_range_max: 2.50,
      delivery_time_days: 14,
      certifications: ['fsc', 'iso14001'] as CertificationType[],
      rating: 4.8
    }
  },
  {
    id: 2,
    email: 'supplier2@example.com',
    password_hash: 'mock',
    company_name: 'Premium Glass Co',
    contact_person: 'Robert Chen',
    phone: '+1-555-0102',
    role: 'supplier' as const,
    location: 'New York, USA',
    description: 'High-quality glass packaging for premium products',
    website: 'https://premiumglass.com',
    created_at: new Date('2022-08-20'),
    updated_at: new Date('2024-01-01'),
    profile: {
      packaging_types: ['bottles', 'jars'] as PackagingType[],
      materials: ['glass'] as MaterialType[],
      min_order_quantity: 500,
      personalization_available: true,
      price_range_min: 0.80,
      price_range_max: 5.00,
      delivery_time_days: 21,
      certifications: ['iso9001', 'fda'] as CertificationType[],
      rating: 4.6
    }
  },
  {
    id: 3,
    email: 'supplier3@example.com',
    password_hash: 'mock',
    company_name: 'FlexiPack Industries',
    contact_person: 'Anna Kowalski',
    phone: '+1-555-0103',
    role: 'supplier' as const,
    location: 'Texas, USA',
    description: 'Flexible packaging solutions for food and beverage industry',
    website: 'https://flexipack.com',
    created_at: new Date('2023-03-10'),
    updated_at: new Date('2024-01-01'),
    profile: {
      packaging_types: ['bags', 'pouches', 'wrapping'] as PackagingType[],
      materials: ['plastic', 'paper', 'biodegradable'] as MaterialType[],
      min_order_quantity: 2000,
      personalization_available: true,
      price_range_min: 0.05,
      price_range_max: 1.20,
      delivery_time_days: 10,
      certifications: ['brc', 'fda'] as CertificationType[],
      rating: 4.9
    }
  }
];

interface SupplierSearchProps {
  currentUser: User;
}

type SupplierWithProfile = User & {
  profile: {
    packaging_types: PackagingType[];
    materials: MaterialType[];
    min_order_quantity: number;
    personalization_available: boolean;
    price_range_min: number | null;
    price_range_max: number | null;
    delivery_time_days: number;
    certifications: CertificationType[];
    rating: number;
  };
};

export default function SupplierSearch({ currentUser }: SupplierSearchProps) {
  const [suppliers, setSuppliers] = useState<SupplierWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSuppliers, setSelectedSuppliers] = useState<number[]>([]);

  // Search filters
  const [filters, setFilters] = useState<SearchSuppliersInput>({
    packaging_types: [],
    materials: [],
    location: '',
    max_min_order_quantity: undefined,
    personalization_required: undefined,
    certifications: [],
    price_range_max: undefined,
    delivery_time_max_days: undefined
  });

  const loadSuppliers = useCallback(async () => {
    setIsLoading(true);
    try {
      // Call the actual tRPC endpoint (will return empty array from stub)
      await trpc.searchSuppliers.query(filters);
      
      // Since backend is stub, use mock data for demo
      // Filter mock data based on current filters
      let filteredSuppliers = mockSuppliersWithProfiles;

      if (filters.location) {
        filteredSuppliers = filteredSuppliers.filter(s => 
          s.location.toLowerCase().includes(filters.location!.toLowerCase())
        );
      }

      if (filters.packaging_types && filters.packaging_types.length > 0) {
        filteredSuppliers = filteredSuppliers.filter(s =>
          filters.packaging_types!.some(type => s.profile.packaging_types.includes(type))
        );
      }

      if (filters.materials && filters.materials.length > 0) {
        filteredSuppliers = filteredSuppliers.filter(s =>
          filters.materials!.some(material => s.profile.materials.includes(material))
        );
      }

      if (filters.max_min_order_quantity) {
        filteredSuppliers = filteredSuppliers.filter(s =>
          s.profile.min_order_quantity <= filters.max_min_order_quantity!
        );
      }

      if (filters.personalization_required !== undefined) {
        filteredSuppliers = filteredSuppliers.filter(s =>
          s.profile.personalization_available === filters.personalization_required
        );
      }

      if (filters.delivery_time_max_days) {
        filteredSuppliers = filteredSuppliers.filter(s =>
          s.profile.delivery_time_days <= filters.delivery_time_max_days!
        );
      }

      setSuppliers(filteredSuppliers);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const handleSupplierSelect = (supplierId: number) => {
    setSelectedSuppliers((prev: number[]) =>
      prev.includes(supplierId)
        ? prev.filter(id => id !== supplierId)
        : [...prev, supplierId]
    );
  };

  const handleSendBulkInquiry = () => {
    if (selectedSuppliers.length === 0) return;
    alert(`🚧 Demo: Would send bulk inquiry to ${selectedSuppliers.length} suppliers. This would navigate to inquiry creation form.`);
  };

  const packagingTypes: PackagingType[] = ['boxes', 'bottles', 'bags', 'containers', 'labels', 'pouches', 'tubes', 'cans', 'jars', 'wrapping', 'other'];
  const materialTypes: MaterialType[] = ['cardboard', 'plastic', 'glass', 'metal', 'paper', 'fabric', 'wood', 'biodegradable', 'recyclable', 'compostable', 'other'];
  const certificationTypes: CertificationType[] = ['fsc', 'pefc', 'iso14001', 'iso9001', 'brc', 'fda', 'eu_organic', 'cradle_to_cradle', 'other'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Find Packaging Suppliers</h2>
        {selectedSuppliers.length > 0 && (
          <Button onClick={handleSendBulkInquiry} className="bg-green-600 hover:bg-green-700">
            <Send className="w-4 h-4 mr-2" />
            Send Inquiry to {selectedSuppliers.length} Suppliers
          </Button>
        )}
      </div>

      {/* Search Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="Enter location..."
                value={filters.location || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFilters((prev: SearchSuppliersInput) => ({ ...prev, location: e.target.value || undefined }))
                }
              />
            </div>

            {/* Max Min Order Quantity */}
            <div className="space-y-2">
              <Label htmlFor="maxOrder">Max Min Order Quantity</Label>
              <Input
                id="maxOrder"
                type="number"
                placeholder="e.g., 5000"
                value={filters.max_min_order_quantity || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFilters((prev: SearchSuppliersInput) => ({
                    ...prev,
                    max_min_order_quantity: e.target.value ? parseInt(e.target.value) : undefined
                  }))
                }
              />
            </div>

            {/* Max Delivery Time */}
            <div className="space-y-2">
              <Label htmlFor="deliveryTime">Max Delivery Time (days)</Label>
              <Input
                id="deliveryTime"
                type="number"
                placeholder="e.g., 30"
                value={filters.delivery_time_max_days || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFilters((prev: SearchSuppliersInput) => ({
                    ...prev,
                    delivery_time_max_days: e.target.value ? parseInt(e.target.value) : undefined
                  }))
                }
              />
            </div>

            {/* Personalization Required */}
            <div className="space-y-2">
              <Label>Personalization</Label>
              <Select
                value={filters.personalization_required?.toString() || 'any'}
                onValueChange={(value: string) =>
                  setFilters((prev: SearchSuppliersInput) => ({
                    ...prev,
                    personalization_required: value === 'any' ? undefined : value === 'true'
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="true">Required</SelectItem>
                  <SelectItem value="false">Not Required</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Packaging Types */}
            <div className="space-y-2 md:col-span-2">
              <Label>Packaging Types</Label>
              <div className="flex flex-wrap gap-2">
                {packagingTypes.map((type: PackagingType) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={`pkg-${type}`}
                      checked={filters.packaging_types?.includes(type) || false}
                      onCheckedChange={(checked: boolean) =>
                        setFilters((prev: SearchSuppliersInput) => ({
                          ...prev,
                          packaging_types: checked
                            ? [...(prev.packaging_types || []), type]
                            : (prev.packaging_types || []).filter(t => t !== type)
                        }))
                      }
                    />
                    <label
                      htmlFor={`pkg-${type}`}
                      className="text-sm font-medium capitalize cursor-pointer"
                    >
                      {type.replace('_', ' ')}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Materials */}
            <div className="space-y-2 md:col-span-2">
              <Label>Materials</Label>
              <div className="flex flex-wrap gap-2">
                {materialTypes.map((material: MaterialType) => (
                  <div key={material} className="flex items-center space-x-2">
                    <Checkbox
                      id={`mat-${material}`}
                      checked={filters.materials?.includes(material) || false}
                      onCheckedChange={(checked: boolean) =>
                        setFilters((prev: SearchSuppliersInput) => ({
                          ...prev,
                          materials: checked
                            ? [...(prev.materials || []), material]
                            : (prev.materials || []).filter(m => m !== material)
                        }))
                      }
                    />
                    <label
                      htmlFor={`mat-${material}`}
                      className="text-sm font-medium capitalize cursor-pointer"
                    >
                      {material.replace('_', ' ')}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <Button onClick={loadSuppliers} disabled={isLoading}>
              {isLoading ? 'Searching...' : 'Search Suppliers'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">
          {suppliers.length > 0 ? `Found ${suppliers.length} suppliers` : 'No suppliers found'}
        </h3>

        {suppliers.map((supplier: SupplierWithProfile) => (
          <Card key={supplier.id} className="relative">
            <div className="absolute top-4 right-4">
              <Checkbox
                checked={selectedSuppliers.includes(supplier.id)}
                onCheckedChange={() => handleSupplierSelect(supplier.id)}
              />
            </div>

            <CardHeader>
              <div className="flex justify-between items-start pr-8">
                <div>
                  <CardTitle className="text-xl">{supplier.company_name}</CardTitle>
                  <p className="text-gray-600 mt-1">{supplier.contact_person}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{supplier.location}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span className="font-medium">{supplier.profile.rating}</span>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <p className="text-gray-700 mb-4">{supplier.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Packaging Types */}
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Packaging Types
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {supplier.profile.packaging_types.map((type: PackagingType) => (
                      <Badge key={type} variant="secondary" className="text-xs capitalize">
                        {type.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Materials */}
                <div>
                  <h4 className="font-medium mb-2">Materials</h4>
                  <div className="flex flex-wrap gap-1">
                    {supplier.profile.materials.map((material: MaterialType) => (
                      <Badge key={material} variant="outline" className="text-xs capitalize">
                        {material.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Order Details */}
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Order Details
                  </h4>
                  <div className="text-sm space-y-1">
                    <p>Min Order: {supplier.profile.min_order_quantity.toLocaleString()} units</p>
                    {supplier.profile.price_range_min && supplier.profile.price_range_max && (
                      <p>Price: ${supplier.profile.price_range_min.toFixed(2)} - ${supplier.profile.price_range_max.toFixed(2)}</p>
                    )}
                    <p>Personalization: {supplier.profile.personalization_available ? '✅ Available' : '❌ Not available'}</p>
                  </div>
                </div>

                {/* Delivery & Certifications */}
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Delivery & Quality
                  </h4>
                  <div className="text-sm space-y-1">
                    <p>Delivery: {supplier.profile.delivery_time_days} days</p>
                    {supplier.profile.certifications.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <Award className="w-3 h-3" />
                        <div className="flex flex-wrap gap-1">
                          {supplier.profile.certifications.map((cert: CertificationType) => (
                            <Badge key={cert} variant="outline" className="text-xs uppercase">
                              {cert.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  Member since {supplier.created_at.getFullYear()}
                </div>
                <div className="space-x-2">
                  <Button variant="outline" size="sm">
                    View Profile
                  </Button>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    Send Message
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {suppliers.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No suppliers match your current filters.</p>
            <p className="text-gray-400 text-sm mt-2">Try adjusting your search criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}