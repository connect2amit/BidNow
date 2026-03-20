import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Listing } from '../../../shared/models';

@Component({
  selector: 'bn-listing-card',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, RouterLink],
  template: `
    <div class="listing-card" [routerLink]="['/listings', listing.id]">
      <div class="card-img" [style.background]="bg">
        <img *ngIf="listing.imageUrls[0]" [src]="listing.imageUrls[0]" [alt]="listing.title"/>
        <div *ngIf="!listing.imageUrls[0]" class="card-img-placeholder">📦</div>
        <span class="card-timer" [class.urgent]="isUrgent">{{timeLeft}}</span>
        <span class="card-category">{{listing.category}}</span>
      </div>
      <div class="card-body">
        <span class="condition-badge" [ngClass]="condClass">{{listing.condition}}</span>
        <h3 class="card-title">{{listing.title}}</h3>
        <div class="card-seller">by <strong>{{listing.seller.displayName}}</strong>
          <span style="color:var(--gold);font-size:.72rem;margin-left:4px">{{stars(listing.seller.sellerRatingAvg)}}</span>
        </div>
        <div class="card-footer">
          <div>
            <div class="bid-label">Current Bid</div>
            <div class="bid-amount">{{(listing.currentHighestBid ?? listing.startingBidPrice) | currency}}</div>
          </div>
          <div class="bid-count">{{listing.totalBids}} bids</div>
        </div>
      </div>
    </div>
  `
})
export class ListingCardComponent implements OnInit, OnDestroy {
  @Input() listing!: Listing;
  timeLeft = ''; isUrgent = false; bg = '#f7f6f2';
  private interval: any;
  private BG: Record<string,string> = { 'Electronics':'#e8f0fb','Art & Collectibles':'#f5e8fb','Fashion':'#fce8f0','Jewellery':'#faf6e8','Vehicles':'#e8fbf0','Books':'#fbeae8','Sports':'#e8faf3' };
  get condClass() { return { 'cond-new': this.listing.condition==='New', 'cond-good': ['LikeNew','Good'].includes(this.listing.condition), 'cond-fair': ['Fair','Poor'].includes(this.listing.condition) }; }
  stars(r: number) { return '★'.repeat(Math.round(r)); }
  ngOnInit() { this.bg = this.BG[this.listing.category] ?? '#f7f6f2'; this.tick(); this.interval = setInterval(() => this.tick(), 1000); }
  ngOnDestroy() { clearInterval(this.interval); }
  private tick() {
    if (!this.listing.auctionEndsAt) { this.timeLeft = 'Ended'; return; }
    const ms = new Date(this.listing.auctionEndsAt).getTime() - Date.now();
    if (ms <= 0) { this.timeLeft = 'Ended'; clearInterval(this.interval); return; }
    this.isUrgent = ms < 3_600_000;
    const s = Math.floor(ms/1000), m = Math.floor(s/60), h = Math.floor(m/60), d = Math.floor(h/24);
    this.timeLeft = d > 0 ? `${d}d ${h%24}h` : h > 0 ? `${h}h ${m%60}m` : `${m}m ${s%60}s`;
  }
}
