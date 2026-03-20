import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <h1 class="auth-logo">BidNow</h1>
        <h2 class="auth-title">Create your account</h2>
        <div *ngIf="error" class="alert alert-error">{{error}}</div>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="form-group"><label class="form-label">Display Name</label><input class="form-input" formControlName="displayName" placeholder="Your name"/></div>
          <div class="form-group"><label class="form-label">Email</label><input class="form-input" type="email" formControlName="email" placeholder="you@example.com"/></div>
          <div class="form-group"><label class="form-label">Password</label><input class="form-input" type="password" formControlName="password" placeholder="Min 8 characters"/></div>
          <div class="form-group">
            <label class="form-label">I want to</label>
            <div class="role-grid">
              <div class="role-opt" [class.selected]="hasRole('Buyer')"  (click)="toggleRole('Buyer')"><span class="role-icon">🛒</span><span>Buy</span></div>
              <div class="role-opt" [class.selected]="hasRole('Seller')" (click)="toggleRole('Seller')"><span class="role-icon">🏷️</span><span>Sell</span></div>
            </div>
          </div>
          <button class="btn-primary btn-full" type="submit" [disabled]="loading">{{loading ? 'Creating…' : 'Create Account'}}</button>
        </form>
        <p class="auth-switch">Have an account? <a routerLink="/auth/login">Sign in</a></p>
      </div>
    </div>
  `
})
export class RegisterComponent {
  form          = this.fb.group({ displayName: ['', Validators.required], email: ['', [Validators.required, Validators.email]], password: ['', [Validators.required, Validators.minLength(8)]] });
  selectedRoles = ['Buyer']; error = ''; loading = false;
  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {}
  hasRole(r: string)    { return this.selectedRoles.includes(r); }
  toggleRole(r: string) { this.selectedRoles = this.selectedRoles.includes(r) ? this.selectedRoles.filter(x => x !== r) : [...this.selectedRoles, r]; }
  submit() {
    if (this.form.invalid || !this.selectedRoles.length) return;
    this.loading = true;
    this.auth.register({ ...this.form.value as any, roles: this.selectedRoles }).subscribe({ next: () => this.router.navigate(['/dashboard']), error: e => { this.error = e.error?.error ?? 'Registration failed.'; this.loading = false; } });
  }
}
