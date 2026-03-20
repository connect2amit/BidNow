import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { OrderService, RatingService, NotificationService } from '../../core/services/api.services';
import { Order, CreateRatingRequest } from '../../shared/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, RouterLink, FormsModule],
  template: `
    <div class="dashboard">
      <div class="profile-header">
        <div class="profile-avatar-lg">{{auth.user()?.displayName?.[0]?.toUpperCase()}}</div>
        <div class="profile-info">
          <div class="profile-name">{{auth.user()?.displayName}}</div>
          <div class="profile-email">{{auth.user()?.email}}</div>
          <div class="role-badges">
            <span *ngFor="let r of auth.user()?.roles" class="role-badge" [ngClass]="'badge-'+r.toLowerCase()">{{r}}</span>
          </div>
        </div>
        <a *ngIf="auth.isSeller()" routerLink="/listings/new" class="btn-primary">+ New Listing</a>
      </div>

      <div class="metrics-grid">
        <div class="metric-card"><div class="metric-val">{{orders().length}}</div><div class="metric-lbl">Orders</div></div>
        <div class="metric-card"><div class="metric-val">{{totalSpent() | currency:'USD':'symbol':'1.0-0'}}</div><div class="metric-lbl">Total Spent</div></div>
        <div class="metric-card"><div class="metric-val">{{notifSvc.unreadCount()}}</div><div class="metric-lbl">Notifications</div></div>
      </div>

      <div class="tabs">
        <button class="tab" [class.active]="tab==='orders'" (click)="tab='orders'">Orders</button>
        <button class="tab" [class.active]="tab==='notifications'" (click)="tab='notifications'">
          Notifications <span *ngIf="notifSvc.unreadCount()>0" class="badge">{{notifSvc.unreadCount()}}</span>
        </button>
      </div>

      <div *ngIf="tab==='orders'">
        <table class="data-table" *ngIf="orders().length">
          <thead><tr><th>Item</th><th>Total</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
          <tbody>
            <tr *ngFor="let o of orders()">
              <td class="fw-500">{{o.listingTitle}}</td>
              <td>{{o.totalAmount | currency}}</td>
              <td><span class="status" [ngClass]="statusClass(o.status)">{{o.status}}</span></td>
              <td class="muted-sm">{{o.createdAt | date:'mediumDate'}}</td>
              <td>
                <button *ngIf="o.canRate" class="btn-sm" (click)="openRate(o)">Rate</button>
                <button *ngIf="o.status==='Shipped'" class="btn-sm" (click)="confirmDelivery(o.id)">Confirm Delivery</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div *ngIf="!orders().length" class="empty-state">No orders yet. <a routerLink="/">Browse auctions →</a></div>
      </div>

      <div *ngIf="tab==='notifications'">
        <button class="btn-sm" style="margin-bottom:8px" (click)="notifSvc.markAllRead().subscribe()">Mark all read</button>
        <div *ngFor="let n of notifSvc.notifications()" class="notif-item" [class.unread]="!n.isRead">
          <strong>{{n.title}}</strong><p>{{n.message}}</p>
          <span class="muted-sm">{{n.createdAt | date:'medium'}}</span>
        </div>
        <div *ngIf="!notifSvc.notifications().length" class="empty-state">No notifications.</div>
      </div>

      <div class="modal-overlay" *ngIf="rateOrder" (click)="rateOrder=null">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3>Rate {{rateOrder!.counterpartyName}}</h3>
          <p class="muted-sm">{{rateOrder!.listingTitle}}</p>
          <div class="star-picker">
            <span *ngFor="let s of [1,2,3,4,5]" class="star-pick" [class.active]="s<=rateVal" (click)="rateVal=s">★</span>
          </div>
          <textarea class="form-input" [(ngModel)]="rateText" placeholder="Write a review…" rows="3"></textarea>
          <div class="modal-actions">
            <button class="btn-secondary" (click)="rateOrder=null">Cancel</button>
            <button class="btn-primary" (click)="submitRating()">Submit</button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  orders    = signal<Order[]>([]);
  tab       = 'orders';
  rateOrder: Order | null = null; rateVal = 0; rateText = '';
  constructor(public auth: AuthService, private orderSvc: OrderService, private ratingSvc: RatingService, public notifSvc: NotificationService) {}
  ngOnInit() { this.orderSvc.getMyOrders().subscribe(o => this.orders.set(o)); this.notifSvc.load(); }
  totalSpent() { return this.orders().reduce((a, o) => a + o.totalAmount, 0); }
  statusClass(s: string) { const m: Record<string,string> = { Active:'status-active', Completed:'status-completed', Shipped:'status-shipped', AwaitingPayment:'status-pending', Ended:'status-ended', Cancelled:'status-cancelled' }; return m[s] ?? ''; }
  openRate(o: Order) { this.rateOrder = o; this.rateVal = 0; this.rateText = ''; }
  submitRating() {
    if (!this.rateOrder || !this.rateVal) return;
    const req: CreateRatingRequest = { orderId: this.rateOrder.id, ratingValue: this.rateVal, reviewText: this.rateText };
    this.ratingSvc.create(req).subscribe(() => { this.rateOrder = null; this.orderSvc.getMyOrders().subscribe(o => this.orders.set(o)); });
  }
  confirmDelivery(id: string) { this.orderSvc.confirmDelivery(id).subscribe(() => this.orderSvc.getMyOrders().subscribe(o => this.orders.set(o))); }
}
