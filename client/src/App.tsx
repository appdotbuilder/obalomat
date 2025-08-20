import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Search, MessageSquare, Star, Building, User as UserIcon } from 'lucide-react';

// Import components
import SupplierSearch from './components/SupplierSearch';
import InquiryManagement from './components/InquiryManagement';
import UserProfile from './components/UserProfile';
import UserRegistration from './components/UserRegistration';
import MessagingCenter from './components/MessagingCenter';
import RatingSystem from './components/RatingSystem';

// Import types
import type { User, UserRole } from '../../server/src/schema';

function App() {
  // Mock current user - in real app this would come from authentication
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showRegistration, setShowRegistration] = useState(false);

  // Mock login for demo purposes
  const handleMockLogin = (role: UserRole) => {
    const mockUser: User = {
      id: role === 'buyer' ? 1 : 2,
      email: role === 'buyer' ? 'buyer@example.com' : 'supplier@example.com',
      password_hash: 'mock',
      company_name: role === 'buyer' ? 'ABC Manufacturing' : 'PackCorp Ltd',
      contact_person: role === 'buyer' ? 'John Smith' : 'Sarah Johnson',
      phone: '+1-555-0123',
      role,
      location: 'New York, USA',
      description: role === 'buyer' 
        ? 'Leading food manufacturer looking for sustainable packaging solutions'
        : 'Premium packaging supplier with 20+ years experience',
      website: role === 'buyer' ? 'https://abc-manufacturing.com' : 'https://packcorp.com',
      created_at: new Date('2023-01-01'),
      updated_at: new Date()
    };
    setCurrentUser(mockUser);
    setShowRegistration(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleRegistrationComplete = (user: User) => {
    setCurrentUser(user);
    setShowRegistration(false);
  };

  if (showRegistration) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
        <UserRegistration 
          onRegistrationComplete={handleRegistrationComplete}
          onBackToLogin={() => setShowRegistration(false)}
        />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Welcome to Obalomat</CardTitle>
            <p className="text-gray-600">Connecting packaging buyers with suppliers</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-sm text-gray-500 mb-4">
              🚧 Demo Mode - Using stub data from backend
            </div>
            <Button 
              onClick={() => handleMockLogin('buyer')} 
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              <UserIcon className="w-4 h-4 mr-2" />
              Continue as Buyer
            </Button>
            <Button 
              onClick={() => handleMockLogin('supplier')} 
              variant="outline" 
              className="w-full"
              size="lg"
            >
              <Building className="w-4 h-4 mr-2" />
              Continue as Supplier
            </Button>
            <div className="text-center">
              <Button 
                variant="link" 
                onClick={() => setShowRegistration(true)}
                className="text-sm"
              >
                New user? Register here
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-8 h-8 text-green-600" />
            <h1 className="text-2xl font-bold text-gray-900">Obalomat</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-sm">
              {currentUser.role === 'buyer' ? '🛒 Buyer' : '📦 Supplier'}
            </Badge>
            <span className="text-sm font-medium">{currentUser.company_name}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4">
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-800">
            <span className="text-lg">🚧</span>
            <strong>Demo Mode:</strong>
            <span>Backend handlers are using stub data. All functionality is connected but returns placeholder responses.</span>
          </div>
        </div>

        <Tabs defaultValue={currentUser.role === 'buyer' ? 'search' : 'inquiries'} className="w-full">
          <TabsList className="grid w-full grid-cols-5 lg:grid-cols-6">
            {currentUser.role === 'buyer' && (
              <TabsTrigger value="search" className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">Find Suppliers</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="inquiries" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Inquiries</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Messages</span>
            </TabsTrigger>
            <TabsTrigger value="ratings" className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              <span className="hidden sm:inline">Ratings</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
          </TabsList>

          {currentUser.role === 'buyer' && (
            <TabsContent value="search" className="mt-6">
              <SupplierSearch currentUser={currentUser} />
            </TabsContent>
          )}

          <TabsContent value="inquiries" className="mt-6">
            <InquiryManagement currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="messages" className="mt-6">
            <MessagingCenter currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="ratings" className="mt-6">
            <RatingSystem currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="profile" className="mt-6">
            <UserProfile currentUser={currentUser} onUserUpdate={setCurrentUser} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default App;