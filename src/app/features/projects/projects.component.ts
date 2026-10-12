import { Component, OnInit, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { ChipModule } from 'primeng/chip';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../core/auth.service';
import { PERM } from '../../core/permissions';
import { EmptyStateComponent } from '../../shared/empty-state.component';

interface ProjectRow {
  id: string;
  name: string;
  code?: string | null;
  status: string;
}

const STATUS_OPTS = [
  { label: 'Actif', value: 'ACTIF' },
  { label: 'Clôturé', value: 'CLOTURE' }
];

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    DialogModule,
    TagModule,
    ChipModule,
    EmptyStateComponent
  ],
  template: `
    <div class="head">
      <h2><i class="pi pi-briefcase"></i> Chantiers</h2>
      @if (canWrite()) {
        <p-button icon="pi pi-plus" label="Nouveau" (onClick)="openCreate()" />
      }
    </div>

    <div class="grid">
      @for (p of projects; track p.id) {
        <div class="pcard">
          <div class="prow">
            <span class="pname">{{ p.name }}</span>
            <div class="pbadges">
              @if (isActive(p)) {
                <p-tag value="Actif" severity="success" icon="pi pi-check" />
              } @else {
                <p-tag value="Clôturé" severity="secondary" icon="pi pi-lock" />
              }
              @if (canWrite()) {
                <p-button icon="pi pi-pencil" [rounded]="true" [text]="true"
                          (onClick)="openEdit(p)" [attr.aria-label]="'Modifier ' + p.name" />
              }
            </div>
          </div>
          @if (p.code) {
            <div class="pcode"><p-chip [label]="p.code" /></div>
          }
        </div>
      } @empty {
        <app-empty-state icon="pi pi-briefcase" message="Aucun chantier pour le moment."></app-empty-state>
      }
    </div>

    <p-dialog [(visible)]="showDialog" [modal]="true" [style]="{ width: '480px' }"
              [styleClass]="'full-dialog'"
              [header]="mode === 'edit' ? 'Modifier le chantier' : 'Nouveau chantier'">
      <div class="dlg-form">
        <div class="field">
          <label>Nom du chantier</label>
          <input pInputText class="inp" placeholder="Nom du chantier"
                 [(ngModel)]="formName" (keyup.enter)="submit()" />
        </div>
        <div class="field">
          <label>Code (optionnel)</label>
          <input pInputText class="inp" placeholder="Ex. : CHT-01" [(ngModel)]="formCode" />
        </div>
        @if (mode === 'edit') {
          <div class="field">
            <label>Statut</label>
            <p-select [options]="statusOpts" [(ngModel)]="formStatus" optionLabel="label"
                      optionValue="value" styleClass="w100" />
          </div>
        }
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Annuler" [text]="true" (onClick)="showDialog = false" />
        <p-button [label]="mode === 'edit' ? 'Enregistrer' : 'Créer'" icon="pi pi-check"
                  (onClick)="submit()" [disabled]="!formName.trim()" />
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
    .head h2 { margin: 0; display: flex; gap: 10px; align-items: center; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
    .pcard { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px;
      display: flex; flex-direction: column; gap: 10px; align-items: flex-start; }
    .prow { display: flex; justify-content: space-between; width: 100%; align-items: center; gap: 8px; }
    .pname { font-size: 18px; font-weight: 700; }
    .pbadges { display: flex; align-items: center; gap: 6px; }
    .pcode { font-size: 13px; }
    .dlg-form { display: flex; flex-direction: column; gap: 14px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field label { font-size: 13px; font-weight: 700; color: #475569;
      text-transform: uppercase; letter-spacing: 0.03em; }
    .inp { font-size: 17px; padding: 10px 12px; width: 100%; box-sizing: border-box; }
    .w100 { width: 100%; }
    :host ::ng-deep .full-dialog { width: 92vw; max-width: 480px; }
    @media (max-width: 520px) { :host ::ng-deep .full-dialog { width: 96vw; } }
  `]
})
export class ProjectsComponent implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private msgs = inject(MessageService);

  projects: ProjectRow[] = [];
  readonly statusOpts = STATUS_OPTS;

  mode: 'create' | 'edit' = 'create';
  showDialog = false;
  formName = '';
  formCode = '';
  formStatus = 'ACTIF';
  private editTarget: ProjectRow | null = null;

  canWrite = computed(() => this.auth.can(PERM.PROJECT_WRITE));

  ngOnInit(): void { this.load(); }

  isActive(p: ProjectRow): boolean { return (p.status ?? 'ACTIF') === 'ACTIF'; }

  load(): void {
    this.http.get<ProjectRow[]>('/api/projects').subscribe({
      next: list => this.projects = list ?? [],
      error: () => this.msgs.add({ severity: 'error', summary: 'Erreur', detail: 'Chargement impossible' })
    });
  }

  openCreate(): void {
    this.mode = 'create';
    this.formName = '';
    this.formCode = '';
    this.formStatus = 'ACTIF';
    this.editTarget = null;
    this.showDialog = true;
  }

  openEdit(p: ProjectRow): void {
    this.mode = 'edit';
    this.editTarget = p;
    this.formName = p.name ?? '';
    this.formCode = p.code ?? '';
    this.formStatus = (p.status ?? 'ACTIF');
    this.showDialog = true;
  }

  submit(): void {
    if (!this.formName.trim()) { return; }
    if (this.mode === 'edit') { this.saveEdit(); } else { this.create(); }
  }

  create(): void {
    const body = { name: this.formName.trim(), code: this.formCode.trim() || null };
    this.http.post('/api/projects', body).subscribe({
      next: () => {
        this.msgs.add({ severity: 'success', summary: 'Chantier créé' });
        this.showDialog = false; this.load();
      },
      error: (err) => this.msgs.add({ severity: 'error', summary: 'Erreur',
        detail: err.error?.message ?? 'Création impossible' })
    });
  }

  saveEdit(): void {
    if (!this.editTarget) { return; }
    const body = {
      name: this.formName.trim(),
      code: this.formCode.trim() || null,
      status: this.formStatus
    };
    this.http.put(`/api/projects/${this.editTarget.id}`, body).subscribe({
      next: () => {
        this.msgs.add({ severity: 'success', summary: 'Chantier modifié' });
        this.showDialog = false; this.load();
      },
      error: (err) => this.msgs.add({ severity: 'error', summary: 'Erreur',
        detail: err.error?.message ?? 'Modification impossible' })
    });
  }
}