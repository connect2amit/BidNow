export interface AuthResponse { accessToken: string; expiresAt: string; user: UserProfile; }
export interface UserProfile { id: string; email: string; displayName: string; profileImageUrl?: string; roles: string[]; sellerRatingAvg: number; sellerRatingCount: number; buyerRatingAvg: number; buyerRatingCount: number; isEmailVerified: boolean; createdAt: string; }
export interface RegisterRequest { email: string; password: string; displayName: string; roles: string[]; }
export interface LoginRequest { email: string; password: string; }
export interface SocialLoginRequest { provider: string; accessToken: string; displayName?: string; }
export interface Listing { id: string; title: string; description?: string; category: string; categoryId: number; condition: string; startingBidPrice: number; currentHighestBid?: number; minimumNextBid: number; totalBids: number; status: string; auctionEndsAt?: string; shippingCost: number; seller: SellerSummary; imageUrls: string[]; reserveMet: boolean; createdAt: string; }
export interface SellerSummary { id: string; displayName: string; profileImageUrl?: string; sellerRatingAvg: number; sellerRatingCount: number; }
export interface CreateListingRequest { title: string; description?: string; categoryId: number; condition: string; startingBidPrice: number; reservePrice?: number; duration: string; shippingCost: number; }
export interface ListingQueryParams { search?: string; categoryId?: number; status?: string; sortBy?: string; page?: number; pageSize?: number; }
export interface PagedResult<T> { items: T[]; totalCount: number; page: number; pageSize: number; totalPages: number; }
export interface Bid { id: string; listingId: string; buyerDisplayName: string; bidAmount: number; isWinning: boolean; placedAt: string; }
export interface PlaceBidRequest { listingId: string; bidAmount: number; idempotencyKey?: string; }
export interface Order { id: string; listingTitle: string; winningBidAmount: number; shippingCost: number; totalAmount: number; status: string; counterpartyName: string; trackingNumber?: string; carrier?: string; shippedAt?: string; completedAt?: string; canRate: boolean; createdAt: string; }
export interface ShipOrderRequest { trackingNumber: string; carrier: string; }
export interface CreateRatingRequest { orderId: string; ratingValue: number; reviewText?: string; }
export interface Notification { id: string; type: string; title: string; message: string; isRead: boolean; createdAt: string; }
export const CATEGORIES = [ { id: undefined, name: 'All' }, { id: 1, name: 'Electronics' }, { id: 2, name: 'Art & Collectibles' }, { id: 3, name: 'Fashion' }, { id: 4, name: 'Jewellery' }, { id: 5, name: 'Vehicles' }, { id: 6, name: 'Books' }, { id: 7, name: 'Sports' } ];
export const DURATIONS = ['1h','3h','6h','12h','24h','48h','72h','7d'];
export const CONDITIONS = ['New','LikeNew','Good','Fair','Poor'];
