import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError, EMPTY } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest, SocialLoginRequest, UserProfile } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly base = `${environment.apiUrl}/auth`;
  private _user = signal<UserProfile | null>(this.loadUser());
  readonly user       = this._user.asReadonly();
  readonly isLoggedIn = computed(() => !!this._user());
  readonly isBuyer    = computed(() => this._user()?.roles.includes('Buyer') ?? false);
  readonly isSeller   = computed(() => this._user()?.roles.includes('Seller') ?? false);
  readonly isAdmin    = computed(() => this._user()?.roles.includes('Admin') ?? false);
  constructor(private http: HttpClient, private router: Router) {}
  register(req: RegisterRequest) { return this.http.post<AuthResponse>(`${this.base}/register`, req).pipe(tap(r => this.save(r))); }
  login(req: LoginRequest) { return this.http.post<AuthResponse>(`${this.base}/login`, req).pipe(tap(r => this.save(r))); }
  socialLogin(req: SocialLoginRequest) { return this.http.post<AuthResponse>(`${this.base}/social`, req).pipe(tap(r => this.save(r))); }
  refreshToken() { return this.http.post<AuthResponse>(`${this.base}/refresh`, {}).pipe(tap(r => this.save(r)), catchError(() => { this.logout(); return EMPTY; })); }
  logout() { this.http.post(`${this.base}/logout`, {}).subscribe(); localStorage.removeItem('access_token'); localStorage.removeItem('bn_user'); this._user.set(null); this.router.navigate(['/']); }
  getToken(): string | null { return localStorage.getItem('access_token'); }
  private save(r: AuthResponse) { localStorage.setItem('access_token', r.accessToken); localStorage.setItem('bn_user', JSON.stringify(r.user)); this._user.set(r.user); }
  private loadUser(): UserProfile | null { try { return JSON.parse(localStorage.getItem('bn_user') ?? 'null'); } catch { return null; } }
}
