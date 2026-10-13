import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { ChipModule } from 'primeng/chip';
import { MessageService } from 'primeng/api';
import { AuthService } from '@app/core/auth.service';
import { PERM } from '@app/core/permissions';
import { ProjectService } from '@app/core/services/project.service';
import { UserService } from '@app/core/services/user.service';
import {
  Project, ProjectCreate, ProjectUpdate, ProjectType,
  PROJECT_TYPE_OPTS, PROJECT_TYPE_LABELS
} from '@app/core/models/project.model';
import { SelectOption } from '@app/core/models/select-option';
import { EmptyStateComponent } from '@app/shared/empty-state.component';

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
    MultiSelectModule,
    InputNumberModule,
    TextareaModule,
    DatePickerModule,
    DialogModule,
    TagModule,
    ChipModule,
    EmptyStateComponent
  ],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.scss'
})
export class ProjectsComponent implements OnInit {
  private projectService = inject(ProjectService);
  private userService = inject(UserService);
  private router = inject(Router);
  private auth = inject(AuthService);
  private msgs = inject(MessageService);

  projects: Project[] = [];
  userOptions = signal<SelectOption[]>([]);
  readonly statusOpts = STATUS_OPTS;
  readonly projectTypeOpts = PROJECT_TYPE_OPTS;

  mode: 'create' | 'edit' = 'create';
  showDialog = false;
  formName = '';
  formCode = '';
  formClientName = '';
  formLocation = '';
  formGovernorate = '';
  formProjectType: ProjectType | null = null;
  formStartDate: Date | null = null;
  formEndDate: Date | null = null;
  formContractValue: number | null = null;
  formMembers: string[] = [];
  formDescription = '';
  formStatus = 'ACTIF';
  private editTarget: Project | null = null;

  canWrite = computed(() => this.auth.can(PERM.PROJECT_WRITE));
  memberOpts = computed(() => this.userOptions());

  ngOnInit(): void { this.load(); this.loadMemberOptions(); }

  isActive(p: Project): boolean { return (p.status ?? 'ACTIF') === 'ACTIF'; }

  typeLabel(t: string | null | undefined): string {
    return t ? (PROJECT_TYPE_LABELS[t] ?? t) : '';
  }

  fmtDate(iso: string | null | undefined): string {
    if (!iso) { return '—'; }
    const d = new Date(iso);
    if (isNaN(d.getTime())) { return iso; }
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  open(p: Project): void { this.router.navigate(['/projects', p.id]); }

  load(): void {
    this.projectService.list().subscribe({
      next: list => this.projects = list ?? [],
      error: () => this.msgs.add({ severity: 'error', summary: 'Erreur', detail: 'Chargement impossible' })
    });
  }

  private loadMemberOptions(): void {
    if (!this.canWrite()) { return; }
    this.userService.options().subscribe({
      next: list => this.userOptions.set(
        (list ?? []).map(u => ({ label: u.fullName || u.email, value: u.id }))
      ),
      error: () => this.userOptions.set([])
    });
  }

  openCreate(): void {
    this.mode = 'create';
    this.editTarget = null;
    this.formName = '';
    this.formCode = '';
    this.formClientName = '';
    this.formLocation = '';
    this.formGovernorate = '';
    this.formProjectType = null;
    this.formStartDate = null;
    this.formEndDate = null;
    this.formContractValue = null;
    this.formMembers = [];
    this.formDescription = '';
    this.formStatus = 'ACTIF';
    this.showDialog = true;
  }

  openEdit(p: Project): void {
    this.mode = 'edit';
    this.editTarget = p;
    this.formName = p.name ?? '';
    this.formCode = p.code ?? '';
    this.formClientName = p.clientName ?? '';
    this.formLocation = p.location ?? '';
    this.formGovernorate = p.governorate ?? '';
    this.formProjectType = p.projectType ?? null;
    this.formStartDate = p.startDate ? this.parseDateOnly(p.startDate) : null;
    this.formEndDate = p.endDate ? this.parseDateOnly(p.endDate) : null;
    this.formContractValue = p.contractValue ?? null;
    this.formMembers = [];
    this.formDescription = p.description ?? '';
    this.formStatus = p.status ?? 'ACTIF';
    this.showDialog = true;
  }

  submit(): void {
    if (!this.formName.trim()) { return; }
    if (this.mode === 'edit') { this.saveEdit(); } else { this.create(); }
  }

  private parseDateOnly(s: string): Date | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (m) { return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])); }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  private createBody(): ProjectCreate {
    return {
      name: this.formName.trim(),
      code: this.formCode.trim() || null,
      clientName: this.formClientName.trim() || null,
      location: this.formLocation.trim() || null,
      governorate: this.formGovernorate.trim() || null,
      projectType: this.formProjectType,
      startDate: this.formStartDate,
      endDate: this.formEndDate,
      contractValue: this.formContractValue ?? null,
      description: this.formDescription.trim() || null,
      memberIds: this.formMembers
    };
  }

  create(): void {
    this.projectService.create(this.createBody()).subscribe({
      next: () => {
        this.msgs.add({ severity: 'success',
          summary: 'Chantier créé — dossiers créés automatiquement' });
        this.showDialog = false; this.load();
      },
      error: (err) => this.msgs.add({ severity: 'error', summary: 'Erreur',
        detail: err.error?.message ?? 'Création impossible' })
    });
  }

  saveEdit(): void {
    if (!this.editTarget) { return; }
    const body: ProjectUpdate = {
      name: this.formName.trim(),
      code: this.formCode.trim() || null,
      status: this.formStatus,
      clientName: this.formClientName.trim() || null,
      location: this.formLocation.trim() || null,
      governorate: this.formGovernorate.trim() || null,
      projectType: this.formProjectType,
      startDate: this.formStartDate,
      endDate: this.formEndDate,
      contractValue: this.formContractValue ?? null,
      description: this.formDescription.trim() || null
    };
    this.projectService.update(this.editTarget.id, body).subscribe({
      next: () => {
        this.msgs.add({ severity: 'success', summary: 'Chantier modifié' });
        this.showDialog = false; this.load();
      },
      error: (err) => this.msgs.add({ severity: 'error', summary: 'Erreur',
        detail: err.error?.message ?? 'Modification impossible' })
    });
  }
}
