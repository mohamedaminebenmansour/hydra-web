import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TagModule } from 'primeng/tag';
import { ChipModule } from 'primeng/chip';
import { DividerModule } from 'primeng/divider';
import { MessageService } from 'primeng/api';
import { PERM_GROUPS, PERM_LABELS } from '../../core/permissions';
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
  imports: [
    FormsModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    ToggleSwitchModule,
    TagModule,
    ChipModule,
    DividerModule,
    EmptyStateComponent
  ],
  template: `
    <div class="head">
      <h2><i class="pi pi-id-card"></i> Rôles</h2>
      <p-button icon="pi pi-plus" label="Nouveau" (onClick)="openCreate()" />
    </div>

    <div class="grid">
      @for (r of roles; track r.id) {
        <div class="rcard">
          <div class="rhead">
            <span class="rname">{{ r.label }}</span>
            <div class="rbadges">
              @if (r.isSystem) {
                <p-tag value="Système" severity="secondary" icon="pi pi-lock" />
              } @else {
                <p-tag value="Perso" severity="info" />
              }
              @if (!r.isSystem) {
                <p-button icon="pi pi-pencil" [rounded]="true" [text]="true"
                          (onClick)="openEdit(r)" [attr.aria-label]="'Modifier ' + r.label" />
              }
            </div>
          </div>
          <div class="ptags">
            @for (p of firstPerms(r.permissions); track p) {
              <p-chip [label]="permLabel(p)" />
            } @empty {
              <span class="norole">Aucune permission</span>
            }
            @if (extraPerms(r.permissions) > 0) {
              <span class="ptag more">+{{ extraPerms(r.permissions) }}</span>
            }
          </div>
        </div>
      } @empty {
        <app-empty-state icon="pi pi-id-card" message="Aucun rôle."></app-empty-state>
      }
    </div>

    <p-dialog [(visible)]="showDialog" [modal]="true" [style]="{ width: '560px' }"
              [header]="mode === 'edit' ? 'Modifier le rôle' : 'Nouveau rôle'">
      <div class="dlg-form">
        <input pInputText class="role-name" placeholder="Nom du rôle"
               [(ngModel)]="formLabel" (keyup.enter)="submitForm()" />

        @for (g of groups; track g.key) {
          @if (!$first) { <p-divider /> }
          <div class="grp">
            <div class="grp-head"><i [className]="g.icon"></i> {{ g.title }}</div>
            @for (pid of g.ids; track pid) {
              @if (hasPerm(pid)) {
                <div class="perm-row" (click)="onRowClick($event, pid)">
                  <span class="perm-label">{{ permLabel(pid) }}</span>
                  <p-toggleswitch
                    [ngModel]="mode === 'edit' ? editSelected.has(pid) : selected.has(pid)"
                    (onChange)="toggleCurrent(pid, $event.checked)" />
                </div>
              }
            }
          </div>
        }
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Annuler" [text]="true" (onClick)="showDialog = false" />
        <p-button [label]="mode === 'edit' ? 'Enregistrer' : 'Créer'" icon="pi pi-check"
                  (onClick)="submitForm()" [disabled]="!formLabel.trim()" />
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
    .head h2 { margin: 0; display: flex; gap: 10px; align-items: center; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
    .rcard { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px;
      display: flex; flex-direction: column; gap: 10px; align-items: flex-start; }
    .rhead { display: flex; justify-content: space-between; width: 100%; align-items: center; gap: 8px; }
    .rname { font-size: 18px; font-weight: 700; }
    .rbadges { display: flex; align-items: center; gap: 6px; }
    .ptags { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; font-size: 12px; }
    .ptag { background: #f1f5f9; color: #334155; font-size: 12px; font-weight: 600;
      padding: 3px 10px; border-radius: 999px; }
    .norole { color: #94a3b8; font-size: 12px; font-style: italic; }
    .dlg-form { display: flex; flex-direction: column; gap: 4px; }
    .role-name { font-size: 17px; padding: 10px 12px; margin-bottom: 6px; }
    .grp-head { display: flex; align-items: center; gap: 8px; margin-top: 10px;
      font-size: 13px; font-weight: 700; color: #475569; text-transform: uppercase;
      letter-spacing: 0.03em; }
    .perm-row { display: flex; justify-content: space-between; align-items: center; gap: 12px;
      min-height: 44px; padding: 4px 8px; border-radius: 8px; cursor: pointer; }
    .perm-row:hover { background: #f8fafc; }
    .perm-label { font-size: 15px; color: #1e293b; }
  `]
})
export class RolesComponent {
  private http = inject(HttpClient);
  private msgs = inject(MessageService);

  roles: RoleRow[] = [];
  permissions: PermRow[] = [];
  readonly groups = PERM_GROUPS;

  mode: 'create' | 'edit' = 'create';
  showDialog = false;
  label = '';
  selected = new Set<string>();

  editTarget: RoleRow | null = null;
  editLabel = '';
  editSelected = new Set<string>();

  private permIds = new Set<string>();

  constructor() { this.load(); }

  get formLabel(): string {
    return this.mode === 'edit' ? this.editLabel : this.label;
  }

  set formLabel(value: string) {
    if (this.mode === 'edit') { this.editLabel = value; } else { this.label = value; }
  }

  permLabel(id: string): string { return PERM_LABELS[id] ?? id; }

  hasPerm(id: string): boolean { return this.permIds.has(id); }

  firstPerms(perms: string[]): string[] { return perms.slice(0, 4); }

  extraPerms(perms: string[]): number { return Math.max(0, perms.length - 4); }

  load(): void {
    this.http.get<RoleRow[]>('/api/roles').subscribe(r => this.roles = r);
    this.http.get<PermRow[]>('/api/roles/permissions').subscribe(p => {
      this.permissions = p;
      this.permIds = new Set(p.map(x => x.id));
    });
  }

  openCreate(): void {
    this.mode = 'create';
    this.label = '';
    this.selected.clear();
    this.showDialog = true;
  }

  openEdit(r: RoleRow): void {
    this.mode = 'edit';
    this.editTarget = r;
    this.editLabel = r.label;
    this.editSelected = new Set(r.permissions);
    this.showDialog = true;
  }

  toggle(id: string, on: boolean): void {
    if (on) { this.selected.add(id); } else { this.selected.delete(id); }
  }

  toggleEdit(id: string, on: boolean): void {
    if (on) { this.editSelected.add(id); } else { this.editSelected.delete(id); }
  }

  toggleCurrent(id: string, on: boolean): void {
    if (this.mode === 'edit') { this.toggleEdit(id, on); } else { this.toggle(id, on); }
  }

  onRowClick(ev: Event, id: string): void {
    const target = ev.target as HTMLElement | null;
    if (target && target.closest('p-toggleswitch')) { return; }
    const on = !(this.mode === 'edit' ? this.editSelected.has(id) : this.selected.has(id));
    this.toggleCurrent(id, on);
  }

  submitForm(): void {
    if (this.mode === 'edit') { this.saveEdit(); } else { this.create(); }
  }

  create(): void {
    if (!this.label.trim()) { return; }
    this.http.post('/api/roles', { label: this.label, permissionCodes: [...this.selected] }).subscribe({
      next: () => {
        this.msgs.add({ severity: 'success', summary: 'Rôle créé' });
        this.label = ''; this.selected.clear(); this.showDialog = false; this.load();
      },
      error: (err) => this.msgs.add({ severity: 'error', summary: 'Erreur',
        detail: err.error?.message ?? 'Création impossible' })
    });
  }

  saveEdit(): void {
    if (!this.editTarget) { return; }
    this.http.put(`/api/roles/${this.editTarget.id}`, {
      label: this.editLabel, permissionCodes: [...this.editSelected]
    }).subscribe({
      next: () => {
        this.msgs.add({ severity: 'success', summary: 'Rôle modifié' });
        this.showDialog = false; this.load();
      },
      error: (err) => this.msgs.add({ severity: 'error', summary: 'Erreur',
        detail: err.error?.message ?? 'Modification impossible' })
    });
  }
}
