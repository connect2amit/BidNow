import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Listing, CreateListingRequest, ListingQueryParams, PagedResult, Bid, PlaceBidRequest, Order, ShipOrderRequest, CreateRatingRequest, Notification } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class ListingService {
  private readonly url = `${environment.apiUrl}/listings`;
  constructor(private http: HttpClient) {}
  getAll(q: ListingQueryParams = {}) {
    let p = new HttpParams();
    if (q.search)     p = p.set('search',     q.search);
    if (q.categoryId) p = p.set('categoryId', q.categoryId.toString());
    if (q.status)     p = p.set('status',     q.status);
    if (q.sortBy)     p = p.set('sortBy',     q.sortBy);
    if (q.page)       p = p.set('page',       q.page.toString());
    if (q.pageSize)   p = p.set('pageSize',   q.pageSize.toString());
    return this.http.get<PagedResult<Listing>>(this.url, { params: p });
  }
  getById(id: string) { return this.http.get<Listing>(`${this.url}/${id}`); }
  create(req: CreateListingRequest) { return this.http.post<Listing>(this.url, req); }
  cancel(id: string) { return this.http.delete(`${this.url}/${id}`); }
  uploadImage(id: string, file: File) { const f = new FormData(); f.append('file', file); return this.http.post<{ url: string }>(`${this.url}/${id}/images`, f); }
}

@Injectable({ providedIn: 'root' })
export class BidService {
  private readonly url = `${environment.apiUrl}/bids`;
  constructor(private http: HttpClient) {}
  placeBid(req: PlaceBidRequest) { return this.http.post<Bid>(this.url, req); }
  getHistory(listingId: string)  { return this.http.get<Bid[]>(`${this.url}/${listingId}`); }
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly url = `${environment.apiUrl}/orders`;
  constructor(private http: HttpClient) {}
  getMyOrders()                          { return this.http.get<Order[]>(this.url); }
  getById(id: string)                    { return this.http.get<Order>(`${this.url}/${id}`); }
  ship(id: string, req: ShipOrderRequest){ return this.http.put<Order>(`${this.url}/${id}/ship`, req); }
  confirmDelivery(id: string)            { return this.http.put<Order>(`${this.url}/${id}/confirm-delivery`, {}); }
}

@Injectable({ providedIn: 'root' })
export class RatingService {
  private readonly url = `${environment.apiUrl}/ratings`;
  constructor(private http: HttpClient) {}
  create(req: CreateRatingRequest) { return this.http.post(this.url, req); }
  getForUser(userId: string)       { return this.http.get(`${this.url}/user/${userId}`); }
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly url   = `${environment.apiUrl}/notifications`;
  readonly unreadCount   = signal(0);
  readonly notifications = signal<Notification[]>([]);
  constructor(private http: HttpClient) {}
  load() {
    this.http.get<Notification[]>(this.url).subscribe(n => this.notifications.set(n));
    this.http.get<{ count: number }>(`${this.url}/unread-count`).subscribe(r => this.unreadCount.set(r.count));
  }
  markAllRead() { return this.http.put(`${this.url}/read-all`, {}).pipe(tap(() => { this.notifications.update(ns => ns.map(n => ({ ...n, isRead: true }))); this.unreadCount.set(0); })); }
}
