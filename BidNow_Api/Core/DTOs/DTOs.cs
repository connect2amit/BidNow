namespace BidNow.Core.DTOs;

// ── Auth ──────────────────────────────────────────────────────
public record RegisterRequest(string Email, string Password, string DisplayName, List<string> Roles);
public record LoginRequest(string Email, string Password);
public record SocialLoginRequest(string Provider, string AccessToken, string? DisplayName);
public record AuthResponse(string AccessToken, string RefreshToken, DateTime ExpiresAt, UserProfileDto User);
public record ForgotPasswordRequest(string Email);
public record ResetPasswordRequest(string Token, string NewPassword);

// ── Users ─────────────────────────────────────────────────────
public record UserProfileDto(
    Guid Id, string Email, string DisplayName, string? ProfileImageUrl,
    List<string> Roles, decimal SellerRatingAvg, int SellerRatingCount,
    decimal BuyerRatingAvg, int BuyerRatingCount, bool IsEmailVerified, DateTime CreatedAt);

public record UpdateProfileRequest(string? DisplayName, string? Phone, string? Bio);

// ── Listings ──────────────────────────────────────────────────
public record CreateListingRequest(
    string Title, string? Description, int CategoryId, string Condition,
    decimal StartingBidPrice, decimal? ReservePrice, string Duration,
    decimal ShippingCost, string? ShippingNotes);

public record UpdateListingRequest(
    string? Title, string? Description, int? CategoryId,
    string? Condition, decimal? ReservePrice, decimal? ShippingCost, string? ShippingNotes);

public record ListingDto(
    Guid Id, string Title, string? Description, string Category, int CategoryId,
    string Condition, decimal StartingBidPrice, decimal? CurrentHighestBid,
    decimal MinimumNextBid, int TotalBids, string Status, DateTime? AuctionEndsAt,
    decimal ShippingCost, string? ShippingNotes, int ViewCount,
    SellerSummaryDto Seller, List<string> ImageUrls, bool ReserveMet, DateTime CreatedAt);

public record SellerSummaryDto(
    Guid Id, string DisplayName, string? ProfileImageUrl,
    decimal SellerRatingAvg, int SellerRatingCount);

public record ListingQueryParams(
    string? Search = null, int? CategoryId = null, string? Status = null,
    string? Condition = null, decimal? MinPrice = null, decimal? MaxPrice = null,
    string SortBy = "EndingSoon", int Page = 1, int PageSize = 20);

public record PagedResult<T>(List<T> Items, int TotalCount, int Page, int PageSize, int TotalPages);

// ── Bids ──────────────────────────────────────────────────────
public record PlaceBidRequest(Guid ListingId, decimal BidAmount, decimal? MaxProxyAmount, string? IdempotencyKey);
public record BidDto(Guid Id, Guid ListingId, string BuyerDisplayName, decimal BidAmount, bool IsWinning, DateTime PlacedAt);
public record BidPlacedEvent(Guid ListingId, decimal NewHighestBid, int TotalBids, string? WinnerDisplayName, double SecondsRemaining);

// ── Orders ────────────────────────────────────────────────────
public record OrderDto(
    Guid Id, string ListingTitle, string? ListingImageUrl, decimal WinningBidAmount,
    decimal ShippingCost, decimal TotalAmount, string Status, string CounterpartyName,
    string? TrackingNumber, string? Carrier, DateTime? ShippedAt,
    DateTime? CompletedAt, bool CanRate, DateTime CreatedAt);

public record ShipOrderRequest(string TrackingNumber, string Carrier);

// ── Ratings ───────────────────────────────────────────────────
public record CreateRatingRequest(Guid OrderId, int RatingValue, string? ReviewText);
public record RatingDto(Guid Id, string ReviewerName, int RatingValue, string? ReviewText, DateTime CreatedAt);
