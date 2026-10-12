import { Component, OnInit, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { ChipModule } from 'primeng/chip';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../core/auth.service';
import { PERM } from '../../core/permissions';
import { EmptyStateComponent } from '../../shared/empty-state.component';

interface ProjectRow { id: string; name: string; status: string; }
interface UserOpt { id: string; label: string; }

interface Ticket {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  projectId: string | null;
  projectName: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  startAt: string | null;
  dueAt: string | null;
  documentId: string | null;
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  OUVERT: 'Ouvert', EN_COURS: 'En cours', EN_ATTENTE: 'En attente', RESOLU: 'Résolu'
};
const STATUS_ICONS: Record<string, string> = {
  OUVERT: 'pi pi-circle', EN_COURS: 'pi pi-play', EN_ATTENTE: 'pi pi-pause', RESOLU: 'pi pi-check'
};
const STATUS_CLASS: Record<string, string> = {
  OUVERT: 'st-ouvert', EN_COURS: 'st-encours', EN_ATTENTE: 'st-attente', RESOLU: 'st-resolu'
};
const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Basse', MEDIUM: 'Moyenne', HIGH: 'Haute'
};
const PRIORITY_ICONS: Record<string, string> = {
  HIGH: 'pi pi-exclamation-triangle', MEDIUM: 'pi pi-minus', LOW: 'pi pi-circle'
};
const PRIORITY_CLASS: Record<string, string> = {
  HIGH: 'prio-high', MEDIUM: 'prio-med', LOW: 'prio-low'
};

@Component({
  selector: 'app-tickets',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    DatePickerModule,
    DialogModule,
    TagModule,
    ChipModule,
    ToggleSwitchModule,
    EmptyStateComponent
  ],
  template: `
    <div class="head">
      <h2><i class="pi pi-ticket"></i> Tickets</h2>
      @if (canWrite()) {
        <p-button icon="pi pi-plus" label="Nouveau" (onClick)="openCreate()" />
      }
    </div>

    <div class="filters">
      <p-select [options]="projectOpts()" [(ngModel)]="fProject" placeholder="Tous les chantiers"
                [showClear]="true" optionLabel="label" optionValue="value" styleClass="f-item" />
      <p-select [options]="statusOpts" [(ngModel)]="fStatus" optionLabel="label" optionValue="value"
                styleClass="f-item" />
      <p-select [options]="priorityOpts" [(ngModel)]="fPriority" placeholder="Toutes priorités"
                [showClear]="true" optionLabel="label" optionValue="value" styleClass="f-item" />
      <div class="mine" [class.on]="fMine">
        <p-toggleswitch [(ngModel)]="fMine" inputId="mine-toggle" />
        <label for="mine-toggle">Mes tickets</label>
      </div>
      <div class="f-btns">
        <p-button label="Appliquer" icon="pi pi-filter" (onClick)="apply()" />
        <p-button label="Réinitialiser" icon="pi pi-times" [text]="true" (onClick)="reset()" />
      </div>
    </div>

    <div class="list">
      @for (t of tickets; track t.id) {
        <div class="card">
          <div class="status" [class]="statusClass(t.status)">
            <i [class]="statusIcon(t.status)"></i>
            <span class="status-text">{{ statusLabel(t.status) }}</span>
          </div>
          <div class="left">
            <div class="title">
              {{ t.title }}
              @if (isOverdue(t)) { <span class="retard">En retard</span> }
            </div>
            @if (t.description) { <div class="sub">{{ t.description }}</div> }
            <div class="meta">
              <span class="prio" [class]="priorityClass(t.priority)">
                <i [class]="priorityIcon(t.priority)"></i> {{ priorityLabel(t.priority) }}
              </span>
              @if (t.projectName) { <p-chip [label]="t.projectName" /> }
              <span class="assignee">
                <i class="pi pi-user"></i> {{ t.assignedToName ?? 'Non assigné' }}
              </span>
              @if (t.dueAt) {
                <span class="due" [class.overdue]="isOverdue(t)">
                  <i class="pi pi-calendar"></i> Échéance : {{ fmtDate(t.dueAt) }}
                </span>
              }
            </div>
          </div>
          <div class="right">
            @if (t.status === 'OUVERT' && canAct(t)) {
              <p-button label="Démarrer" icon="pi pi-play" size="large" severity="info"
                        (onClick)="start(t.id)" />
            }
            @if (t.status === 'EN_COURS' && canAct(t)) {
              <p-button label="Pause" icon="pi pi-pause" size="large" severity="secondary"
                        (onClick)="wait(t.id)" />
            }
            @if ((t.status === 'EN_COURS' || t.status === 'EN_ATTENTE') && canAct(t)) {
              <p-button label="Reprendre" icon="pi pi-refresh" size="large" severity="info"
                        (onClick)="resume(t.id)" />
            }
            @if ((t.status === 'OUVERT' || t.status === 'EN_COURS' || t.status === 'EN_ATTENTE') && canAct(t)) {
              <p-button label="Clôturer" icon="pi pi-check-circle" size="large" severity="success"
                        (onClick)="close(t.id)" />
            }
            @if (canWrite()) {
              <p-button icon="pi pi-pencil" [rounded]="true" [text]="true"
                        (onClick)="openEdit(t)" [attr.aria-label]="'Modifier ' + t.title" />
            }
          </div>
        </div>
      } @empty {
        @if (loaded) {
          <app-empty-state icon="pi pi-inbox" message="Aucun ticket. Tout va bien."></app-empty-state>
        }
      }
    </div>

    <p-dialog [(visible)]="showDialog" [modal]="true" [styleClass]="'ticket-dialog'"
              [style]="{ width: '560px' }"
              [header]="mode === 'edit' ? 'Modifier le ticket' : 'Nouveau ticket'">
      <div class="dlg-form">
        <div class="field">
          <label>Titre</label>
          <input pInputText class="inp" placeholder="Titre du problème"
                 [(ngModel)]="formTitle" />
        </div>
        <div class="field">
          <label>Détails (optionnel)</label>
          <textarea pTextarea rows="3" [(ngModel)]="formDescription"></textarea>
        </div>
        <div class="field">
          <label>Chantier</label>
          <p-select [options]="activeProjectOpts()" [(ngModel)]="formProject"
                    placeholder="Choisir un chantier" optionLabel="label" optionValue="value"
                    styleClass="w100" />
        </div>
        @if (canWrite()) {
          <div class="field">
            <label>Assigné à (optionnel)</label>
            <p-select [options]="userOpts()" [(ngModel)]="formAssignee"
                      placeholder="Non assigné" [showClear]="true" optionLabel="label"
                      optionValue="value" styleClass="w100" />
          </div>
        }
        <div class="field">
          <label>Priorité</label>
          <p-select [options]="priorityOpts" [(ngModel)]="formPriority" optionLabel="label"
                    optionValue="value" styleClass="w100" />
        </div>
        <div class="two">
          <div class="field">
            <label>Début</label>
            <p-datepicker [(ngModel)]="formStart" dateFormat="dd/mm/yy" [showIcon]="true"
                          styleClass="w100" placeholder="jj/mm/aa" />
          </div>
          <div class="field">
            <label>Échéance</label>
            <p-datepicker [(ngModel)]="formDue" dateFormat="dd/mm/yy" [showIcon]="true"
                          styleClass="w100" placeholder="jj/mm/aa" />
          </div>
        </div>
        <div class="field secondary">
          <label>Document (optionnel)</label>
          <input pInputText class="doc-inp" placeholder="Identifiant du document"
                 [(ngModel)]="formDocumentId" />
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Annuler" [text]="true" (onClick)="showDialog = false" />
        <p-button [label]="mode === 'edit' ? 'Enregistrer' : 'Créer'" icon="pi pi-check"
                  size="large" severity="success"
                  (onClick)="submit()" [disabled]="!formTitle.trim()" />
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
    .head h2 { margin: 0; display: flex; gap: 10px; align-items: center; }
    .filters { display: flex; flex-wrap: wrap; gap: 10px; align-items: center;
      background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; margin-bottom: 16px; }
    .f-item { min-width: 170px; }
    .mine { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700;
      padding: 10px 14px; border-radius: 10px; border: 1px solid #cbd5e1; background: #f8fafc;
      color: #475569; transition: all .15s; }
    .mine.on { border-color: #0ea5e9; background: #e0f2fe; color: #075985; }
    .f-btns { display: flex; gap: 8px; margin-left: auto; }
    .list { display: flex; flex-direction: column; gap: 10px; }
    .card { display: flex; align-items: center; gap: 16px; background: #fff;
      border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 18px; }
    .status { display: flex; flex-direction: column; align-items: center; gap: 5px;
      min-width: 62px; flex-shrink: 0; }
    .status i { font-size: 20px; width: 46px; height: 46px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center; color: #fff; }
    .status.st-ouvert i { background: #f59e0b; }
    .status.st-encours i { background: #3b82f6; }
    .status.st-attente i { background: #94a3b8; }
    .status.st-resolu i { background: #22c55e; }
    .status-text { font-size: 12px; font-weight: 700; color: #475569; }
    .left { flex: 1; min-width: 0; }
    .title { font-size: 18px; font-weight: 600; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .retard { background: #fee2e2; color: #b91c1c; font-size: 12px; font-weight: 700;
      padding: 2px 8px; border-radius: 999px; }
    .sub { color: #64748b; margin-top: 3px; }
    .meta { display: flex; gap: 14px; flex-wrap: wrap; align-items: center; margin-top: 8px;
      font-size: 13px; color: #475569; }
    .meta .assignee, .meta .due { display: inline-flex; gap: 5px; align-items: center; }
    .meta .overdue { color: #b91c1c; font-weight: 700; }
    .prio { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 700; }
    .prio-high { color: #dc2626; }
    .prio-med { color: #f59e0b; }
    .prio-low { color: #94a3b8; }
    .right { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
    .dlg-form { display: flex; flex-direction: column; gap: 14px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field label { font-size: 13px; font-weight: 700; color: #475569;
      text-transform: uppercase; letter-spacing: 0.03em; }
    .field.secondary label { color: #94a3b8; font-size: 11px; }
    .doc-inp { font-size: 14px; padding: 8px 10px; width: 100%; box-sizing: border-box;
      background: #f8fafc; border-color: #e2e8f0; }
    .inp { font-size: 17px; padding: 10px 12px; width: 100%; box-sizing: border-box; }
    .two { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .w100 { width: 100%; }
    :host ::ng-deep .ticket-dialog { width: 92vw; max-width: 560px; }
    @media (max-width: 520px) {
      .two { grid-template-columns: 1fr; }
      .filters { flex-direction: column; align-items: stretch; }
      .f-item { width: 100%; }
      .f-btns { margin-left: 0; }
      .card { flex-direction: column; align-items: flex-start; }
      .right { justify-content: flex-start; width: 100%; }
      :host ::ng-deep .ticket-dialog { width: 96vw; }
    }
  `]
})
export class TicketsComponent implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private msgs = inject(MessageService);

  tickets: Ticket[] = [];
  projects: ProjectRow[] = [];
  users: UserOpt[] = [];
  loaded = false;

  readonly statusOpts = [
    { label: 'Tous', value: '' },
    { label: 'Ouvert', value: 'OUVERT' },
    { label: 'En cours', value: 'EN_COURS' },
    { label: 'En attente', value: 'EN_ATTENTE' },
    { label: 'Résolu', value: 'RESOLU' }
  ];
  readonly priorityOpts = [
    { label: 'Priorité basse', value: 'LOW' },
    { label: 'Priorité moyenne', value: 'MEDIUM' },
    { label: 'Priorité haute', value: 'HIGH' }
  ];

  fProject: string | null = null;
  fStatus = '';
  fPriority: string | null = null;
  fMine = false;

  mode: 'create' | 'edit' = 'create';
  showDialog = false;
  formTitle = '';
  formDescription = '';
  formProject: string | null = null;
  formAssignee: string | null = null;
  formPriority = 'MEDIUM';
  formStart: Date | null = null;
  formDue: Date | null = null;
  formDocumentId = '';
  private editTarget: Ticket | null = null;

  canWrite = computed(() => this.auth.can(PERM.TICKET_WRITE));

  projectOpts = computed(() => this.projects.map(p => ({ label: p.name, value: p.id })));
  activeProjectOpts = computed(() =>
    this.projects.filter(p => (p.status ?? 'ACTIF') === 'ACTIF').map(p => ({ label: p.name, value: p.id })));
  userOpts = computed(() => this.users);

  ngOnInit(): void { this.loadRefs(); this.apply(); }

  loadRefs(): void {
    this.http.get<{ id: string; name: string }[]>('/api/projects/options').subscribe({
      next: opts => { this.projects = (opts ?? []).map(o => ({ id: o.id, name: o.name, status: 'ACTIF' })); },
      error: () => this.http.get<ProjectRow[]>('/api/projects').subscribe({
        next: p => { this.projects = p ?? []; },
        error: () => { this.projects = []; }
      })
    });
    if (this.canWrite()) {
      this.http.get<any[]>('/api/users/options').subscribe({
        next: list => {
          this.users = (list ?? []).map(d => ({
            id: d.id,
            label: d.fullName ?? d.email ?? d.label ?? d.id
          }));
        },
        error: () => this.http.get<any[]>('/api/users').subscribe({
          next: list => {
            this.users = (list ?? []).map(d => ({
              id: d.id,
              label: d.fullName ?? d.email ?? d.id
            }));
          },
          error: () => { this.users = []; }
        })
      });
    }
  }

  apply(): void {
    let params = new HttpParams();
    if (this.fProject) { params = params.set('projectId', this.fProject); }
    if (this.fStatus) { params = params.set('status', this.fStatus); }
    if (this.fPriority) { params = params.set('priority', this.fPriority); }
    if (this.fMine) { params = params.set('mine', 'true'); }

    this.http.get<Ticket[]>('/api/tickets', { params }).subscribe({
      next: list => { this.tickets = (list ?? []).map(t => this.mapTicket(t)); this.loaded = true; },
      error: () => this.msgs.add({ severity: 'error', summary: 'Erreur', detail: 'Chargement impossible' })
    });
  }

  reset(): void {
    this.fProject = null;
    this.fStatus = '';
    this.fPriority = null;
    this.fMine = false;
    this.apply();
  }

  statusLabel(s: string): string { return STATUS_LABELS[s] ?? s; }
  statusIcon(s: string): string { return STATUS_ICONS[s] ?? 'pi pi-circle'; }
  statusClass(s: string): string { return 'status ' + (STATUS_CLASS[s] ?? 'st-attente'); }
  priorityLabel(p: string): string { return PRIORITY_LABELS[p] ?? p; }
  priorityIcon(p: string): string { return PRIORITY_ICONS[p] ?? 'pi pi-circle'; }
  priorityClass(p: string): string { return 'prio ' + (PRIORITY_CLASS[p] ?? 'prio-low'); }

  isOverdue(t: Ticket): boolean {
    if (t.status === 'RESOLU' || !t.dueAt) { return false; }
    const due = new Date(t.dueAt);
    if (isNaN(due.getTime())) { return false; }
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    return due < endOfToday;
  }

  private isAssignee(t: Ticket): boolean {
    const myId = this.auth.me()?.id;
    return !!t.assignedToId && !!myId && t.assignedToId === myId;
  }

  canAct(t: Ticket): boolean { return this.canWrite() || this.isAssignee(t); }

  fmtDate(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) { return iso; }
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  openCreate(): void {
    this.mode = 'create';
    this.editTarget = null;
    this.formTitle = '';
    this.formDescription = '';
    this.formPriority = 'MEDIUM';
    this.formStart = null;
    this.formDue = null;
    this.formDocumentId = '';
    this.formAssignee = null;
    const active = this.projects.filter(p => (p.status ?? 'ACTIF') === 'ACTIF');
    this.formProject = active.length === 1 ? active[0].id : null;
    this.showDialog = true;
  }

  openEdit(t: Ticket): void {
    this.mode = 'edit';
    this.editTarget = t;
    this.formTitle = t.title;
    this.formDescription = t.description ?? '';
    this.formProject = t.projectId;
    this.formAssignee = t.assignedToId;
    this.formPriority = t.priority ?? 'MEDIUM';
    this.formStart = t.startAt ? this.parseDateOnly(t.startAt) : null;
    this.formDue = t.dueAt ? this.parseDateOnly(t.dueAt) : null;
    this.formDocumentId = t.documentId ?? '';
    this.showDialog = true;
  }

  submit(): void {
    if (!this.formTitle.trim()) { return; }
    if (this.mode === 'edit') { this.saveEdit(); } else { this.create(); }
  }

  private toDateOnly(d: Date | null): string | null {
    if (!d) return null;
    const x = new Date(d);
    const y = x.getFullYear();
    const m = String(x.getMonth() + 1).padStart(2, '0');
    const day = String(x.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private parseDateOnly(s: string): Date | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (m) {
      return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  create(): void {
    const body = {
      title: this.formTitle.trim(),
      description: this.formDescription.trim() || null,
      projectId: this.formProject,
      assignedToId: this.formAssignee,
      priority: this.formPriority,
      startAt: this.toDateOnly(this.formStart),
      dueAt: this.toDateOnly(this.formDue),
      documentId: this.formDocumentId.trim() || null
    };
    this.http.post('/api/tickets', body).subscribe({
      next: () => {
        this.msgs.add({ severity: 'success', summary: 'Ticket créé' });
        this.showDialog = false; this.apply();
      },
      error: (err) => this.msgs.add({ severity: 'error', summary: 'Erreur',
        detail: err.error?.message ?? 'Création impossible' })
    });
  }

  saveEdit(): void {
    if (!this.editTarget) { return; }
    const body = {
      title: this.formTitle.trim(),
      description: this.formDescription.trim() || null,
      projectId: this.formProject,
      assignedToId: this.formAssignee,
      priority: this.formPriority,
      startAt: this.toDateOnly(this.formStart),
      dueAt: this.toDateOnly(this.formDue),
      documentId: this.formDocumentId.trim() || null
    };
    this.http.put(`/api/tickets/${this.editTarget.id}`, body).subscribe({
      next: () => {
        this.msgs.add({ severity: 'success', summary: 'Ticket modifié' });
        this.showDialog = false; this.apply();
      },
      error: (err) => this.msgs.add({ severity: 'error', summary: 'Erreur',
        detail: err.error?.message ?? 'Modification impossible' })
    });
  }

  start(id: string): void {
    this.http.post(`/api/tickets/${id}/start`, {}).subscribe({
      next: () => { this.msgs.add({ severity: 'success', summary: 'Ticket démarré' }); this.apply(); },
      error: (err) => this.msgs.add({ severity: 'error', summary: 'Erreur',
        detail: err.error?.message ?? 'Action impossible' })
    });
  }

  wait(id: string): void {
    this.http.post(`/api/tickets/${id}/wait`, {}).subscribe({
      next: () => { this.msgs.add({ severity: 'success', summary: 'Ticket en attente' }); this.apply(); },
      error: (err) => this.msgs.add({ severity: 'error', summary: 'Erreur',
        detail: err.error?.message ?? 'Action impossible' })
    });
  }

  resume(id: string): void {
    this.http.post(`/api/tickets/${id}/resume`, {}).subscribe({
      next: () => { this.msgs.add({ severity: 'success', summary: 'Ticket repris' }); this.apply(); },
      error: (err) => this.msgs.add({ severity: 'error', summary: 'Erreur',
        detail: err.error?.message ?? 'Action impossible' })
    });
  }

  close(id: string): void {
    this.http.post(`/api/tickets/${id}/close`, {}).subscribe({
      next: () => { this.msgs.add({ severity: 'success', summary: 'Ticket résolu' }); this.apply(); },
      error: (err) => this.msgs.add({ severity: 'error', summary: 'Erreur',
        detail: err.error?.message ?? 'Action impossible' })
    });
  }

  private mapTicket(t: any): Ticket {
    return {
      id: t.id,
      title: t.title,
      description: t.description ?? null,
      status: t.status ?? 'OUVERT',
      priority: t.priority ?? 'MEDIUM',
      projectId: t.projectId ?? null,
      projectName: t.projectName ?? null,
      assignedToId: t.assignedToId ?? t.assignedTo ?? null,
      assignedToName: t.assignedToName ?? t.assigneeName ?? null,
      startAt: t.startAt ?? null,
      dueAt: t.dueAt ?? null,
      documentId: t.documentId ?? null,
      createdAt: t.createdAt
    };
  }
}