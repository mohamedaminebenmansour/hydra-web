import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { PERM } from '../../core/permissions';
import { EmptyStateComponent } from '../../shared/empty-state.component';

interface Tile { label: string; icon: string; path: string; perm: string; color: string; desc: string; }

const TILES: Tile[] = [
  { label: 'Tickets',       icon: 'pi pi-ticket',  path: '/tickets', perm: PERM.TICKET_READ, color: '#d97706', desc: 'Travaux assignés' },
  { label: 'Chantiers',     icon: 'pi pi-briefcase', path: '/projects', perm: PERM.PROJECT_READ, color: '#0d9488', desc: 'Projets et travaux' },
  { label: 'Utilisateurs',  icon: 'pi pi-users',   path: '/users',   perm: PERM.USER_CREATE, color: '#0ea5e9', desc: 'Gérer les accès' },
  { label: 'Rôles',         icon: 'pi pi-id-card', path: '/roles',   perm: PERM.ROLE_MANAGE, color: '#7c3aed', desc: 'Configurer les droits' },
  { label: 'Journal',       icon: 'pi pi-history', path: '/audit',   perm: PERM.AUDIT_VIEW,  color: '#0d9488', desc: "Voir l'activité" }
];

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, EmptyStateComponent],
  template: `
    <h2>Bonjour, {{ name() }}</h2>
    <p class="sub">Que voulez-vous faire ?</p>
    @if (tiles().length) {
      <div class="tiles">
        @for (t of tiles(); track t.path) {
          <a class="tile" [routerLink]="t.path">
            <i class="pi {{ t.icon }}" [style.color]="t.color"></i>
            <div class="t-label">{{ t.label }}</div>
            <div class="t-desc">{{ t.desc }}</div>
          </a>
        }
      </div>
    } @else {
      <app-empty-state icon="pi pi-lock"
        message="Aucun module ne vous est encore attribué. Demandez au gérant de vous donner un accès.">
      </app-empty-state>
    }
  `,
  styles: [`
    h2 { margin: 0 0 4px; } .sub { color: #64748b; margin: 0 0 24px; }
    .tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px; max-width: 900px; }
    .tile { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 28px 20px;
      text-decoration: none; color: inherit; display: flex; flex-direction: column;
      align-items: flex-start; gap: 8px; transition: box-shadow .15s; }
    .tile:hover { box-shadow: 0 6px 20px rgba(15,23,42,.12); }
    .tile i { font-size: 2.4rem; }
    .t-label { font-size: 20px; font-weight: 700; }
    .t-desc { color: #64748b; }
  `]
})
export class HomeComponent {
  private auth = inject(AuthService);
  name = computed(() => this.auth.me()?.fullName ?? '');
  tiles = computed(() => TILES.filter(t => this.auth.can(t.perm)));
}