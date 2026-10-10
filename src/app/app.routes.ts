import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { permGuard } from './core/perm.guard';
import { PERM } from './core/permissions';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent) },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./features/shell/shell.component').then(m => m.ShellComponent),
    children: [
      { path: '', loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent) },
      { path: 'tickets', canActivate: [permGuard(PERM.TICKET_READ)],
        loadComponent: () => import('./features/tickets/tickets.component').then(m => m.TicketsComponent) },
      { path: 'users', canActivate: [permGuard(PERM.USER_CREATE)],
        loadComponent: () => import('./features/users/users.component').then(m => m.UsersComponent) },
      { path: 'roles', canActivate: [permGuard(PERM.ROLE_MANAGE)],
        loadComponent: () => import('./features/roles/roles.component').then(m => m.RolesComponent) }
    ]
  },
  { path: '**', redirectTo: '' }
];