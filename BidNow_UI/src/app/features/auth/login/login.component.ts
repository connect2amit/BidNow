import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <h1 class="auth-logo">BidNow</h1>
        <h2 class="auth-title">Welcome back</h2>
        <button class="social-btn" (click)="social('Google')"><span class="social-icon google">G</span> Continue with Google</button>
        <button class="social-btn" (click)="social('Facebook')"><span class="social-icon fb">f</span> Continue with Facebook</button>
        <div class="divider"><span>or sign in with email</span></div>
        <div *ngIf="error" class="alert alert-error">{{error}}</div>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="form-group"><label class="form-label">Email</label><input class="form-input" type="email" formControlName="email" placeholder="you@example.com"/></div>
          <div class="form-group"><label class="form-label">Password</label><input class="form-input" type="password" formControlName="password" placeholder="••••••••"/></div>
          <button class="btn-primary btn-full" type="submit" [disabled]="loading">{{loading ? 'Signing in…' : 'Sign In'}}</button>
        </form>
        <p class="auth-switch">No account? <a routerLink="/auth/register">Create one</a></p>
      </div>
    </div>
  `
})
export class LoginComponent {
  form    = this.fb.group({ email: ['', [Validators.required, Validators.email]], password: ['', Validators.required] });
  error   = ''; loading = false;
  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {}
  submit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.auth.login(this.form.value as any).subscribe({ next: () => this.router.navigate(['/dashboard']), error: e => { this.error = e.error?.error ?? 'Login failed.'; this.loading = false; } });
  }
  social(provider: string) {
    this.auth.socialLogin({ provider, accessToken: 'mock', displayName: `${provider} User` }).subscribe({ next: () => this.router.navigate(['/dashboard']), error: e => { this.error = e.error?.error ?? 'Social login failed.'; } });
  }
}
