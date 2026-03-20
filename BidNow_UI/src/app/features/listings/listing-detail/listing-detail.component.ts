import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ListingService, BidService } from '../../../core/services/api.services';
import { AuthService } from '../../../core/services/auth.service';
import { Listing, Bid } from '../../../shared/models';

@Component({
  selector: 'app-listing-detail',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, FormsModule],
  template: `
    <div class="page-container" *ngIf="listing">
      <div class="detail-layout">
        <div>
          <div class="main-image">
            <img *ngIf="listing.imageUrls[0]" [src]="listing.imageUrls[0]" [alt]="listing.title"/>
            <div *ngIf="!listing.imageUrls[0]" style="font-size:6rem;text-align:center;padding:3rem">📦</div>
          </div>
        </div>
        <div class="detail-info">
          <div class="detail-category">{{listing.category}}</div>
          <h1 class="detail-title">{{listing.title}}</h1>
          <p class="detail-description">{{listing.description}}</p>
          <div class="bid-panel">
            <div class="current-bid">
              <span class="bid-label">Current Bid</span>
              <span class="bid-value">{{currentBid | currency}}</span>
              <span class="bid-meta">{{listing.totalBids}} bids · {{timeLeft}} remaining</span>
            </div>
            <ng-container *ngIf="auth.isLoggedIn(); else loginPrompt">
              <ng-container *ngIf="auth.isBuyer(); else buyerMsg">
                <div class="bid-input-row">
                  <input class="form-input bid-input" type="number" [(ngModel)]="bidAmount" [placeholder]="'Min ' + listing.minimumNextBid"/>
                  <button class="btn-primary" (click)="placeBid()" [disabled]="bidLoading">{{bidLoading ? 'Placing…' : 'Place Bid'}}</button>
                </div>
              </ng-container>
              <ng-template #buyerMsg><div class="alert alert-info" style="margin-top:8px">Enable Buyer role to bid.</div></ng-template>
            </ng-container>
            <ng-template #loginPrompt><div class="alert alert-info" style="margin-top:8px"><a href="/auth/login">Sign in</a> to place a bid.</div></ng-template>
            <div *ngIf="bidError"   class="alert alert-error"   style="margin-top:8px">{{bidError}}</div>
            <div *ngIf="bidSuccess" class="alert alert-success" style="margin-top:8px">{{bidSuccess}}</div>
          </div>
          <div class="detail-meta-row"><span class="meta-label">Condition</span><span>{{listing.condition}}</span></div>
          <div class="detail-meta-row"><span class="meta-label">Shipping</span><span>{{listing.shippingCost | currency}}</span></div>
          <div class="detail-meta-row"><span class="meta-label">Seller</span><span style="color:var(--gold-dim)">{{listing.seller.displayName}}</span></div>
        </div>
      </div>
      <div style="margin-top:2rem;border-top:1px solid var(--surface-2);padding-top:1.5rem">
        <h2 class="section-title">Bid History</h2>
        <div *ngIf="!bids.length" class="empty-state">No bids yet — be the first!</div>
        <table class="data-table" *ngIf="bids.length">
          <thead><tr><th>Bidder</th><th>Amount</th><th>Time</th><th>Status</th></tr></thead>
          <tbody>
            <tr *ngFor="let b of bids">
              <td>{{b.buyerDisplayName}}</td>
              <td style="font-weight:700;color:var(--gold-dim)">{{b.bidAmount | currency}}</td>
              <td class="muted-sm">{{b.placedAt | date:'medium'}}</td>
              <td><span *ngIf="b.isWinning" class="status status-active">Leading</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div *ngIf="loading" class="loading-state">Loading listing…</div>
  `
})
export class ListingDetailComponent implements OnInit, OnDestroy {
  listing?: Listing; bids: Bid[] = []; loading = true;
  bidAmount?: number; bidLoading = false; bidError = ''; bidSuccess = '';
  currentBid = 0; timeLeft = '';
  private interval: any;
  constructor(private route: ActivatedRoute, private listingSvc: ListingService, private bidSvc: BidService, public auth: AuthService) {}
  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.listingSvc.getById(id).subscribe(l => { this.listing = l; this.currentBid = l.currentHighestBid ?? l.startingBidPrice; this.loading = false; this.startTimer(); });
    this.bidSvc.getHistory(id).subscribe(b => this.bids = b);
  }
  ngOnDestroy() { clearInterval(this.interval); }
  placeBid() {
    if (!this.listing || !this.bidAmount) return;
    if (this.bidAmount < this.listing.minimumNextBid) { this.bidError = `Minimum bid is ${this.listing.minimumNextBid}`; return; }
    this.bidLoading = true; this.bidError = '';
    this.bidSvc.placeBid({ listingId: this.listing.id, bidAmount: this.bidAmount, idempotencyKey: crypto.randomUUID() }).subscribe({
      next: () => { this.bidSuccess = 'Bid placed successfully!'; this.bidLoading = false; this.bidSvc.getHistory(this.listing!.id).subscribe(b => this.bids = b); },
      error: e => { this.bidError = e.error?.error ?? 'Failed to place bid.'; this.bidLoading = false; }
    });
  }
  private startTimer() {
    this.interval = setInterval(() => {
      if (!this.listing?.auctionEndsAt) return;
      const ms = new Date(this.listing.auctionEndsAt).getTime() - Date.now();
      if (ms <= 0) { this.timeLeft = 'Ended'; clearInterval(this.interval); return; }
      const s = Math.floor(ms/1000), m = Math.floor(s/60), h = Math.floor(m/60);
      this.timeLeft = h > 0 ? `${h}h ${m%60}m` : `${m}m ${s%60}s`;
    }, 1000);
  }
}
