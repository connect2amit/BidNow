import { Routes } from '@angular/router';
import { authGuard, sellerGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent) },
  { path: 'auth/login', loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) },
  { path: 'auth/register', loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent) },
  { path: 'listings', loadComponent: () => import('./features/listings/listings-page/listings-page.component').then(m => m.ListingsPageComponent) },
  { path: 'listings/new', canActivate: [authGuard, sellerGuard], loadComponent: () => import('./features/listings/create-listing/create-listing.component').then(m => m.CreateListingComponent) },
  { path: 'listings/:id', loadComponent: () => import('./features/listings/listing-detail/listing-detail.component').then(m => m.ListingDetailComponent) },
  { path: 'dashboard', canActivate: [authGuard], loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: '**', redirectTo: '' }
];
