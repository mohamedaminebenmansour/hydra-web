import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../core/auth.service';
import { PERM } from '../../core/permissions';
import { EmptyStateComponent } from '../../shared/empty-state.component';

interface RoleRef { code: string; label: string; }

interface UserRow {
  id: string;
  email: string;
  fullName: string;
  isOwner: boolean;
  isActive: boolean;
  roles: RoleRef[];
}

/** Shape returned by GET /api/users (parallel roleCodes/roleLabels arrays). */
interface UserDto {
  id: string;
  email: string;
  fullName: string;
  isOwner: boolean;
  isActive: boolean;
  roleCodes: string[];
  roleLabels: string[];
}

interface RoleRow { id: string; code: string; label: string; isSystem: boolean; }

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [FormsModule, ButtonModule, InputTextModule, DialogModule, EmptyStateComponent],
  template: `
    <div class="head">
      <h2><i class="pi pi-users"></i> Utilisateurs</h2>
      <p-button icon="pi pi-plus" label="Nouveau" (onClick)="showForm = !showForm" />
    </div>

    @if (showForm) {
      <div class="form">
        <input pInputText placeholder="Nom complet" [(ngModel)]="fullName" />
        <input pInputText type="email" placeholder="Email" [(ngModel)]="email" />
        <input pInputText type="password" placeholder="Mot de passe (8 caractères min.)"
               [(ngModel)]="password" (keyup.enter)="create()" />

        <div class="rb-title">Rôles</div>
        <div class="rb-grid">
          @for (r of roles; track r.code) {
            <label class="rb-item">
              <input type="checkbox" [checked]="selectedRoles.has(r.code)"
                     (change)="toggleRole(r.code, $event)" />
              {{ r.label }}
            </label>
          }
        </div>

        @if (createConflict) {
          <div class="conflict">
            <div class="conflict-msg">
              <i class="pi pi-exclamation-triangle"></i> {{ createConflict }}
            </div>
            <input pInputText placeholder="Raison de la dérogation (obligatoire)"
                   [(ngModel)]="createOverrideReason" />
            <p-button label="Forcer quand même" icon="pi pi-shield" severity="danger"
                      (onClick)="create()" [disabled]="!createOverrideReason.trim()" />
          </div>
        }

        <p-button label="Créer" icon="pi pi-check" (onClick)="create()"
                  [disabled]="!fullName.trim() || !email.trim() || !password" />
      </div>
    }

    @for (u of users; track u.id) {
      <div class="card">
        <div class="left">
          <div class="title">
            {{ u.fullName }}
            @if (u.isOwner) { <span class="tag tag-owner">Gérant</span> }
          </div>
          <div class="sub">{{ u.email }}</div>
          <div class="ptags">
            @for (r of u.roles; track r.code) {
              <span class="ptag">{{ r.label }}</span>
            } @empty {
              <span class="norole">Aucun rôle</span>
            }
          </div>
        </div>
        <div class="right">
          <span class="tag" [class.tag-done]="u.isActive" [class.tag-open]="!u.isActive">
            {{ u.isActive ? 'Actif' : 'Inactif' }}
          </span>
          @if (!u.isOwner) {
            @if (canAssign()) {
              <p-button label="Rôles" icon="pi pi-id-card" size="small"
                        severity="secondary" (onClick)="openRoles(u)" />
            }
            @if (canUpdate()) {
              <p-button label="Modifier" icon="pi pi-pencil" size="small"
                        severity="secondary" (onClick)="openEdit(u)" />
            }
            @if (canDeactivate()) {
              <p-button [label]="u.isActive ? 'Désactiver' : 'Réactiver'"
                        [icon]="u.isActive ? 'pi pi-ban' : 'pi pi-check-circle'"
                        size="small" [severity]="u.isActive ? 'danger' : 'success'"
                        (onClick)="setActive(u, !u.isActive)" />
            }
          }
        </div>
      </div>
    } @empty {
      @if (loaded) {
        <app-empty-state icon="pi pi-users" message="Aucun utilisateur pour le moment."></app-empty-state>
      }
    }

    <p-dialog header="Attribuer les rôles" [(visible)]="showRolesDialog"
              [modal]="true" [style]="{ width: '480px' }">
      <div class="dlg-form">
        @if (rolesTarget) {
          <div class="dlg-who">{{ rolesTarget.fullName }} — {{ rolesTarget.email }}</div>
        }
        <div class="rb-grid">
          @for (r of roles; track r.code) {
            <label class="rb-item">
              <input type="checkbox" [checked]="rolesSelected.has(r.code)"
                     (change)="toggleRoleEdit(r.code, $event)" />
              {{ r.label }}
            </label>
          }
        </div>

        @if (rolesConflict) {
          <div class="conflict">
            <div class="conflict-msg">
              <i class="pi pi-exclamation-triangle"></i> {{ rolesConflict }}
            </div>
            <input pInputText placeholder="Raison de la dérogation (obligatoire)"
                   [(ngModel)]="rolesOverrideReason" />
            <p-button label="Forcer quand même" icon="pi pi-shield" severity="danger"
                      (onClick)="saveRoles(true)" [disabled]="!rolesOverrideReason.trim()" />
          </div>
        }
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Annuler" [text]="true" (onClick)="showRolesDialog = false" />
        <p-button label="Enregistrer" icon="pi pi-check" (onClick)="saveRoles()" />
      </ng-template>
    </p-dialog>

    <p-dialog header="Modifier l'utilisateur" [(visible)]="showEditDialog"
              [modal]="true" [style]="{ width: '440px' }">
      <div class="dlg-form">
        @if (editTarget) {
          <div class="dlg-who">{{ editTarget.email }}</div>
        }
        <input pInputText placeholder="Nom complet" [(ngModel)]="editFullName" />
        <input pInputText type="password" placeholder="Nouveau mot de passe (optionnel)"
               [(ngModel)]="editPassword" (keyup.enter)="saveEdit()" />
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Annuler" [text]="true" (onClick)="showEditDialog = false" />
        <p-button label="Enregistrer" icon="pi pi-check" (onClick)="saveEdit()"
                  [disabled]="!editFullName.trim()" />
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
    .head h2 { margin: 0; display: flex; gap: 10px; align-items: center; }
    .form { display: flex; flex-direction: column; gap: 10px; max-width: 560px; margin-bottom: 24px;
      background: #fff; padding: 18px; border-radius: 12px; border: 1px solid #e2e8f0; }
    .form input { font-size: 17px; }
    .rb-title { font-weight: 700; }
    .rb-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .rb-item { display: flex; gap: 8px; align-items: center; font-size: 16px; padding: 6px 4px; cursor: pointer; }
    .rb-item input { width: 18px; height: 18px; }
    .conflict { background: #fef2f2; border: 1px solid #dc2626; border-radius: 10px;
      padding: 12px; display: flex; flex-direction: column; gap: 10px; }
    .conflict-msg { color: #b91c1c; font-weight: 700; display: flex; gap: 8px; align-items: flex-start; }
    .card { display: flex; justify-content: space-between; align-items: center; background: #fff;
      border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 18px; margin-bottom: 10px; gap: 12px; }
    .title { font-size: 18px; font-weight: 600; display: flex; gap: 10px; align-items: center; }
    .sub { color: #64748b; margin-top: 3px; }
    .ptags { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
    .ptag { background: #f1f5f9; color: #334155; font-size: 12px; font-weight: 600;
      padding: 3px 10px; border-radius: 999px; }
    .norole { color: #94a3b8; font-size: 13px; font-style: italic; }
    .right { display: flex; gap: 10px; align-items: center; flex-shrink: 0; }
    .tag { padding: 5px 14px; border-radius: 999px; font-size: 13px; font-weight: 700; white-space: nowrap; }
    .tag-open { background: #fef3c7; color: #92400e; }
    .tag-done { background: #dcfce7; color: #166534; }
    .tag-owner { background: #ede9fe; color: #5b21b6; font-size: 12px; }
    .dlg-form { display: flex; flex-direction: column; gap: 12px; }
    .dlg-who { color: #64748b; font-size: 14px; font-weight: 600; }
  `]
})
export class UsersComponent {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private msgs = inject(MessageService);

  users: UserRow[] = [];
  roles: RoleRow[] = [];
  loaded = false;

  showForm = false;
  fullName = '';
  email = '';
  password = '';
  selectedRoles = new Set<string>();
  createConflict = '';
  createOverrideReason = '';

  showRolesDialog = false;
  rolesTarget: UserRow | null = null;
  rolesSelected = new Set<string>();
  rolesConflict = '';
  rolesOverrideReason = '';

  showEditDialog = false;
  editTarget: UserRow | null = null;
  editFullName = '';
  editPassword = '';

  canUpdate = computed(() => this.auth.can(PERM.USER_UPDATE));
  canDeactivate = computed(() => this.auth.can(PERM.USER_DEACTIVATE));
  canAssign = computed(() => this.auth.can(PERM.ROLE_ASSIGN));

  constructor() { this.load(); }

  load(): void {
    this.http.get<UserDto[]>('/api/users').subscribe(list => {
      this.users = list.map(d => ({
        id: d.id,
        email: d.email,
        fullName: d.fullName,
        isOwner: d.isOwner,
        isActive: d.isActive,
        roles: d.roleCodes.map((code, i) => ({ code, label: d.roleLabels[i] ?? code }))
      }));
      this.loaded = true;
    });
    this.http.get<RoleRow[]>('/api/roles').subscribe(r => this.roles = r);
  }

  toggleRole(code: string, ev: Event): void {
    const c = (ev.target as HTMLInputElement).checked;
    if (c) { this.selectedRoles.add(code); } else { this.selectedRoles.delete(code); }
  }

  toggleRoleEdit(code: string, ev: Event): void {
    const c = (ev.target as HTMLInputElement).checked;
    if (c) { this.rolesSelected.add(code); } else { this.rolesSelected.delete(code); }
  }

  create(): void {
    this.http.post('/api/users', {
      fullName: this.fullName,
      email: this.email,
      password: this.password,
      roleCodes: [...this.selectedRoles],
      overrideReason: this.createOverrideReason || undefined
    }).subscribe({
      next: () => {
        this.msgs.add({ severity: 'success', summary: 'Utilisateur créé' });
        this.email = ''; this.fullName = ''; this.password = '';
        this.selectedRoles.clear(); this.showForm = false;
        this.createOverrideReason = '';
        this.load();
      },
      error: (err) => this.handleError(err, m => this.createConflict = m,
        () => { this.createConflict = ''; this.load(); })
    });
  }

  openRoles(u: UserRow): void {
    this.rolesTarget = u;
    this.rolesSelected = new Set(u.roles.map(r => r.code));
    this.rolesConflict = '';
    this.rolesOverrideReason = '';
    this.showRolesDialog = true;
  }

  saveRoles(override = false): void {
    if (!this.rolesTarget) return;
    this.rolesConflict = '';
    this.http.put(`/api/users/${this.rolesTarget.id}/roles`, {
      roleCodes: [...this.rolesSelected],
      overrideReason: override ? this.rolesOverrideReason : undefined
    }).subscribe({
      next: () => {
        this.msgs.add({ severity: 'success', summary: 'Rôles enregistrés',
          detail: 'La personne doit se reconnecter.' });
        this.showRolesDialog = false;
        this.load();
      },
      error: (err) => this.handleError(err, m => this.rolesConflict = m,
        () => { this.rolesConflict = ''; this.showRolesDialog = false; this.load(); })
    });
  }

  openEdit(u: UserRow): void {
    this.editTarget = u;
    this.editFullName = u.fullName;
    this.editPassword = '';
    this.showEditDialog = true;
  }

  saveEdit(): void {
    if (!this.editTarget) return;
    this.http.put(`/api/users/${this.editTarget.id}`, {
      fullName: this.editFullName, password: this.editPassword || undefined
    }).subscribe({
      next: () => {
        this.msgs.add({ severity: 'success', summary: 'Utilisateur modifié' });
        this.showEditDialog = false;
        this.load();
      },
      error: () => this.msgs.add({ severity: 'error', summary: 'Erreur', detail: 'Modification impossible' })
    });
  }

  setActive(u: UserRow, active: boolean): void {
    this.http.post(`/api/users/${u.id}/${active ? 'activate' : 'deactivate'}`, {}).subscribe({
      next: () => {
        this.msgs.add({ severity: 'success',
          summary: active ? 'Utilisateur réactivé' : 'Utilisateur désactivé' });
        this.load();
      },
      error: (err) => this.msgs.add({ severity: 'error', summary: 'Erreur',
        detail: err.error?.message ?? 'Action impossible' })
    });
  }

  private handleError(err: any, setConflict: (m: string) => void, onSuccessOverride: () => void): void {
    if (err.status === 409 && (err.error?.code === 'TOXIC_PAIR_CONFLICT' || err.error?.code === 'TOXIC_PAIR')) {
      setConflict(err.error.message);
    } else {
      this.msgs.add({ severity: 'error', summary: 'Erreur',
        detail: err.error?.message ?? 'Action impossible' });
      onSuccessOverride();
    }
  }
}
