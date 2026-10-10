import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { AuthService } from '../../core/auth.service';
import { PERM } from '../../core/permissions';

interface NavItem { label: string; icon: string; path: string; perm: string; }

const NAV: NavItem[] = [
  { label: 'Accueil',        icon: 'pi pi-home',     path: '/',        perm: '' },
  { label: 'Tickets',        icon: 'pi pi-ticket',   path: '/tickets', perm: PERM.TICKET_READ },
  { label: 'Utilisateurs',   icon: 'pi pi-users',    path: '/users',   perm: PERM.USER_CREATE },
  { label: 'Rôles',          icon: 'pi pi-id-card',  path: '/roles',   perm: PERM.ROLE_MANAGE }
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
    .col { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .topbar { background: #fff; border-bottom: 1px solid #e2e8f0; padding: 12px 24px;
      display: flex; justify-content: space-between; align-items: center; }
    .who { display: flex; align-items: center; gap: 10px; font-weight: 600; }
    .who i { color: #0ea5e9; }
    main { flex: 1; padding: 24px; }
    footer { text-align: center; color: #94a3b8; font-size: 13px; padding: 12px; }
  `]
})
export class ShellComponent {
  private auth = inject(AuthService);
  name = computed(() => this.auth.me()?.fullName ?? '');
  menu = computed(() => NAV.filter(i => this.auth.can(i.perm)));
  logout(): void { this.auth.logout(); }
}