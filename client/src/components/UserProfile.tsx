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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Building, Phone, MapPin, Globe, FileText, Package, Award } from 'lucide-react';
import { trpc } from '@/utils/trpc';

// Import types
import type { 
  User as UserType, 
  SupplierProfile, 
  UpdateUserInput, 
  CreateSupplierProfileInput,
  UpdateSupplierProfileInput,
  PackagingType, 
  MaterialType, 
  CertificationType 
} from '../../../server/src/schema';

interface UserProfileProps {
  currentUser: UserType;
  onUserUpdate: (user: UserType) => void;
}

export default function UserProfile({ currentUser, onUserUpdate }: UserProfileProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [supplierProfile, setSupplierProfile] = useState<SupplierProfile | null>(null);

  // User profile form state
  const [userForm, setUserForm] = useState<Omit<UpdateUserInput, 'id'>>({
    company_name: currentUser.company_name,
    contact_person: currentUser.contact_person,
    phone: currentUser.phone,
    location: currentUser.location,
    description: currentUser.description,
    website: currentUser.website
  });

  // Supplier profile form state
  const [supplierForm, setSupplierForm] = useState<{
    packaging_types: PackagingType[];
    materials: MaterialType[];
    min_order_quantity: number;
    personalization_available: boolean;
    price_range_min: number | null;
    price_range_max: number | null;
    delivery_time_days: number;
    certifications: CertificationType[];
  }>({
    packaging_types: [],
    materials: [],
    min_order_quantity: 1000,
    personalization_available: false,
    price_range_min: null,
    price_range_max: null,
    delivery_time_days: 14,
    certifications: []
  });

  // Mock supplier profile data for demo
  const mockSupplierProfile: SupplierProfile = {
    id: 1,
    user_id: currentUser.id,
    packaging_types: ['boxes', 'bags', 'containers'],
    materials: ['cardboard', 'biodegradable', 'recyclable'],
    min_order_quantity: 1000,
    personalization_available: true,
    price_range_min: 0.15,
    price_range_max: 2.50,
    delivery_time_days: 14,
    certifications: ['fsc', 'iso14001'],
    created_at: new Date('2023-06-01'),
    updated_at: new Date('2024-01-01')
  };

  const loadSupplierProfile = useCallback(async () => {
    if (currentUser.role !== 'supplier') return;
    
    setIsLoading(true);
    try {
      // In real app, would call tRPC to get supplier profile
      // For demo, use mock data
      if (currentUser.role === 'supplier') {
        setSupplierProfile(mockSupplierProfile);
        setSupplierForm({
          packaging_types: mockSupplierProfile.packaging_types,
          materials: mockSupplierProfile.materials,
          min_order_quantity: mockSupplierProfile.min_order_quantity,
          personalization_available: mockSupplierProfile.personalization_available,
          price_range_min: mockSupplierProfile.price_range_min,
          price_range_max: mockSupplierProfile.price_range_max,
          delivery_time_days: mockSupplierProfile.delivery_time_days,
          certifications: mockSupplierProfile.certifications
        });
      }
    } catch (error) {
      console.error('Failed to load supplier profile:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadSupplierProfile();
  }, [loadSupplierProfile]);

  const handleUpdateUserProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const input: UpdateUserInput = {
        id: currentUser.id,
        ...userForm
      };

      // Call actual tRPC endpoint
      await trpc.updateUserProfile.mutate(input);

      // Update local state for demo
      const updatedUser: UserType = {
        ...currentUser,
        ...userForm
      };
      onUserUpdate(updatedUser);

      alert('✅ Profile updated successfully!');
    } catch (error) {
      console.error('Failed to update user profile:', error);
      alert('❌ Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSupplierProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (supplierProfile) {
        // Update existing profile
        const input: UpdateSupplierProfileInput = {
          id: supplierProfile.id,
          packaging_types: supplierForm.packaging_types.length > 0 ? supplierForm.packaging_types : undefined,
          materials: supplierForm.materials.length > 0 ? supplierForm.materials : undefined,
          min_order_quantity: supplierForm.min_order_quantity,
          personalization_available: supplierForm.personalization_available,
          price_range_min: supplierForm.price_range_min,
          price_range_max: supplierForm.price_range_max,
          delivery_time_days: supplierForm.delivery_time_days,
          certifications: supplierForm.certifications.length > 0 ? supplierForm.certifications : undefined
        };
        await trpc.updateSupplierProfile.mutate(input);
      } else {
        // Create new profile
        const input: CreateSupplierProfileInput = {
          user_id: currentUser.id,
          packaging_types: supplierForm.packaging_types,
          materials: supplierForm.materials,
          min_order_quantity: supplierForm.min_order_quantity,
          personalization_available: supplierForm.personalization_available,
          price_range_min: supplierForm.price_range_min,
          price_range_max: supplierForm.price_range_max,
          delivery_time_days: supplierForm.delivery_time_days,
          certifications: supplierForm.certifications
        };
        await trpc.createSupplierProfile.mutate(input);
      }

      // Update local state for demo
      const updatedProfile: SupplierProfile = {
        id: supplierProfile?.id || Date.now(),
        user_id: currentUser.id,
        ...supplierForm,
        created_at: supplierProfile?.created_at || new Date(),
        updated_at: new Date()
      };
      setSupplierProfile(updatedProfile);

      alert('✅ Supplier profile updated successfully!');
    } catch (error) {
      console.error('Failed to update supplier profile:', error);
      alert('❌ Failed to update supplier profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const packagingTypes: PackagingType[] = ['boxes', 'bottles', 'bags', 'containers', 'labels', 'pouches', 'tubes', 'cans', 'jars', 'wrapping', 'other'];
  const materialTypes: MaterialType[] = ['cardboard', 'plastic', 'glass', 'metal', 'paper', 'fabric', 'wood', 'biodegradable', 'recyclable', 'compostable', 'other'];
  const certificationTypes: CertificationType[] = ['fsc', 'pefc', 'iso14001', 'iso9001', 'brc', 'fda', 'eu_organic', 'cradle_to_cradle', 'other'];

  const handlePackagingTypeChange = (type: PackagingType, checked: boolean) => {
    setSupplierForm(prev => ({
      ...prev,
      packaging_types: checked
        ? [...(prev.packaging_types || []), type]
        : (prev.packaging_types || []).filter(t => t !== type)
    }));
  };

  const handleMaterialChange = (material: MaterialType, checked: boolean) => {
    setSupplierForm(prev => ({
      ...prev,
      materials: checked
        ? [...(prev.materials || []), material]
        : (prev.materials || []).filter(m => m !== material)
    }));
  };

  const handleCertificationChange = (cert: CertificationType, checked: boolean) => {
    setSupplierForm(prev => ({
      ...prev,
      certifications: checked
        ? [...(prev.certifications || []), cert]
        : (prev.certifications || []).filter(c => c !== cert)
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <User className="w-6 h-6" />
        <h2 className="text-2xl font-bold">Profile Settings</h2>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList>
          <TabsTrigger value="general">General Information</TabsTrigger>
          {currentUser.role === 'supplier' && (
            <TabsTrigger value="supplier">Supplier Details</TabsTrigger>
          )}
        </TabsList>

        {/* General Profile Tab */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateUserProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Company Name */}
                  <div className="space-y-2">
                    <Label htmlFor="company-name">
                      <Building className="w-4 h-4 inline mr-2" />
                      Company Name
                    </Label>
                    <Input
                      id="company-name"
                      value={userForm.company_name || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setUserForm((prev: Omit<UpdateUserInput, 'id'>) => ({
                          ...prev,
                          company_name: e.target.value
                        }))
                      }
                      required
                    />
                  </div>

                  {/* Contact Person */}
                  <div className="space-y-2">
                    <Label htmlFor="contact-person">
                      <User className="w-4 h-4 inline mr-2" />
                      Contact Person
                    </Label>
                    <Input
                      id="contact-person"
                      value={userForm.contact_person || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setUserForm((prev: Omit<UpdateUserInput, 'id'>) => ({
                          ...prev,
                          contact_person: e.target.value
                        }))
                      }
                      required
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      <Phone className="w-4 h-4 inline mr-2" />
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      value={userForm.phone || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setUserForm((prev: Omit<UpdateUserInput, 'id'>) => ({
                          ...prev,
                          phone: e.target.value || null
                        }))
                      }
                    />
                  </div>

                  {/* Location */}
                  <div className="space-y-2">
                    <Label htmlFor="location">
                      <MapPin className="w-4 h-4 inline mr-2" />
                      Location
                    </Label>
                    <Input
                      id="location"
                      value={userForm.location || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setUserForm((prev: Omit<UpdateUserInput, 'id'>) => ({
                          ...prev,
                          location: e.target.value
                        }))
                      }
                      required
                    />
                  </div>

                  {/* Website */}
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="website">
                      <Globe className="w-4 h-4 inline mr-2" />
                      Website (optional)
                    </Label>
                    <Input
                      id="website"
                      type="url"
                      value={userForm.website || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setUserForm((prev: Omit<UpdateUserInput, 'id'>) => ({
                          ...prev,
                          website: e.target.value || null
                        }))
                      }
                      placeholder="https://your-website.com"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="description">
                      <FileText className="w-4 h-4 inline mr-2" />
                      Company Description
                    </Label>
                    <Textarea
                      id="description"
                      value={userForm.description || ''}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setUserForm((prev: Omit<UpdateUserInput, 'id'>) => ({
                          ...prev,
                          description: e.target.value || null
                        }))
                      }
                      placeholder="Describe your company and what you do..."
                      rows={4}
                    />
                  </div>
                </div>

                <Separator />

                <div className="flex justify-end">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Supplier Profile Tab */}
        {currentUser.role === 'supplier' && (
          <TabsContent value="supplier">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Supplier Profile
                </CardTitle>
                <p className="text-gray-600">
                  Complete your supplier profile to help buyers find you
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateSupplierProfile} className="space-y-6">
                  {/* Packaging Types */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Packaging Types Offered</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {packagingTypes.map((type: PackagingType) => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox
                            id={`pkg-${type}`}
                            checked={(supplierForm.packaging_types || []).includes(type)}
                            onCheckedChange={(checked: boolean) => handlePackagingTypeChange(type, checked)}
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

                  <Separator />

                  {/* Materials */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Materials</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {materialTypes.map((material: MaterialType) => (
                        <div key={material} className="flex items-center space-x-2">
                          <Checkbox
                            id={`mat-${material}`}
                            checked={(supplierForm.materials || []).includes(material)}
                            onCheckedChange={(checked: boolean) => handleMaterialChange(material, checked)}
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

                  <Separator />

                  {/* Order & Pricing Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="min-order">Minimum Order Quantity</Label>
                      <Input
                        id="min-order"
                        type="number"
                        min="1"
                        value={supplierForm.min_order_quantity}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setSupplierForm(prev => ({
                            ...prev,
                            min_order_quantity: parseInt(e.target.value) || 1
                          }))
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="delivery-time">Delivery Time (days)</Label>
                      <Input
                        id="delivery-time"
                        type="number"
                        min="1"
                        value={supplierForm.delivery_time_days}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setSupplierForm(prev => ({
                            ...prev,
                            delivery_time_days: parseInt(e.target.value) || 1
                          }))
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="price-min">Price Range Min ($)</Label>
                      <Input
                        id="price-min"
                        type="number"
                        min="0"
                        step="0.01"
                        value={supplierForm.price_range_min || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setSupplierForm(prev => ({
                            ...prev,
                            price_range_min: e.target.value ? parseFloat(e.target.value) : null
                          }))
                        }
                        placeholder="0.50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="price-max">Price Range Max ($)</Label>
                      <Input
                        id="price-max"
                        type="number"
                        min="0"
                        step="0.01"
                        value={supplierForm.price_range_max || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setSupplierForm(prev => ({
                            ...prev,
                            price_range_max: e.target.value ? parseFloat(e.target.value) : null
                          }))
                        }
                        placeholder="5.00"
                      />
                    </div>
                  </div>

                  {/* Personalization */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="personalization-available"
                      checked={supplierForm.personalization_available}
                      onCheckedChange={(checked: boolean) =>
                        setSupplierForm(prev => ({
                          ...prev,
                          personalization_available: checked
                        }))
                      }
                    />
                    <Label htmlFor="personalization-available" className="font-medium">
                      We offer personalization/customization services
                    </Label>
                  </div>

                  <Separator />

                  {/* Certifications */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      Certifications
                    </Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {certificationTypes.map((cert: CertificationType) => (
                        <div key={cert} className="flex items-center space-x-2">
                          <Checkbox
                            id={`cert-${cert}`}
                            checked={(supplierForm.certifications || []).includes(cert)}
                            onCheckedChange={(checked: boolean) => handleCertificationChange(cert, checked)}
                          />
                          <label
                            htmlFor={`cert-${cert}`}
                            className="text-sm font-medium uppercase cursor-pointer"
                          >
                            {cert.replace('_', ' ')}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-end">
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? 'Saving...' : supplierProfile ? 'Update Supplier Profile' : 'Create Supplier Profile'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}