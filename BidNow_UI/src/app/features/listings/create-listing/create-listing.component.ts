import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { ListingService } from '../../../core/services/api.services';
import { DURATIONS, CONDITIONS } from '../../../shared/models';

@Component({
  selector: 'app-create-listing',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="page-container">
      <h1 class="page-title">List a Product</h1>
      <div *ngIf="error"   class="alert alert-error">{{error}}</div>
      <div *ngIf="success" class="alert alert-success">{{success}}</div>
      <form [formGroup]="form" (ngSubmit)="submit()" class="create-form">
        <div class="form-group"><label class="form-label">Title *</label><input class="form-input" formControlName="title" placeholder="Make, model, year…"/></div>
        <div class="form-group"><label class="form-label">Description</label><textarea class="form-input" formControlName="description" rows="3"></textarea></div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Category *</label>
            <select class="form-input" formControlName="categoryId">
              <option [value]="1">Electronics</option><option [value]="2">Art & Collectibles</option>
              <option [value]="3">Fashion</option><option [value]="4">Jewellery</option>
              <option [value]="5">Vehicles</option><option [value]="6">Books</option><option [value]="7">Sports</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Condition *</label>
            <select class="form-input" formControlName="condition">
              <option *ngFor="let c of conditions" [value]="c">{{c}}</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Starting Bid (USD) *</label><input class="form-input" type="number" formControlName="startingBidPrice"/></div>
          <div class="form-group"><label class="form-label">Reserve Price (optional)</label><input class="form-input" type="number" formControlName="reservePrice"/></div>
        </div>
        <div class="form-group">
          <label class="form-label">Auction Duration *</label>
          <div class="duration-grid">
            <div *ngFor="let d of durations" class="dur-opt" [class.selected]="form.get('duration')?.value===d" (click)="form.patchValue({duration:d})">{{d}}</div>
          </div>
        </div>
        <div class="form-group"><label class="form-label">Shipping Cost (USD)</label><input class="form-input" type="number" formControlName="shippingCost"/></div>
        <div class="form-actions">
          <a routerLink="/" class="btn-secondary">Cancel</a>
          <button type="submit" class="btn-primary" [disabled]="loading">{{loading ? 'Publishing…' : 'Publish Listing'}}</button>
        </div>
      </form>
    </div>
  `
})
export class CreateListingComponent {
  durations = DURATIONS; conditions = CONDITIONS;
  error = ''; success = ''; loading = false;
  form = this.fb.group({
    title:            ['', Validators.required],
    description:      [''],
    categoryId:       [1, Validators.required],
    condition:        ['New', Validators.required],
    startingBidPrice: [null as any, [Validators.required, Validators.min(0.01)]],
    reservePrice:     [null as any],
    duration:         ['24h', Validators.required],
    shippingCost:     [0]
  });
  constructor(private fb: FormBuilder, private svc: ListingService, private router: Router) {}
  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    this.svc.create(this.form.value as any).subscribe({
      next: l => this.router.navigate(['/listings', l.id]),
      error: e => { this.error = e.error?.error ?? 'Failed to create listing.'; this.loading = false; }
    });
  }
}
