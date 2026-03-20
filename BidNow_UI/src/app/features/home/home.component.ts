import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ListingService } from '../../core/services/api.services';
import { AuthService } from '../../core/services/auth.service';
import { ListingCardComponent } from '../listings/listing-card/listing-card.component';
import { Listing, PagedResult, CATEGORIES } from '../../shared/models';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ListingCardComponent],
  template: `
    <section class="hero" *ngIf="!auth.isLoggedIn()">
      <div class="hero-content">
        <h1 class="hero-title">Where Rare Things<br/>Find New Homes</h1>
        <p class="hero-subtitle">Competitive live auctions for premium collectibles, luxury goods, and unique finds.</p>
        <div class="hero-cta">
          <a routerLink="/auth/register" class="btn-primary">Start Bidding</a>
          <a routerLink="/auth/register" class="btn-secondary">Sell an Item</a>
        </div>
        <div class="stats-bar">
          <div class="stat-item"><div class="stat-num">12K+</div><div class="stat-label">Active Listings</div></div>
          <div class="stat-item"><div class="stat-num">98K</div><div class="stat-label">Registered Users</div></div>
          <div class="stat-item"><div class="stat-num">$4.2M</div><div class="stat-label">Weekly Volume</div></div>
        </div>
      </div>
    </section>
    <div class="page-container">
      <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:1.2rem">
        <h2 class="section-title">Live Auctions</h2>
        <span class="muted-sm">{{result()?.totalCount ?? 0}} active</span>
      </div>
      <input class="search-input" [(ngModel)]="search" placeholder="Search listings…" (input)="onSearch()" style="width:100%;margin-bottom:1rem"/>
      <div class="filters">
        <button *ngFor="let c of categories" class="filter-chip" [class.active]="activeCat===c.id" (click)="setCategory(c.id)">{{c.name}}</button>
      </div>
      <div *ngIf="loading()" class="loading-state">Loading auctions…</div>
      <div class="listings-grid" *ngIf="!loading() && listings().length">
        <bn-listing-card *ngFor="let l of listings()" [listing]="l"/>
      </div>
      <div *ngIf="!loading() && !listings().length" class="empty-state">
        <div style="font-size:3rem;margin-bottom:.5rem">🔍</div>
        No listings found — try a different search or category.
      </div>
      <div style="display:flex;align-items:center;justify-content:center;gap:1rem;margin-top:2rem" *ngIf="result() && result()!.totalPages > 1">
        <button class="btn-secondary" [disabled]="page===1" (click)="goPage(page-1)">← Prev</button>
        <span class="muted-sm">Page {{page}} of {{result()!.totalPages}}</span>
        <button class="btn-secondary" [disabled]="page>=result()!.totalPages" (click)="goPage(page+1)">Next →</button>
      </div>
    </div>
  `
})
export class HomeComponent implements OnInit {
  listings   = signal<Listing[]>([]);
  result     = signal<PagedResult<Listing> | null>(null);
  loading    = signal(true);
  search     = '';
  activeCat: number | undefined;
  page       = 1;
  categories = CATEGORIES;
  private searchTimer: any;
  constructor(private listingSvc: ListingService, public auth: AuthService) {}
  ngOnInit() { this.load(); }
  load() {
    this.loading.set(true);
    this.listingSvc.getAll({ search: this.search || undefined, categoryId: this.activeCat, status: 'Active', page: this.page, pageSize: 12 })
      .subscribe({ next: r => { this.result.set(r); this.listings.set(r.items); this.loading.set(false); }, error: () => this.loading.set(false) });
  }
  setCategory(id: number | undefined) { this.activeCat = id; this.page = 1; this.load(); }
  goPage(p: number) { this.page = p; this.load(); window.scrollTo(0,0); }
  onSearch() { clearTimeout(this.searchTimer); this.searchTimer = setTimeout(() => { this.page = 1; this.load(); }, 350); }
}
