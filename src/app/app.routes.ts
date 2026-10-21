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
      { path: 'tickets/:id', canActivate: [permGuard(PERM.TICKET_READ)],
        loadComponent: () => import('./features/tickets/ticket-detail.component').then(m => m.TicketDetailComponent) },
      { path: 'projects', canActivate: [permGuard(PERM.PROJECT_READ)],
        loadComponent: () => import('./features/projects/projects.component').then(m => m.ProjectsComponent) },
      { path: 'projects/:id', canActivate: [permGuard(PERM.PROJECT_READ)],
        loadComponent: () => import('./features/projects/project-detail.component').then(m => m.ProjectDetailComponent) },
      { path: 'projects/:projectId/folders/:folderId', canActivate: [permGuard(PERM.DOCUMENT_READ)],
        loadComponent: () => import('./features/document/documents.component').then(m => m.DocumentsComponent) },
      { path: 'projects/:id/register', canActivate: [permGuard(PERM.DOCUMENT_READ)],
        loadComponent: () => import('./features/document/register.component').then(m => m.RegisterComponent) },
      { path: 'documents/:id', canActivate: [permGuard(PERM.DOCUMENT_READ)],
        loadComponent: () => import('./features/document/document-detail.component').then(m => m.DocumentDetailComponent) },
      { path: 'users', canActivate: [permGuard(PERM.USER_CREATE)],
        loadComponent: () => import('./features/users/users.component').then(m => m.UsersComponent) },
      { path: 'roles', canActivate: [permGuard(PERM.ROLE_MANAGE)],
        loadComponent: () => import('./features/roles/roles.component').then(m => m.RolesComponent) },
      { path: 'roles/:id', canActivate: [permGuard(PERM.ROLE_MANAGE)],
        loadComponent: () => import('./features/roles/role-detail.component').then(m => m.RoleDetailComponent) },
      { path: 'audit', canActivate: [permGuard(PERM.AUDIT_VIEW)],
        loadComponent: () => import('./features/audit/audit.component').then(m => m.AuditComponent) }
/** --- Process routes (new) --- */
      { path: 'mes-taches', loadComponent: () => import('./features/process/my-tasks.component').then(m => m.MyTasksComponent) },
      { path: 'processes/:id', loadComponent: () => import('./features/process/process-timeline.component').then(m => m.ProcessTimelineComponent) },
      { path: 'process-test', loadComponent: () => import('./features/process/start-process.component').then(m => m.StartProcessComponent) },
    ]
  },
  { path: '**', redirectTo: '' }
];
