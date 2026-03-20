using BidNow.Core.Enums;

namespace BidNow.Core.Entities;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = string.Empty;
    public string? PasswordHash { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string? ProfileImageUrl { get; set; }
    public string? Phone { get; set; }
    public string? Bio { get; set; }
    public bool IsEmailVerified { get; set; }
    public bool IsActive { get; set; } = true;
    public decimal SellerRatingAvg { get; set; }
    public int SellerRatingCount { get; set; }
    public decimal BuyerRatingAvg { get; set; }
    public int BuyerRatingCount { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<UserRole> Roles { get; set; } = new List<UserRole>();
    public ICollection<Listing> Listings { get; set; } = new List<Listing>();
    public ICollection<Bid> Bids { get; set; } = new List<Bid>();
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}

public class UserRole
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public RoleType Role { get; set; }
    public DateTime GrantedAt { get; set; } = DateTime.UtcNow;
}

public class RefreshToken
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string TokenHash { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public DateTime? RevokedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? IpAddress { get; set; }
    public bool IsExpired => DateTime.UtcNow >= ExpiresAt;
    public bool IsRevoked => RevokedAt.HasValue;
    public bool IsActive => !IsRevoked && !IsExpired;
}

public class Category
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public ICollection<Listing> Listings { get; set; } = new List<Listing>();
}

public class Listing
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SellerId { get; set; }
    public User Seller { get; set; } = null!;
    public int CategoryId { get; set; }
    public Category Category { get; set; } = null!;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ItemCondition Condition { get; set; }
    public decimal StartingBidPrice { get; set; }
    public decimal? ReservePrice { get; set; }
    public decimal? CurrentHighestBid { get; set; }
    public Guid? CurrentWinnerId { get; set; }
    public User? CurrentWinner { get; set; }
    public int TotalBids { get; set; }
    public ListingStatus Status { get; set; } = ListingStatus.Draft;
    public DateTime? AuctionStartsAt { get; set; }
    public DateTime? AuctionEndsAt { get; set; }
    public decimal ShippingCost { get; set; }
    public string? ShippingNotes { get; set; }
    public int ViewCount { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<ListingImage> Images { get; set; } = new List<ListingImage>();
    public ICollection<Bid> Bids { get; set; } = new List<Bid>();
    public Order? Order { get; set; }
    public decimal MinimumNextBid => CurrentHighestBid.HasValue
        ? CurrentHighestBid.Value + Math.Max(1m, Math.Round(CurrentHighestBid.Value * 0.01m, 2))
        : StartingBidPrice;
    public bool IsActive => Status == ListingStatus.Active && AuctionEndsAt > DateTime.UtcNow;
    public bool ReserveMet => !ReservePrice.HasValue || CurrentHighestBid >= ReservePrice;
}

public class ListingImage
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ListingId { get; set; }
    public Listing Listing { get; set; } = null!;
    public string ImageUrl { get; set; } = string.Empty;
    public string? S3Key { get; set; }
    public int SortOrder { get; set; }
    public bool IsPrimary { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Bid
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ListingId { get; set; }
    public Listing Listing { get; set; } = null!;
    public Guid BuyerId { get; set; }
    public User Buyer { get; set; } = null!;
    public decimal BidAmount { get; set; }
    public bool IsWinning { get; set; }
    public DateTime PlacedAt { get; set; } = DateTime.UtcNow;
    public string? IpAddress { get; set; }
    public string? IdempotencyKey { get; set; }
}

public class Order
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ListingId { get; set; }
    public Listing Listing { get; set; } = null!;
    public Guid BuyerId { get; set; }
    public User Buyer { get; set; } = null!;
    public Guid SellerId { get; set; }
    public User Seller { get; set; } = null!;
    public decimal WinningBidAmount { get; set; }
    public decimal ShippingCost { get; set; }
    public decimal TotalAmount { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.AwaitingPayment;
    public string? PaymentIntentId { get; set; }
    public DateTime? PaymentPaidAt { get; set; }
    public string? TrackingNumber { get; set; }
    public string? Carrier { get; set; }
    public DateTime? ShippedAt { get; set; }
    public DateTime? DeliveredAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? DisputeReason { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<Rating> Ratings { get; set; } = new List<Rating>();
}

public class Rating
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrderId { get; set; }
    public Order Order { get; set; } = null!;
    public Guid ReviewerId { get; set; }
    public User Reviewer { get; set; } = null!;
    public Guid RevieweeId { get; set; }
    public User Reviewee { get; set; } = null!;
    public int RatingValue { get; set; }
    public string? ReviewText { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Notification
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public NotificationType Type { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Payload { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
