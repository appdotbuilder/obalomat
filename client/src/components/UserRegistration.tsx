import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Package, User, Building, ArrowLeft } from 'lucide-react';
import { trpc } from '@/utils/trpc';

// Import types
import type { CreateUserInput, User as UserType, UserRole } from '../../../server/src/schema';

interface UserRegistrationProps {
  onRegistrationComplete: (user: UserType) => void;
  onBackToLogin: () => void;
}

export default function UserRegistration({ onRegistrationComplete, onBackToLogin }: UserRegistrationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'role' | 'details'>('role');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const [formData, setFormData] = useState<Omit<CreateUserInput, 'password_hash'> & { password: string; confirmPassword: string }>({
    email: '',
    password: '',
    confirmPassword: '',
    company_name: '',
    contact_person: '',
    phone: null,
    role: 'buyer',
    location: '',
    description: null,
    website: null
  });

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setFormData((prev: Omit<CreateUserInput, 'password_hash'> & { password: string; confirmPassword: string }) => ({
      ...prev,
      role
    }));
    setStep('details');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }

    if (formData.password.length < 6) {
      alert('Password must be at least 6 characters long!');
      return;
    }

    setIsLoading(true);
    try {
      const input: CreateUserInput = {
        email: formData.email,
        password_hash: formData.password, // In real app, this would be hashed on the server
        company_name: formData.company_name,
        contact_person: formData.contact_person,
        phone: formData.phone || null,
        role: formData.role,
        location: formData.location,
        description: formData.description || null,
        website: formData.website || null
      };

      // Call actual tRPC endpoint
      const newUser = await trpc.createUser.mutate(input);

      // For demo purposes, create a mock user response
      const mockUser: UserType = {
        id: Date.now(), // Mock ID
        email: input.email,
        password_hash: 'hashed_password',
        company_name: input.company_name,
        contact_person: input.contact_person,
        phone: input.phone,
        role: input.role,
        location: input.location,
        description: input.description,
        website: input.website,
        created_at: new Date(),
        updated_at: new Date()
      };

      onRegistrationComplete(mockUser);
    } catch (error) {
      console.error('Registration failed:', error);
      alert('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'role') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Join Obalomat</CardTitle>
            <p className="text-gray-600">Choose your account type to get started</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center text-sm text-gray-500 mb-6">
              🚧 Demo Mode - Registration uses stub backend responses
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Buyer Option */}
              <div 
                className="border-2 border-gray-200 rounded-lg p-6 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors group"
                onClick={() => handleRoleSelect('buyer')}
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200">
                    <User className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">I'm a Buyer</h3>
                  <p className="text-gray-600 mb-4">Looking for packaging suppliers for my business</p>
                  <Badge variant="outline" className="mb-4">🛒 Buyer Account</Badge>
                  <div className="text-left space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                      Search and filter suppliers
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                      Send bulk inquiries
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                      Compare quotes and ratings
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                      Direct messaging with suppliers
                    </div>
                  </div>
                </div>
              </div>

              {/* Supplier Option */}
              <div 
                className="border-2 border-gray-200 rounded-lg p-6 cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors group"
                onClick={() => handleRoleSelect('supplier')}
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200">
                    <Building className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">I'm a Supplier</h3>
                  <p className="text-gray-600 mb-4">Offering packaging solutions to businesses</p>
                  <Badge variant="outline" className="mb-4">📦 Supplier Account</Badge>
                  <div className="text-left space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                      Create detailed company profile
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                      Receive and respond to inquiries
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                      Send quotes to potential clients
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                      Build reputation through ratings
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <Button variant="link" onClick={onBackToLogin}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setStep('role')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <CardTitle className="flex items-center gap-2">
                {selectedRole === 'buyer' ? (
                  <>
                    <User className="w-5 h-5 text-blue-600" />
                    Create Buyer Account
                  </>
                ) : (
                  <>
                    <Building className="w-5 h-5 text-green-600" />
                    Create Supplier Account
                  </>
                )}
              </CardTitle>
              <p className="text-gray-600 mt-1">Fill in your company details below</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
            <span className="text-yellow-800 text-sm">
              🚧 Demo Mode - Registration will succeed but uses mock backend data
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: Omit<CreateUserInput, 'password_hash'> & { password: string; confirmPassword: string }) => ({
                      ...prev,
                      email: e.target.value
                    }))
                  }
                  required
                  placeholder="company@example.com"
                />
              </div>

              {/* Company Name */}
              <div className="space-y-2">
                <Label htmlFor="company">Company Name *</Label>
                <Input
                  id="company"
                  value={formData.company_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: Omit<CreateUserInput, 'password_hash'> & { password: string; confirmPassword: string }) => ({
                      ...prev,
                      company_name: e.target.value
                    }))
                  }
                  required
                  placeholder="Your Company Ltd."
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: Omit<CreateUserInput, 'password_hash'> & { password: string; confirmPassword: string }) => ({
                      ...prev,
                      password: e.target.value
                    }))
                  }
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                />
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password *</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: Omit<CreateUserInput, 'password_hash'> & { password: string; confirmPassword: string }) => ({
                      ...prev,
                      confirmPassword: e.target.value
                    }))
                  }
                  required
                  minLength={6}
                  placeholder="Repeat your password"
                />
              </div>

              {/* Contact Person */}
              <div className="space-y-2">
                <Label htmlFor="contact">Contact Person *</Label>
                <Input
                  id="contact"
                  value={formData.contact_person}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: Omit<CreateUserInput, 'password_hash'> & { password: string; confirmPassword: string }) => ({
                      ...prev,
                      contact_person: e.target.value
                    }))
                  }
                  required
                  placeholder="John Smith"
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: Omit<CreateUserInput, 'password_hash'> & { password: string; confirmPassword: string }) => ({
                      ...prev,
                      phone: e.target.value || null
                    }))
                  }
                  placeholder="+1-555-123-4567"
                />
              </div>

              {/* Location */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: Omit<CreateUserInput, 'password_hash'> & { password: string; confirmPassword: string }) => ({
                      ...prev,
                      location: e.target.value
                    }))
                  }
                  required
                  placeholder="New York, USA"
                />
              </div>

              {/* Website */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: Omit<CreateUserInput, 'password_hash'> & { password: string; confirmPassword: string }) => ({
                      ...prev,
                      website: e.target.value || null
                    }))
                  }
                  placeholder="https://your-company.com"
                />
              </div>

              {/* Description */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">
                  Company Description
                  {selectedRole === 'supplier' && <span className="text-green-600 ml-1">(Recommended for suppliers)</span>}
                </Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev: Omit<CreateUserInput, 'password_hash'> & { password: string; confirmPassword: string }) => ({
                      ...prev,
                      description: e.target.value || null
                    }))
                  }
                  placeholder={
                    selectedRole === 'buyer'
                      ? "Describe your business and what types of packaging you need..."
                      : "Describe your packaging solutions and what makes your company unique..."
                  }
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setStep('role')}>
                Back
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className={selectedRole === 'buyer' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}