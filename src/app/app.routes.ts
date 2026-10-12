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
      { path: 'projects', canActivate: [permGuard(PERM.PROJECT_READ)],
        loadComponent: () => import('./features/projects/projects.component').then(m => m.ProjectsComponent) },
      { path: 'users', canActivate: [permGuard(PERM.USER_CREATE)],
        loadComponent: () => import('./features/users/users.component').then(m => m.UsersComponent) },
      { path: 'roles', canActivate: [permGuard(PERM.ROLE_MANAGE)],
        loadComponent: () => import('./features/roles/roles.component').then(m => m.RolesComponent) },
      { path: 'roles/:id', canActivate: [permGuard(PERM.ROLE_MANAGE)],
        loadComponent: () => import('./features/roles/role-detail.component').then(m => m.RoleDetailComponent) },
      { path: 'audit', canActivate: [permGuard(PERM.AUDIT_VIEW)],
        loadComponent: () => import('./features/audit/audit.component').then(m => m.AuditComponent) }
    ]
  },
  { path: '**', redirectTo: '' }
];