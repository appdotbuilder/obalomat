import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Star, Plus, ThumbsUp, MessageSquare, Award } from 'lucide-react';
import { trpc } from '@/utils/trpc';

// Import types
import type { User, Rating, CreateRatingInput } from '../../../server/src/schema';

// Mock rating data (since backend returns stubs)
const mockRatings: (Rating & { rater_name?: string; rated_name?: string })[] = [
  {
    id: 1,
    rater_id: 1,
    rated_id: 2,
    inquiry_id: 1,
    rating: 5,
    comment: 'Excellent supplier! EcoPack Solutions delivered exactly what we needed with outstanding quality. The FSC-certified boxes were perfect for our luxury products, and the custom printing exceeded our expectations. Great communication throughout the process.',
    created_at: new Date('2024-01-16'),
    rater_name: 'ABC Manufacturing',
    rated_name: 'EcoPack Solutions'
  },
  {
    id: 2,
    rater_id: 2,
    rated_id: 1,
    inquiry_id: 1,
    rating: 5,
    comment: 'Fantastic buyer to work with! ABC Manufacturing was very clear about their requirements, responsive to communication, and paid promptly. Their feedback helped us deliver the perfect solution. Would love to work with them again.',
    created_at: new Date('2024-01-18'),
    rater_name: 'EcoPack Solutions',
    rated_name: 'ABC Manufacturing'
  },
  {
    id: 3,
    rater_id: 3,
    rated_id: 1,
    inquiry_id: 2,
    rating: 4,
    comment: 'Good experience overall. ABC Manufacturing knew exactly what they wanted for their glass bottles. The only minor issue was some delays in decision-making, but once finalized, everything went smoothly. Professional buyer.',
    created_at: new Date('2024-01-22'),
    rater_name: 'Premium Glass Co',
    rated_name: 'ABC Manufacturing'
  },
  {
    id: 4,
    rater_id: 1,
    rated_id: 3,
    inquiry_id: 2,
    rating: 4,
    comment: 'Premium Glass Co provided great quality bottles and competitive pricing. Delivery was slightly delayed but they kept us informed. The bottles were exactly as specified and our customers love them. Good supplier overall.',
    created_at: new Date('2024-01-25'),
    rater_name: 'ABC Manufacturing',
    rated_name: 'Premium Glass Co'
  }
];

interface RatingSystemProps {
  currentUser: User;
}

export default function RatingSystem({ currentUser }: RatingSystemProps) {
  const [ratings, setRatings] = useState<(Rating & { rater_name?: string; rated_name?: string })[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'received' | 'given'>('received');

  // Form state for new rating
  const [ratingForm, setRatingForm] = useState<Omit<CreateRatingInput, 'rater_id'>>({
    rated_id: 0,
    inquiry_id: null,
    rating: 5,
    comment: ''
  });
  const [hoveredRating, setHoveredRating] = useState(0);

  const loadRatings = useCallback(async () => {
    setIsLoading(true);
    try {
      // Call actual tRPC endpoint (will return empty array from stub)
      await trpc.getRatingsForUser.query({ userId: currentUser.id });
      
      // Use mock data for demo - show ratings for current user
      setRatings(mockRatings);
    } catch (error) {
      console.error('Failed to load ratings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadRatings();
  }, [loadRatings]);

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const input: CreateRatingInput = {
        ...ratingForm,
        rater_id: currentUser.id
      };

      // Call actual tRPC endpoint
      await trpc.createRating.mutate(input);

      // Mock successful creation for demo
      const newRating: Rating & { rater_name?: string; rated_name?: string } = {
        id: Date.now(),
        ...input,
        created_at: new Date(),
        rater_name: currentUser.company_name,
        rated_name: 'Rated Company' // Would be fetched in real app
      };

      setRatings((prev: (Rating & { rater_name?: string; rated_name?: string })[]) => [newRating, ...prev]);
      setShowRatingDialog(false);
      setRatingForm({
        rated_id: 0,
        inquiry_id: null,
        rating: 5,
        comment: ''
      });
      
      alert('✅ Rating submitted successfully!');
    } catch (error) {
      console.error('Failed to submit rating:', error);
      alert('❌ Failed to submit rating. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStars = (rating: number, interactive = false, size = 'w-5 h-5') => {
    return [...Array(5)].map((_, index) => (
      <Star
        key={index}
        className={`${size} cursor-pointer transition-colors ${
          index < rating ? 'text-yellow-500 fill-current' : 'text-gray-300'
        }`}
        onClick={interactive ? () => setRatingForm((prev: Omit<CreateRatingInput, 'rater_id'>) => ({ ...prev, rating: index + 1 })) : undefined}
        onMouseEnter={interactive ? () => setHoveredRating(index + 1) : undefined}
        onMouseLeave={interactive ? () => setHoveredRating(0) : undefined}
      />
    ));
  };

  const receivedRatings = ratings.filter(r => r.rated_id === currentUser.id);
  const givenRatings = ratings.filter(r => r.rater_id === currentUser.id);

  const averageRating = receivedRatings.length > 0 
    ? receivedRatings.reduce((sum, r) => sum + r.rating, 0) / receivedRatings.length 
    : 0;

  const ratingDistribution = {
    5: receivedRatings.filter(r => r.rating === 5).length,
    4: receivedRatings.filter(r => r.rating === 4).length,
    3: receivedRatings.filter(r => r.rating === 3).length,
    2: receivedRatings.filter(r => r.rating === 2).length,
    1: receivedRatings.filter(r => r.rating === 1).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Ratings & Reviews</h2>
        <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
          <DialogTrigger asChild>
            <Button className="bg-yellow-600 hover:bg-yellow-700">
              <Plus className="w-4 h-4 mr-2" />
              Leave Rating
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Rate Your Experience</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitRating} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rated-user">User ID to Rate</Label>
                <input
                  id="rated-user"
                  type="number"
                  className="w-full px-3 py-2 border rounded-md"
                  value={ratingForm.rated_id || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setRatingForm((prev: Omit<CreateRatingInput, 'rater_id'>) => ({
                      ...prev,
                      rated_id: parseInt(e.target.value) || 0
                    }))
                  }
                  required
                  placeholder="Enter user ID to rate"
                />
                <p className="text-xs text-gray-500">
                  🚧 Demo: In a real app, this would be a user/company selector
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="inquiry-id">Related Inquiry (optional)</Label>
                <input
                  id="inquiry-id"
                  type="number"
                  className="w-full px-3 py-2 border rounded-md"
                  value={ratingForm.inquiry_id || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setRatingForm((prev: Omit<CreateRatingInput, 'rater_id'>) => ({
                      ...prev,
                      inquiry_id: e.target.value ? parseInt(e.target.value) : null
                    }))
                  }
                  placeholder="Enter inquiry ID if applicable"
                />
              </div>

              <div className="space-y-2">
                <Label>Rating</Label>
                <div className="flex items-center gap-1">
                  {renderStars(hoveredRating || ratingForm.rating, true)}
                  <span className="ml-2 text-sm text-gray-600">
                    {hoveredRating || ratingForm.rating}/5
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment">Comment (optional)</Label>
                <Textarea
                  id="comment"
                  value={ratingForm.comment || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setRatingForm((prev: Omit<CreateRatingInput, 'rater_id'>) => ({
                      ...prev,
                      comment: e.target.value || null
                    }))
                  }
                  placeholder="Share your experience..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowRatingDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Submitting...' : 'Submit Rating'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Rating Overview */}
      {receivedRatings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              Your Rating Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Average Rating */}
              <div className="text-center">
                <div className="text-4xl font-bold text-yellow-600 mb-2">
                  {averageRating.toFixed(1)}
                </div>
                <div className="flex justify-center mb-2">
                  {renderStars(Math.round(averageRating))}
                </div>
                <p className="text-gray-600">
                  Based on {receivedRatings.length} review{receivedRatings.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Rating Distribution */}
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map(rating => (
                  <div key={rating} className="flex items-center gap-2">
                    <span className="text-sm w-3">{rating}</span>
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-500 h-2 rounded-full transition-all"
                        style={{
                          width: receivedRatings.length > 0
                            ? `${(ratingDistribution[rating as keyof typeof ratingDistribution] / receivedRatings.length) * 100}%`
                            : '0%'
                        }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-8">
                      {ratingDistribution[rating as keyof typeof ratingDistribution]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rating Tabs */}
      <Card>
        <CardHeader>
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <Button
              variant={activeTab === 'received' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('received')}
              className="flex-1"
              size="sm"
            >
              <ThumbsUp className="w-4 h-4 mr-2" />
              Received ({receivedRatings.length})
            </Button>
            <Button
              variant={activeTab === 'given' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('given')}
              className="flex-1"
              size="sm"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Given ({givenRatings.length})
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activeTab === 'received' && (
              <>
                {receivedRatings.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Star className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No ratings received yet</p>
                    <p className="text-sm">Complete some transactions to start building your reputation!</p>
                  </div>
                ) : (
                  receivedRatings.map((rating: Rating & { rater_name?: string; rated_name?: string }) => (
                    <Card key={rating.id} className="border border-gray-200">
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              {renderStars(rating.rating, false, 'w-4 h-4')}
                              <span className="font-medium">{rating.rating}/5</span>
                            </div>
                            <p className="text-sm text-gray-600">
                              From: <strong>{rating.rater_name || `User ${rating.rater_id}`}</strong>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">
                              {rating.created_at.toLocaleDateString()}
                            </p>
                            {rating.inquiry_id && (
                              <Badge variant="outline" className="text-xs mt-1">
                                Inquiry #{rating.inquiry_id}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {rating.comment && (
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-gray-700">{rating.comment}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </>
            )}

            {activeTab === 'given' && (
              <>
                {givenRatings.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No ratings given yet</p>
                    <Button
                      onClick={() => setShowRatingDialog(true)}
                      className="mt-4"
                      size="sm"
                    >
                      Leave Your First Rating
                    </Button>
                  </div>
                ) : (
                  givenRatings.map((rating: Rating & { rater_name?: string; rated_name?: string }) => (
                    <Card key={rating.id} className="border border-gray-200">
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              {renderStars(rating.rating, false, 'w-4 h-4')}
                              <span className="font-medium">{rating.rating}/5</span>
                            </div>
                            <p className="text-sm text-gray-600">
                              To: <strong>{rating.rated_name || `User ${rating.rated_id}`}</strong>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">
                              {rating.created_at.toLocaleDateString()}
                            </p>
                            {rating.inquiry_id && (
                              <Badge variant="outline" className="text-xs mt-1">
                                Inquiry #{rating.inquiry_id}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {rating.comment && (
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <p className="text-gray-700">{rating.comment}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}