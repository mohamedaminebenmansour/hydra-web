import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { PERM_LABELS } from '../../core/permissions';
import { EmptyStateComponent } from '../../shared/empty-state.component';

interface RoleRow {
  id: string;
  code: string;
  label: string;
  isSystem: boolean;
  permissions: string[];
}

interface PermRow { id: string; description: string | null; }

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [FormsModule, ButtonModule, InputTextModule, DialogModule, EmptyStateComponent],
  template: `
    <div class="head">
      <h2><i class="pi pi-id-card"></i> Rôles</h2>
      <p-button icon="pi pi-plus" label="Nouveau rôle" (onClick)="showForm = !showForm" />
    </div>

    @if (showForm) {
      <div class="form">
        <input pInputText placeholder="Nom du rôle (ex. : Lecture seule)" [(ngModel)]="label"
               (keyup.enter)="create()" />
        <div class="rb-title">Permissions</div>
        <div class="rb-grid">
          @for (p of permissions; track p.id) {
            <label class="rb-item">
              <input type="checkbox" [checked]="selected.has(p.id)" (change)="toggle(p.id, $event)" />
              {{ permLabel(p.id) }}
            </label>
          }
        </div>
        <p-button label="Créer" icon="pi pi-check" (onClick)="create()" [disabled]="!label.trim()" />
      </div>
    }

    <div class="grid">
      @for (r of roles; track r.id) {
        <div class="rcard">
          <div class="rhead">
            <span class="rname">{{ r.label }}</span>
            @if (r.isSystem) {
              <span class="sys"><i class="pi pi-lock"></i> Système</span>
            } @else {
              <span class="cust">Personnalisé</span>
            }
          </div>
          <div class="ptags">
            @for (p of r.permissions; track p) {
              <span class="ptag">{{ permLabel(p) }}</span>
            } @empty {
              <span class="norole">Aucune permission</span>
            }
          </div>
          @if (!r.isSystem) {
            <p-button label="Modifier" icon="pi pi-pencil" size="small"
                      severity="secondary" (onClick)="openEdit(r)" />
          }
        </div>
      } @empty {
        <app-empty-state icon="pi pi-id-card" message="Aucun rôle."></app-empty-state>
      }
    </div>

    <p-dialog header="Modifier le rôle" [(visible)]="showEditDialog"
              [modal]="true" [style]="{ width: '560px' }">
      <div class="dlg-form">
        <input pInputText placeholder="Nom du rôle" [(ngModel)]="editLabel" />
        <div class="rb-title">Permissions</div>
        <div class="rb-grid">
          @for (p of permissions; track p.id) {
            <label class="rb-item">
              <input type="checkbox" [checked]="editSelected.has(p.id)"
                     (change)="toggleEdit(p.id, $event)" />
              {{ permLabel(p.id) }}
            </label>
          }
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Annuler" [text]="true" (onClick)="showEditDialog = false" />
        <p-button label="Enregistrer" icon="pi pi-check" (onClick)="saveEdit()"
                  [disabled]="!editLabel.trim()" />
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
    .head h2 { margin: 0; display: flex; gap: 10px; align-items: center; }
    .form { display: flex; flex-direction: column; gap: 10px; max-width: 560px; margin-bottom: 24px;
      background: #fff; padding: 18px; border-radius: 12px; border: 1px solid #e2e8f0; }
    .form input { font-size: 17px; }
    .rb-title { font-weight: 700; margin-bottom: 8px; }
    .rb-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .rb-item { display: flex; gap: 8px; align-items: center; font-size: 16px; padding: 6px 4px; cursor: pointer; }
    .rb-item input { width: 18px; height: 18px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
    .rcard { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px;
      display: flex; flex-direction: column; gap: 10px; align-items: flex-start; }
    .rhead { display: flex; justify-content: space-between; width: 100%; align-items: center; }
    .rname { font-size: 18px; font-weight: 700; }
    .sys { color: #64748b; font-size: 13px; font-weight: 600; display: flex; gap: 5px; align-items: center; }
    .cust { background: #ede9fe; color: #5b21b6; font-size: 12px; font-weight: 700;
      padding: 3px 10px; border-radius: 999px; }
    .ptags { display: flex; gap: 6px; flex-wrap: wrap; }
    .ptag { background: #f1f5f9; color: #334155; font-size: 12px; font-weight: 600;
      padding: 3px 10px; border-radius: 999px; }
    .norole { color: #94a3b8; font-size: 12px; font-style: italic; }
    .dlg-form { display: flex; flex-direction: column; gap: 10px; }
  `]
})
export class RolesComponent {
  private http = inject(HttpClient);
  private msgs = inject(MessageService);

  roles: RoleRow[] = [];
  permissions: PermRow[] = [];
  showForm = false;
  label = '';
  selected = new Set<string>();

  showEditDialog = false;
  editTarget: RoleRow | null = null;
  editLabel = '';
  editSelected = new Set<string>();

  constructor() { this.load(); }

  permLabel(id: string): string { return PERM_LABELS[id] ?? id; }

  load(): void {
    this.http.get<RoleRow[]>('/api/roles').subscribe(r => this.roles = r);
    this.http.get<PermRow[]>('/api/roles/permissions').subscribe(p => this.permissions = p);
  }

  toggle(id: string, ev: Event): void {
    const c = (ev.target as HTMLInputElement).checked;
    if (c) { this.selected.add(id); } else { this.selected.delete(id); }
  }

  toggleEdit(id: string, ev: Event): void {
    const c = (ev.target as HTMLInputElement).checked;
    if (c) { this.editSelected.add(id); } else { this.editSelected.delete(id); }
  }

  create(): void {
    this.http.post('/api/roles', { label: this.label, permissionCodes: [...this.selected] }).subscribe({
      next: () => {
        this.msgs.add({ severity: 'success', summary: 'Rôle créé' });
        this.label = ''; this.selected.clear(); this.showForm = false; this.load();
      },
      error: (err) => this.msgs.add({ severity: 'error', summary: 'Erreur',
        detail: err.error?.message ?? 'Création impossible' })
    });
  }

  openEdit(r: RoleRow): void {
    this.editTarget = r;
    this.editLabel = r.label;
    this.editSelected = new Set(r.permissions);
    this.showEditDialog = true;
  }

  saveEdit(): void {
    if (!this.editTarget) return;
    this.http.put(`/api/roles/${this.editTarget.id}`, {
      label: this.editLabel, permissionCodes: [...this.editSelected]
    }).subscribe({
      next: () => {
        this.msgs.add({ severity: 'success', summary: 'Rôle modifié' });
        this.showEditDialog = false; this.load();
      },
      error: (err) => this.msgs.add({ severity: 'error', summary: 'Erreur',
        detail: err.error?.message ?? 'Modification impossible' })
    });
  }
}