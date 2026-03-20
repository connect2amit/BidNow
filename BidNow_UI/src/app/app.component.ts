import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { NotificationService } from './core/services/api.services';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  template: `
    <header class="nav">
      <a class="nav-logo" routerLink="/">BidNow <span>/ Live Auctions</span></a>
      <nav class="nav-links">
        <a routerLink="/" class="nav-link">Browse</a>
        <a *ngIf="auth.isLoggedIn()" routerLink="/dashboard" class="nav-link">Dashboard</a>
      </nav>
      <div class="nav-actions">
        <ng-container *ngIf="auth.isLoggedIn(); else guestLinks">
          <div style="position:relative">
            <button class="notif-btn" (click)="showNotifs = !showNotifs">
              🔔<span *ngIf="notifSvc.unreadCount() > 0" class="notif-dot"></span>
            </button>
            <div class="notif-dropdown" *ngIf="showNotifs">
              <div class="notif-hdr">
                <span>Notifications</span>
                <button class="link-btn" (click)="notifSvc.markAllRead().subscribe(); showNotifs=false">Mark all read</button>
              </div>
              <div *ngFor="let n of notifSvc.notifications().slice(0,5)" class="notif-row" [class.unread]="!n.isRead">
                <strong>{{n.title}}</strong><p>{{n.message}}</p>
              </div>
              <div *ngIf="!notifSvc.notifications().length" class="notif-empty">No notifications</div>
            </div>
          </div>
          <a *ngIf="auth.isSeller()" routerLink="/listings/new" class="btn-primary nav-btn">+ List Item</a>
          <a routerLink="/dashboard" class="nav-avatar">{{auth.user()?.displayName?.[0]?.toUpperCase()}}</a>
          <button class="nav-btn-ghost" (click)="auth.logout()">Sign Out</button>
        </ng-container>
        <ng-template #guestLinks>
          <a routerLink="/auth/login" class="nav-btn-ghost">Sign In</a>
          <a routerLink="/auth/register" class="btn-primary nav-btn">Join Free</a>
        </ng-template>
      </div>
    </header>
    <main><router-outlet /></main>
    <footer class="footer">
      <div class="footer-inner">
        <span class="footer-logo">BidNow</span>
        <span>© 2026 BidNow · .NET 10 · Angular 17 · AWS RDS PostgreSQL</span>
      </div>
    </footer>
  `
})
export class AppComponent implements OnInit {
  showNotifs = false;
  constructor(public auth: AuthService, public notifSvc: NotificationService) {}
  ngOnInit() { if (this.auth.isLoggedIn()) this.notifSvc.load(); }
}
