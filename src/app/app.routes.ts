import { Routes } from '@angular/router';
import { authGuard } from '@app/core/auth.guard';
import { permGuard } from '@app/core/perm.guard';
import { PERM } from '@app/core/permissions';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent) },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./features/shell/shell.component').then(m => m.ShellComponent),
    children: [
      { path: '', loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent) },
      { path: 'tickets', canActivate: [permGuard(PERM.TICKET_READ)], loadComponent: () => import('./features/tickets/tickets.component').then(m => m.TicketsComponent) },
      { path: 'audit', canActivate: [permGuard(PERM.AUDIT_VIEW)], loadComponent: () => import('./features/audit/audit.component').then(m => m.AuditComponent) },
      { path: 'mes-taches', loadComponent: () => import('./features/process/my-tasks.component').then(m => m.MyTasksComponent) },
      { path: 'processes/:id', loadComponent: () => import('./features/process/process-timeline.component').then(m => m.ProcessTimelineComponent) },
      { path: 'process-test', loadComponent: () => import('./features/process/start-process.component').then(m => m.StartProcessComponent) }
    ]
  },
  { path: '**', redirectTo: '' }
];
