import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ListingService } from '../../../core/services/api.services';
import { ListingCardComponent } from '../listing-card/listing-card.component';
import { Listing, PagedResult, CATEGORIES } from '../../../shared/models';

@Component({
  selector: 'app-listings-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ListingCardComponent],
  template: `
    <div class="page-container">
      <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:1.2rem">
        <h2 class="section-title">Live Auctions</h2>
        <span class="muted-sm">{{result()?.totalCount ?? 0}} active</span>
      </div>
      <input class="search-input" [(ngModel)]="search" placeholder="Search…" (input)="onSearch()" style="width:100%;margin-bottom:1rem"/>
      <div class="filters">
        <button *ngFor="let c of cats" class="filter-chip" [class.active]="activeCat===c.id" (click)="setCat(c.id)">{{c.name}}</button>
      </div>
      <div *ngIf="loading()" class="loading-state">Loading…</div>
      <div class="listings-grid" *ngIf="!loading() && listings().length">
        <bn-listing-card *ngFor="let l of listings()" [listing]="l"/>
      </div>
      <div *ngIf="!loading() && !listings().length" class="empty-state">No listings found.</div>
    </div>
  `
})
export class ListingsPageComponent implements OnInit {
  listings = signal<Listing[]>([]); result = signal<PagedResult<Listing> | null>(null);
  loading = signal(true); search = ''; activeCat: number | undefined; page = 1;
  cats = CATEGORIES; private t: any;
  constructor(private svc: ListingService) {}
  ngOnInit() { this.load(); }
  load() { this.loading.set(true); this.svc.getAll({ search: this.search||undefined, categoryId: this.activeCat, page: this.page, pageSize: 12, status: 'Active' }).subscribe({ next: r => { this.result.set(r); this.listings.set(r.items); this.loading.set(false); }, error: () => this.loading.set(false) }); }
  setCat(id: number|undefined) { this.activeCat = id; this.load(); }
  onSearch() { clearTimeout(this.t); this.t = setTimeout(() => this.load(), 350); }
}
