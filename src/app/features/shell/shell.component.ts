import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { AuthService } from '@app/core/auth.service';
import { PERM } from '@app/core/permissions';
import { ProjectService } from '@app/core/services/project.service';

interface NavItem { label: string; icon: string; path: string; perm: string; }

const NAV: NavItem[] = [
  { label: 'Accueil',        icon: 'pi pi-home',          path: '/',           perm: '' },
  { label: 'Mes tâches',     icon: 'pi pi-check-square', path: '/mes-taches',  perm: '' },
  { label: 'Processus',      icon: 'pi pi-sitemap',      path: '/processus',   perm: '' },
  { label: 'Chantiers',      icon: 'pi pi-briefcase',   path: '/projects',    perm: PERM.PROJECT_READ },
  { label: 'Utilisateurs',   icon: 'pi pi-users',       path: '/users',       perm: PERM.USER_CREATE },
  { label: 'Rôles',          icon: 'pi pi-id-card',     path: '/roles',       perm: PERM.ROLE_MANAGE },
  { label: 'Journal',        icon: 'pi pi-history',     path: '/audit',       perm: PERM.AUDIT_VIEW },
];

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ButtonModule, ToastModule],
  template: `
    <p-toast position="top-right" />
    <div class="shell">
      <aside>
        <div class="brand"><i class="pi pi-shield"></i> HYDRA</div>
        <nav>
          @for (item of menu(); track item.path) {
            <a [routerLink]="item.path" routerLinkActive="active">
              <i class="pi {{ item.icon }}"></i> {{ item.label }}
            </a>
          }
        </nav>

        @if (showProjects()) {
          <div class="side-projects">
            <div class="side-title">Projets</div>
            @for (p of projects(); track p.id) {
              <a [routerLink]="['/projects', p.id]" routerLinkActive="active">
                <i class="pi pi-folder"></i> {{ p.name }}
              </a>
            }
            <a class="see-all" [routerLink]="['/projects']">
              <i class="pi pi-list"></i> Voir tout
            </a>
          </div>
        }
      </aside>
      <div class="col">
        <header class="topbar">
          <div class="who"><i class="pi pi-user"></i><span>{{ name() }}</span></div>
          <p-button label="Déconnexion" icon="pi pi-power-off" severity="danger"
                    size="small" [text]="true" (onClick)="logout()" />
        </header>
        <main><router-outlet /></main>
        <footer>HYDRA — Suivi des chantiers</footer>
      </div>
    </div>
  `,
  styles: [`
    .shell { display: flex; min-height: 100vh; }
    aside { width: 230px; background: #0f172a; color: #fff; padding: 18px 12px; flex-shrink: 0; }
    .brand { font-weight: 800; letter-spacing: 2px; display: flex; gap: 10px; align-items: center;
      padding: 0 10px 16px; font-size: 18px; }
    nav { display: flex; flex-direction: column; gap: 4px; }
    nav a { color: #cbd5e1; text-decoration: none; padding: 13px 12px; border-radius: 10px;
      font-size: 17px; display: flex; gap: 12px; align-items: center; }
    nav a:hover { background: #1e293b; color: #fff; }
    nav a.active { background: #0ea5e9; color: #fff; }
    .side-projects { margin-top: 22px; padding-top: 14px; border-top: 1px solid #1e293b;
      display: flex; flex-direction: column; gap: 2px; }
    .side-title { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;
      letter-spacing: 0.08em; padding: 0 12px 6px; }
    .side-projects a { color: #cbd5e1; text-decoration: none; padding: 9px 12px; border-radius: 8px;
      font-size: 15px; display: flex; gap: 10px; align-items: center;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .side-projects a i { color: #64748b; flex-shrink: 0; }
    .side-projects a:hover { background: #1e293b; color: #fff; }
    .side-projects a.active { background: #0ea5e9; color: #fff; }
    .side-projects a.active i { color: #fff; }
    .side-projects .see-all { margin-top: 6px; font-weight: 600; color: #38bdf8; }
    .col { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .topbar { background: #fff; border-bottom: 1px solid #e2e8f0; padding: 12px 24px;
      display: flex; justify-content: space-between; align-items: center; }
    .who { display: flex; align-items: center; gap: 10px; font-weight: 600; }
    .who i { color: #0ea5e9; }
    main { flex: 1; padding: 24px; }
    footer { text-align: center; color: #94a3b8; font-size: 13px; padding: 12px; }
  `]
})
export class ShellComponent implements OnInit {
  private auth = inject(AuthService);
  private projectService = inject(ProjectService);

  projects = signal<{ id: string; name: string }[]>([]);
  showProjects = computed(() => this.auth.can(PERM.PROJECT_READ));
  name = computed(() => this.auth.me()?.fullName ?? '');
  menu = computed(() => NAV.filter(i => this.auth.can(i.perm)));

  ngOnInit(): void {
    if (!this.showProjects()) { return; }
    this.projectService.options().subscribe({
      next: list => this.projects.set((list ?? []).slice(0, 6)),
      error: () => this.projects.set([])
    });
  }

  logout(): void { this.auth.logout(); }
}
