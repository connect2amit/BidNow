using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using BidNow.Core.DTOs;
using BidNow.Core.Entities;
using BidNow.Core.Enums;
using BidNow.Infrastructure.Data;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace BidNow.API.Controllers;

// ── Auth Controller ───────────────────────────────────────────
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly BidNowDbContext _db;
    private readonly IConfiguration _config;

    public AuthController(BidNowDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req)
    {
        if (await _db.Users.AnyAsync(u => u.Email == req.Email.ToLower()))
            return BadRequest(new { error = "Email already registered." });

        var user = new User
        {
            Email = req.Email.Trim().ToLowerInvariant(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password, 12),
            DisplayName = req.DisplayName.Trim(),
            IsEmailVerified = true // simplified for dev
        };
        _db.Users.Add(user);

        foreach (var role in req.Roles.Distinct())
            if (Enum.TryParse<RoleType>(role, true, out var r))
                _db.UserRoles.Add(new UserRole { UserId = user.Id, Role = r });

        await _db.SaveChangesAsync();
        var token = GenerateJwt(user, req.Roles);
        return StatusCode(201, new AuthResponse(token, string.Empty, DateTime.UtcNow.AddMinutes(60), ToDto(user, req.Roles)));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        var user = await _db.Users.Include(u => u.Roles)
            .FirstOrDefaultAsync(u => u.Email == req.Email.ToLowerInvariant());

        if (user is null || string.IsNullOrEmpty(user.PasswordHash) ||
            !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new { error = "Invalid credentials." });

        var roles = user.Roles.Select(r => r.Role.ToString()).ToList();
        var token = GenerateJwt(user, roles);
        return Ok(new AuthResponse(token, string.Empty, DateTime.UtcNow.AddMinutes(60), ToDto(user, roles)));
    }

    [HttpPost("social")]
    public async Task<IActionResult> SocialLogin([FromBody] SocialLoginRequest req)
    {
        var email = $"{req.Provider.ToLower()}_{Guid.NewGuid():N}@social.bidnow.com";
        var user = new User { Email = email, DisplayName = req.DisplayName ?? "User", IsEmailVerified = true };
        _db.Users.Add(user);
        _db.UserRoles.Add(new UserRole { UserId = user.Id, Role = RoleType.Buyer });
        await _db.SaveChangesAsync();
        var token = GenerateJwt(user, new List<string> { "Buyer" });
        return Ok(new AuthResponse(token, string.Empty, DateTime.UtcNow.AddMinutes(60), ToDto(user, new List<string> { "Buyer" })));
    }

    private string GenerateJwt(User user, List<string> roles)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:SecretKey"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new List<Claim>
        {
            new Claim("sub",                       user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim("name",                      user.DisplayName),
        };
        foreach (var role in roles)
            claims.Add(new Claim(ClaimTypes.Role, role));

        var jwt = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(60),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(jwt);
    }

    private static UserProfileDto ToDto(User u, List<string> roles) => new(
        u.Id, u.Email, u.DisplayName, u.ProfileImageUrl, roles,
        u.SellerRatingAvg, u.SellerRatingCount,
        u.BuyerRatingAvg, u.BuyerRatingCount,
        u.IsEmailVerified, u.CreatedAt);
}

// ── Listings Controller ───────────────────────────────────────
[ApiController]
[Route("api/listings")]
public class ListingsController : ControllerBase
{
    private readonly BidNowDbContext _db;
    public ListingsController(BidNowDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] ListingQueryParams q)
    {
        var query = _db.Listings
            .Include(l => l.Seller)
            .Include(l => l.Category)
            .Include(l => l.Images)
            .Where(l => l.Status == ListingStatus.Active);

        if (!string.IsNullOrEmpty(q.Search))
            query = query.Where(l => l.Title.Contains(q.Search) || (l.Description != null && l.Description.Contains(q.Search)));

        if (q.CategoryId.HasValue)
            query = query.Where(l => l.CategoryId == q.CategoryId);

        query = q.SortBy switch
        {
            "Newest" => query.OrderByDescending(l => l.CreatedAt),
            "PriceLow" => query.OrderBy(l => l.CurrentHighestBid ?? l.StartingBidPrice),
            "PriceHigh" => query.OrderByDescending(l => l.CurrentHighestBid ?? l.StartingBidPrice),
            _ => query.OrderBy(l => l.AuctionEndsAt)
        };

        var total = await query.CountAsync();
        var items = await query.Skip((q.Page - 1) * q.PageSize).Take(q.PageSize).ToListAsync();
        var dtos = items.Select(MapToDto).ToList();

        return Ok(new PagedResult<ListingDto>(dtos, total, q.Page, q.PageSize,
            (int)Math.Ceiling(total / (double)q.PageSize)));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var listing = await _db.Listings
            .Include(l => l.Seller)
            .Include(l => l.Category)
            .Include(l => l.Images)
            .FirstOrDefaultAsync(l => l.Id == id);

        return listing is null ? NotFound() : Ok(MapToDto(listing));
    }

    [HttpPost]
    [Authorize(Roles = "Seller,Admin")]
    public async Task<IActionResult> Create([FromBody] CreateListingRequest req)
    {
        var sellerId = Guid.Parse(User.FindFirst("sub")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? string.Empty);
        var durationMap = new Dictionary<string, int>
        {
            ["1h"] = 1,
            ["3h"] = 3,
            ["6h"] = 6,
            ["12h"] = 12,
            ["24h"] = 24,
            ["48h"] = 48,
            ["72h"] = 72,
            ["7d"] = 168
        };
        var hours = durationMap.GetValueOrDefault(req.Duration, 24);
        var listing = new Listing
        {
            SellerId = sellerId,
            CategoryId = req.CategoryId,
            Title = req.Title.Trim(),
            Description = req.Description,
            Condition = Enum.Parse<ItemCondition>(req.Condition, true),
            StartingBidPrice = req.StartingBidPrice,
            ReservePrice = req.ReservePrice,
            ShippingCost = req.ShippingCost,
            ShippingNotes = req.ShippingNotes,
            Status = ListingStatus.Active,
            AuctionStartsAt = DateTime.UtcNow,
            AuctionEndsAt = DateTime.UtcNow.AddHours(hours)
        };
        _db.Listings.Add(listing);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = listing.Id },
            MapToDto(listing));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Seller,Admin")]
    public async Task<IActionResult> Cancel(Guid id)
    {
        var sellerId = Guid.Parse(User.FindFirst("sub")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? string.Empty);
        var listing = await _db.Listings.FirstOrDefaultAsync(l => l.Id == id);
        if (listing is null) return NotFound();
        if (listing.SellerId != sellerId) return Forbid();
        listing.Status = ListingStatus.Cancelled;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private static ListingDto MapToDto(Listing l) => new(
        l.Id, l.Title, l.Description,
        l.Category?.Name ?? string.Empty, l.CategoryId,
        l.Condition.ToString(), l.StartingBidPrice,
        l.CurrentHighestBid, l.MinimumNextBid,
        l.TotalBids, l.Status.ToString(), l.AuctionEndsAt,
        l.ShippingCost, l.ShippingNotes, l.ViewCount,
        new SellerSummaryDto(l.SellerId, l.Seller?.DisplayName ?? "Seller",
            l.Seller?.ProfileImageUrl, l.Seller?.SellerRatingAvg ?? 0, l.Seller?.SellerRatingCount ?? 0),
        l.Images.OrderBy(i => i.SortOrder).Select(i => i.ImageUrl).ToList(),
        l.ReserveMet, l.CreatedAt);
}

// ── Bids Controller ───────────────────────────────────────────
[ApiController]
[Route("api/bids")]
public class BidsController : ControllerBase
{
    private readonly BidNowDbContext _db;
    public BidsController(BidNowDbContext db) => _db = db;

    [HttpPost]
    [Authorize(Roles = "Buyer,Admin")]
    public async Task<IActionResult> PlaceBid([FromBody] PlaceBidRequest req)
    {
        var buyerId = Guid.Parse(User.FindFirst("sub")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? string.Empty);
        var listing = await _db.Listings.FirstOrDefaultAsync(l => l.Id == req.ListingId);

        if (listing is null) return NotFound(new { error = "Listing not found." });
        if (!listing.IsActive) return BadRequest(new { error = "Auction is no longer active." });
        if (listing.SellerId == buyerId) return BadRequest(new { error = "Cannot bid on your own listing." });
        if (req.BidAmount < listing.MinimumNextBid)
            return BadRequest(new { error = $"Minimum bid is {listing.MinimumNextBid:C}." });

        if (!string.IsNullOrEmpty(req.IdempotencyKey) &&
            await _db.Bids.AnyAsync(b => b.IdempotencyKey == req.IdempotencyKey))
            return BadRequest(new { error = "Duplicate bid submission." });

        await _db.Bids.Where(b => b.ListingId == listing.Id)
            .ExecuteUpdateAsync(s => s.SetProperty(b => b.IsWinning, false));

        var bid = new Bid
        {
            ListingId = req.ListingId,
            BuyerId = buyerId,
            BidAmount = req.BidAmount,
            IsWinning = true,
            IdempotencyKey = req.IdempotencyKey,
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString()
        };
        _db.Bids.Add(bid);

        listing.CurrentHighestBid = req.BidAmount;
        listing.CurrentWinnerId = buyerId;
        listing.TotalBids++;
        await _db.SaveChangesAsync();

        return Ok(new BidDto(bid.Id, listing.Id, "You", req.BidAmount, true, bid.PlacedAt));
    }

    [HttpGet("{listingId:guid}")]
    public async Task<IActionResult> GetHistory(Guid listingId)
    {
        var bids = await _db.Bids
            .Where(b => b.ListingId == listingId)
            .OrderByDescending(b => b.BidAmount)
            .Take(20)
            .ToListAsync();

        var dtos = bids.Select(b => new BidDto(
            b.Id, b.ListingId,
            $"Bidder#{Math.Abs(b.BuyerId.GetHashCode()) % 1000:D3}",
            b.BidAmount, b.IsWinning, b.PlacedAt));

        return Ok(dtos);
    }
}

// ── Orders Controller ─────────────────────────────────────────
[ApiController]
[Route("api/orders")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly BidNowDbContext _db;
    public OrdersController(BidNowDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetMyOrders()
    {
        var userId = Guid.Parse(User.FindFirst("sub")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? string.Empty);
        var orders = await _db.Orders
            .Include(o => o.Listing)
            .Include(o => o.Buyer)
            .Include(o => o.Seller)
            .Include(o => o.Ratings)
            .Where(o => o.BuyerId == userId || o.SellerId == userId)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        var dtos = orders.Select(o => MapToDto(o, userId)).ToList();
        return Ok(dtos);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var userId = Guid.Parse(User.FindFirst("sub")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? string.Empty);
        var order = await _db.Orders
            .Include(o => o.Listing)
            .Include(o => o.Buyer)
            .Include(o => o.Seller)
            .Include(o => o.Ratings)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order is null || (order.BuyerId != userId && order.SellerId != userId))
            return NotFound();
        return Ok(MapToDto(order, userId));
    }

    [HttpPut("{id:guid}/ship")]
    [Authorize(Roles = "Seller,Admin")]
    public async Task<IActionResult> Ship(Guid id, [FromBody] ShipOrderRequest req)
    {
        var sellerId = Guid.Parse(User.FindFirst("sub")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? string.Empty);
        var order = await _db.Orders.Include(o => o.Listing)
            .FirstOrDefaultAsync(o => o.Id == id);
        if (order is null || order.SellerId != sellerId) return NotFound();
        order.TrackingNumber = req.TrackingNumber;
        order.Carrier = req.Carrier;
        order.Status = OrderStatus.Shipped;
        order.ShippedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(MapToDto(order, sellerId));
    }

    [HttpPut("{id:guid}/confirm-delivery")]
    [Authorize(Roles = "Buyer,Admin")]
    public async Task<IActionResult> ConfirmDelivery(Guid id)
    {
        var buyerId = Guid.Parse(User.FindFirst("sub")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? string.Empty);
        var order = await _db.Orders.Include(o => o.Listing)
            .FirstOrDefaultAsync(o => o.Id == id);
        if (order is null || order.BuyerId != buyerId) return NotFound();
        order.Status = OrderStatus.Completed;
        order.DeliveredAt = DateTime.UtcNow;
        order.CompletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(MapToDto(order, buyerId));
    }

    private static OrderDto MapToDto(Order o, Guid userId)
    {
        var isBuyer = o.BuyerId == userId;
        var counterparty = isBuyer ? o.Seller?.DisplayName ?? "Seller" : o.Buyer?.DisplayName ?? "Buyer";
        var alreadyRated = o.Ratings.Any(r => r.ReviewerId == userId);
        var canRate = o.Status == OrderStatus.Completed && !alreadyRated;
        return new OrderDto(o.Id, o.Listing?.Title ?? "Item", null,
            o.WinningBidAmount, o.ShippingCost, o.TotalAmount,
            o.Status.ToString(), counterparty, o.TrackingNumber,
            o.Carrier, o.ShippedAt, o.CompletedAt, canRate, o.CreatedAt);
    }
}

// ── Ratings Controller ────────────────────────────────────────
[ApiController]
[Route("api/ratings")]
[Authorize]
public class RatingsController : ControllerBase
{
    private readonly BidNowDbContext _db;
    public RatingsController(BidNowDbContext db) => _db = db;

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRatingRequest req)
    {
        var reviewerId = Guid.Parse(User.FindFirst("sub")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? string.Empty);
        var order = await _db.Orders.FirstOrDefaultAsync(o => o.Id == req.OrderId);
        if (order is null) return NotFound();
        if (order.Status != OrderStatus.Completed)
            return BadRequest(new { error = "Can only rate completed orders." });
        if (order.BuyerId != reviewerId && order.SellerId != reviewerId)
            return Forbid();
        if (await _db.Ratings.AnyAsync(r => r.OrderId == req.OrderId && r.ReviewerId == reviewerId))
            return BadRequest(new { error = "Already rated this order." });

        var revieweeId = order.BuyerId == reviewerId ? order.SellerId : order.BuyerId;
        var rating = new Rating
        {
            OrderId = req.OrderId,
            ReviewerId = reviewerId,
            RevieweeId = revieweeId,
            RatingValue = req.RatingValue,
            ReviewText = req.ReviewText
        };
        _db.Ratings.Add(rating);
        await _db.SaveChangesAsync();

        var reviewer = await _db.Users.FindAsync(reviewerId);
        return Ok(new RatingDto(rating.Id, reviewer?.DisplayName ?? "User",
            rating.RatingValue, rating.ReviewText, rating.CreatedAt));
    }

    [HttpGet("user/{userId:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetForUser(Guid userId)
    {
        var ratings = await _db.Ratings
            .Include(r => r.Reviewer)
            .Where(r => r.RevieweeId == userId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        var dtos = ratings.Select(r => new RatingDto(r.Id,
            r.Reviewer?.DisplayName ?? "User", r.RatingValue, r.ReviewText, r.CreatedAt));
        return Ok(dtos);
    }
}

// ── Notifications Controller ──────────────────────────────────
[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly BidNowDbContext _db;
    public NotificationsController(BidNowDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var userId = Guid.Parse(User.FindFirst("sub")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? string.Empty);
        var notifs = await _db.Notifications
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(20)
            .ToListAsync();
        return Ok(notifs);
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> UnreadCount()
    {
        var userId = Guid.Parse(User.FindFirst("sub")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? string.Empty);
        var count = await _db.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead);
        return Ok(new { count });
    }

    [HttpPut("{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id)
    {
        var userId = Guid.Parse(User.FindFirst("sub")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? string.Empty);
        var notif = await _db.Notifications.FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);
        if (notif is null) return NotFound();
        notif.IsRead = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        var userId = Guid.Parse(User.FindFirst("sub")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? string.Empty);
        await _db.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));
        return NoContent();
    }
}

// ── Users Controller ──────────────────────────────────────────
[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly BidNowDbContext _db;
    public UsersController(BidNowDbContext db) => _db = db;

    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var userId = Guid.Parse(User.FindFirst("sub")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? string.Empty);
        var user = await _db.Users.Include(u => u.Roles).FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return NotFound();
        var roles = user.Roles.Select(r => r.Role.ToString()).ToList();
        return Ok(new UserProfileDto(user.Id, user.Email, user.DisplayName, user.ProfileImageUrl,
            roles, user.SellerRatingAvg, user.SellerRatingCount,
            user.BuyerRatingAvg, user.BuyerRatingCount, user.IsEmailVerified, user.CreatedAt));
    }

    [HttpGet("{id:guid}/profile")]
    [AllowAnonymous]
    public async Task<IActionResult> GetProfile(Guid id)
    {
        var user = await _db.Users.Include(u => u.Roles).FirstOrDefaultAsync(u => u.Id == id);
        if (user is null) return NotFound();
        var roles = user.Roles.Select(r => r.Role.ToString()).ToList();
        return Ok(new UserProfileDto(user.Id, user.Email, user.DisplayName, user.ProfileImageUrl,
            roles, user.SellerRatingAvg, user.SellerRatingCount,
            user.BuyerRatingAvg, user.BuyerRatingCount, user.IsEmailVerified, user.CreatedAt));
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateProfileRequest req)
    {
        var userId = Guid.Parse(User.FindFirst("sub")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? string.Empty);
        var user = await _db.Users.Include(u => u.Roles).FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return NotFound();
        if (req.DisplayName is not null) user.DisplayName = req.DisplayName;
        if (req.Phone is not null) user.Phone = req.Phone;
        if (req.Bio is not null) user.Bio = req.Bio;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        var roles = user.Roles.Select(r => r.Role.ToString()).ToList();
        return Ok(new UserProfileDto(user.Id, user.Email, user.DisplayName, user.ProfileImageUrl,
            roles, user.SellerRatingAvg, user.SellerRatingCount,
            user.BuyerRatingAvg, user.BuyerRatingCount, user.IsEmailVerified, user.CreatedAt));
    }
}
