import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
import { AuthService } from '@app/core/auth.service';
import { PERM } from '@app/core/permissions';
import { ProjectService } from '@app/core/services/project.service';
import { UserService } from '@app/core/services/user.service';
import { TicketService } from '@app/core/services/ticket.service';
import { SelectOption } from '@app/core/models/select-option';
import { Project } from '@app/core/models/project.model';
import { Ticket } from '@app/core/models/ticket.model';
import { EmptyStateComponent } from '@app/shared/empty-state.component';

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
  templateUrl: './tickets.component.html',
  styleUrl: './tickets.component.scss'
})
export class TicketsComponent implements OnInit {
  private ticketService = inject(TicketService);
  private projectService = inject(ProjectService);
  private userService = inject(UserService);
  private auth = inject(AuthService);
  private msgs = inject(MessageService);

  tickets = signal<Ticket[]>([]);
  projects = signal<Project[]>([]);
  userOptions = signal<SelectOption[]>([]);
  loaded = signal(false);
  showDialog = signal(false);

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
  canAssign = computed(() => this.auth.can(PERM.TICKET_ASSIGN));

  // computed() only tracks signals — these read the signal sources above.
  projectOpts = computed(() =>
    this.projects().map(p => ({ label: p.name, value: p.id })));
  activeProjectOpts = computed(() =>
    this.projects()
      .filter(p => (p.status ?? 'ACTIF') === 'ACTIF')
      .map(p => ({ label: p.name, value: p.id })));
  // userOptions is already SelectOption[] — expose directly.
  assigneeOpts = computed(() => this.userOptions());

  ngOnInit(): void { this.loadRefs(); this.apply(); }

  loadRefs(): void {
    this.projectService.options().subscribe({
      next: list => this.projects.set(list),
      error: () => this.projectService.list().subscribe({
        next: list => this.projects.set(list),
        error: () => this.projects.set([])
      })
    });

    if (this.canWrite() || this.canAssign()) {
      this.userService.options().subscribe({
        next: list => this.userOptions.set(
          (list ?? []).map(u => ({
            label: u.fullName || u.email,
            value: u.id
          }))
        ),
        error: () => this.userOptions.set([])
      });
    }
  }

  apply(): void {
    this.ticketService.list({
      projectId: this.fProject,
      status: this.fStatus,
      priority: this.fPriority,
      mine: this.fMine
    }).subscribe({
      next: list => { this.tickets.set((list ?? []).map(t => this.mapTicket(t))); this.loaded.set(true); },
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
    const active = this.activeProjectOpts();
    this.formProject = active.length === 1 ? active[0].value : null;
    this.showDialog.set(true);
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
    this.showDialog.set(true);
  }

  submit(): void {
    if (!this.formTitle.trim()) { return; }
    if (this.mode === 'edit') { this.saveEdit(); } else { this.create(); }
  }

  private parseDateOnly(s: string): Date | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (m) {
      return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  private body() {
    return {
      title: this.formTitle.trim(),
      description: this.formDescription.trim() || null,
      projectId: this.formProject,
      assignedToId: this.formAssignee,
      priority: this.formPriority,
      startAt: this.formStart,
      dueAt: this.formDue,
      documentId: this.formDocumentId.trim() || null
    };
  }

  create(): void {
    this.ticketService.create(this.body()).subscribe({
      next: () => {
        this.msgs.add({ severity: 'success', summary: 'Ticket créé' });
        this.showDialog.set(false); this.apply();
      },
      error: (err) => this.msgs.add({ severity: 'error', summary: 'Erreur',
        detail: err.error?.message ?? 'Création impossible' })
    });
  }

  saveEdit(): void {
    if (!this.editTarget) { return; }
    this.ticketService.update(this.editTarget.id, this.body()).subscribe({
      next: () => {
        this.msgs.add({ severity: 'success', summary: 'Ticket modifié' });
        this.showDialog.set(false); this.apply();
      },
      error: (err) => this.msgs.add({ severity: 'error', summary: 'Erreur',
        detail: err.error?.message ?? 'Modification impossible' })
    });
  }

  start(id: string): void {
    this.ticketService.start(id).subscribe({
      next: () => { this.msgs.add({ severity: 'success', summary: 'Ticket démarré' }); this.apply(); },
      error: (err) => this.msgs.add({ severity: 'error', summary: 'Erreur',
        detail: err.error?.message ?? 'Action impossible' })
    });
  }

  wait(id: string): void {
    this.ticketService.wait(id).subscribe({
      next: () => { this.msgs.add({ severity: 'success', summary: 'Ticket en attente' }); this.apply(); },
      error: (err) => this.msgs.add({ severity: 'error', summary: 'Erreur',
        detail: err.error?.message ?? 'Action impossible' })
    });
  }

  resume(id: string): void {
    this.ticketService.resume(id).subscribe({
      next: () => { this.msgs.add({ severity: 'success', summary: 'Ticket repris' }); this.apply(); },
      error: (err) => this.msgs.add({ severity: 'error', summary: 'Erreur',
        detail: err.error?.message ?? 'Action impossible' })
    });
  }

  close(id: string): void {
    this.ticketService.close(id).subscribe({
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
