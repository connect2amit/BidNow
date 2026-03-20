using Microsoft.EntityFrameworkCore;
using BidNow.Core.Entities;
using BidNow.Core.Enums;

namespace BidNow.Infrastructure.Data;

public class BidNowDbContext : DbContext
{
    public BidNowDbContext(DbContextOptions<BidNowDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Listing> Listings => Set<Listing>();
    public DbSet<ListingImage> ListingImages => Set<ListingImage>();
    public DbSet<Bid> Bids => Set<Bid>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<Rating> Ratings => Set<Rating>();
    public DbSet<Notification> Notifications => Set<Notification>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        base.OnModelCreating(mb);

        mb.Entity<User>(e =>
        {
            e.ToTable("users");
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Email).IsUnique();
            e.Property(x => x.Email).HasMaxLength(255).IsRequired();
            e.Property(x => x.DisplayName).HasMaxLength(100).IsRequired();
            e.Property(x => x.SellerRatingAvg).HasPrecision(3, 2);
            e.Property(x => x.BuyerRatingAvg).HasPrecision(3, 2);
        });

        mb.Entity<UserRole>(e =>
        {
            e.ToTable("user_roles");
            e.HasKey(x => new { x.UserId, x.Role });
            e.Property(x => x.Role).HasConversion<string>();
            e.HasOne(x => x.User).WithMany(u => u.Roles)
                .HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        mb.Entity<RefreshToken>(e =>
        {
            e.ToTable("refresh_tokens");
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.TokenHash).IsUnique();
            e.Ignore(x => x.IsExpired);
            e.Ignore(x => x.IsRevoked);
            e.Ignore(x => x.IsActive);
            e.HasOne(x => x.User).WithMany(u => u.RefreshTokens)
                .HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        mb.Entity<Category>(e =>
        {
            e.ToTable("categories");
            e.HasKey(x => x.Id);
        });

        mb.Entity<Listing>(e =>
        {
            e.ToTable("listings");
            e.HasKey(x => x.Id);
            e.Property(x => x.Title).HasMaxLength(200).IsRequired();
            e.Property(x => x.StartingBidPrice).HasPrecision(12, 2);
            e.Property(x => x.ReservePrice).HasPrecision(12, 2);
            e.Property(x => x.CurrentHighestBid).HasPrecision(12, 2);
            e.Property(x => x.ShippingCost).HasPrecision(8, 2);
            e.Property(x => x.Status).HasConversion<string>();
            e.Property(x => x.Condition).HasConversion<string>();
            e.Ignore(x => x.MinimumNextBid);
            e.Ignore(x => x.IsActive);
            e.Ignore(x => x.ReserveMet);
            e.HasOne(x => x.Seller).WithMany(u => u.Listings)
                .HasForeignKey(x => x.SellerId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Category).WithMany(c => c.Listings)
                .HasForeignKey(x => x.CategoryId);
            e.HasOne(x => x.CurrentWinner).WithMany()
                .HasForeignKey(x => x.CurrentWinnerId).OnDelete(DeleteBehavior.Restrict);
        });

        mb.Entity<ListingImage>(e =>
        {
            e.ToTable("listing_images");
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Listing).WithMany(l => l.Images)
                .HasForeignKey(x => x.ListingId).OnDelete(DeleteBehavior.Cascade);
        });

        mb.Entity<Bid>(e =>
        {
            e.ToTable("bids");
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.IdempotencyKey).IsUnique();
            e.Property(x => x.BidAmount).HasPrecision(12, 2);
            e.HasOne(x => x.Listing).WithMany(l => l.Bids)
                .HasForeignKey(x => x.ListingId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Buyer).WithMany(u => u.Bids)
                .HasForeignKey(x => x.BuyerId).OnDelete(DeleteBehavior.Restrict);
        });

        mb.Entity<Order>(e =>
        {
            e.ToTable("orders");
            e.HasKey(x => x.Id);
            e.Property(x => x.WinningBidAmount).HasPrecision(12, 2);
            e.Property(x => x.ShippingCost).HasPrecision(8, 2);
            e.Property(x => x.TotalAmount).HasPrecision(12, 2);
            e.Property(x => x.Status).HasConversion<string>();
            e.HasOne(x => x.Listing).WithOne(l => l.Order)
                .HasForeignKey<Order>(x => x.ListingId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Buyer).WithMany()
                .HasForeignKey(x => x.BuyerId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Seller).WithMany()
                .HasForeignKey(x => x.SellerId).OnDelete(DeleteBehavior.Restrict);
        });

        mb.Entity<Rating>(e =>
        {
            e.ToTable("ratings");
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.OrderId, x.ReviewerId }).IsUnique();
            e.HasOne(x => x.Order).WithMany(o => o.Ratings)
                .HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Reviewer).WithMany()
                .HasForeignKey(x => x.ReviewerId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Reviewee).WithMany()
                .HasForeignKey(x => x.RevieweeId).OnDelete(DeleteBehavior.Restrict);
        });

        mb.Entity<Notification>(e =>
        {
            e.ToTable("notifications");
            e.HasKey(x => x.Id);
            e.Property(x => x.Type).HasConversion<string>();
            e.HasOne(x => x.User).WithMany(u => u.Notifications)
                .HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
