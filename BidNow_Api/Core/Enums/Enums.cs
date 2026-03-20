namespace BidNow.Core.Enums;

public enum RoleType        { Buyer, Seller, Admin }
public enum ListingStatus   { Draft, Active, Ended, Cancelled, Sold }
public enum ItemCondition   { New, LikeNew, Good, Fair, Poor }
public enum OrderStatus     { AwaitingPayment, PaymentReceived, Shipped, Delivered, Completed, Disputed, Cancelled }
public enum NotificationType { BidPlaced, Outbid, AuctionWon, AuctionEnded, OrderShipped, OrderDelivered, PaymentReceived, NewRating, AuctionEndingSoon }
public enum AuthProvider    { Local, Google, Facebook, Apple }
