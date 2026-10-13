import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TabsModule } from 'primeng/tabs';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { ChipModule } from 'primeng/chip';
import { MessageService } from 'primeng/api';
import { AuthService } from '@app/core/auth.service';
import { PERM } from '@app/core/permissions';
import { ProjectService } from '@app/core/services/project.service';
import { UserService } from '@app/core/services/user.service';
import {
  Project, ProjectMember, ProjectRole,
  PROJECT_TYPE_LABELS, PROJECT_ROLE_OPTS, PROJECT_ROLE_LABELS
} from '@app/core/models/project.model';
import { UserOptionDto } from '@app/core/models/user.model';
import { EmptyStateComponent } from '@app/shared/empty-state.component';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    ToggleSwitchModule,
    TabsModule,
    DialogModule,
    TagModule,
    ChipModule,
    EmptyStateComponent
  ],
  templateUrl: './project-detail.component.html',
  styleUrl: './project-detail.component.scss'
})
export class ProjectDetailComponent implements OnInit {
  private projectService = inject(ProjectService);
  private userService = inject(UserService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private msgs = inject(MessageService);

  project = signal<Project | null>(null);
  members = signal<ProjectMember[]>([]);
  folders = signal<{ id: string; name: string; code?: string | null; createdAt?: string | null }[]>([]);
  users = signal<UserOptionDto[]>([]);

  loading = signal(true);
  notFound = signal(false);
  activeTab = signal<string | number>('0');

  readonly roleOpts = PROJECT_ROLE_OPTS;

  // add dialog
  showAddDialog = false;
  addUserId: string | null = null;
  addFilter = '';
  addRole: ProjectRole = 'MEMBER';
  addCanUpload = false;

  // edit dialog
  showEditDialog = false;
  editTarget: ProjectMember | null = null;
  editRole: ProjectRole = 'MEMBER';
  editCanUpload = false;

  // remove dialog
  showRemoveDialog = false;
  removeTarget: ProjectMember | null = null;

  canManage = computed(() => this.auth.can(PERM.PROJECT_ASSIGN) || this.auth.can(PERM.PROJECT_WRITE));

  // Users not yet on this project, shaped for the picker list.
  availableUserOpts = computed(() => {
    const ids = new Set(this.members().map(m => m.userId));
    return this.users()
      .filter(u => !ids.has(u.id))
      .map(u => ({ value: u.id, name: u.fullName || u.email, email: u.email }));
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.notFound.set(true); this.loading.set(false); return; }

    this.projectService.get(id).subscribe({
      next: p => this.project.set(p),
      error: (err) => {
        // 403 → not a member; 404 → missing. Backend still enforces membership.
        this.loading.set(false);
        this.notFound.set(true);
        if (err.status !== 403 && err.status !== 404) {
          this.msgs.add({ severity: 'error', summary: 'Erreur', detail: 'Chargement impossible' });
        }
      }
    });

    this.projectService.listMembers(id).subscribe({
      next: list => this.members.set(list ?? []),
      error: () => this.members.set([])
    });

    this.projectService.listFolders(id).subscribe({
      next: list => this.folders.set(list ?? []),
      error: () => this.folders.set([])
    });

    this.loading.set(false);

    if (this.canManage()) { this.loadMemberOptions(); }
  }

  private loadMemberOptions(): void {
    this.userService.options().subscribe({
      next: list => this.users.set(list ?? []),
      error: () => this.users.set([])
    });
  }

  isActive(): boolean { return (this.project()?.status ?? 'ACTIF') === 'ACTIF'; }

  typeLabel(t: string | null | undefined): string {
    return t ? (PROJECT_TYPE_LABELS[t] ?? t) : '';
  }

  roleLabel(r: string | null | undefined): string {
    return r ? (PROJECT_ROLE_LABELS[r] ?? r) : '—';
  }

  roleSeverity(r: string | null | undefined): 'success' | 'info' | 'secondary' {
    if (r === 'MANAGER') { return 'success'; }
    if (r === 'MEMBER') { return 'info'; }
    return 'secondary';
  }

  fmtDate(iso: string | null | undefined): string {
    if (!iso) { return '—'; }
    const d = new Date(iso);
    if (isNaN(d.getTime())) { return iso; }
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  back(): void { this.router.navigate(['/projects']); }

  openAdd(): void {
    this.addUserId = null;
    this.addFilter = '';
    this.addRole = 'MEMBER';
    this.addCanUpload = false;
    this.showAddDialog = true;
  }

  filteredUsers(): { value: string; name: string; email: string }[] {
    const q = this.addFilter.trim().toLowerCase();
    const list = this.availableUserOpts();
    if (!q) { return list; }
    return list.filter(u =>
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }

  saveAdd(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id || !this.addUserId) { return; }
    this.projectService.addMember(id, {
      userId: this.addUserId,
      roleOnProject: this.addRole,
      canUpload: this.addCanUpload
    }).subscribe({
      next: () => {
        this.msgs.add({ severity: 'success', summary: 'Membre ajouté' });
        this.showAddDialog = false;
        this.reloadMembers();
      },
      error: (err) => this.msgs.add({ severity: 'error', summary: 'Erreur',
        detail: err.error?.message ?? 'Ajout impossible' })
    });
  }

  openEdit(m: ProjectMember): void {
    this.editTarget = m;
    this.editRole = (m.roleOnProject as ProjectRole) ?? 'MEMBER';
    this.editCanUpload = !!m.canUpload;
    this.showEditDialog = true;
  }

  saveEdit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id || !this.editTarget) { return; }
    this.projectService.updateMember(id, this.editTarget.userId, {
      roleOnProject: this.editRole,
      canUpload: this.editCanUpload
    }).subscribe({
      next: () => {
        this.msgs.add({ severity: 'success', summary: 'Membre modifié' });
        this.showEditDialog = false;
        this.reloadMembers();
      },
      error: (err) => this.msgs.add({ severity: 'error', summary: 'Erreur',
        detail: err.error?.message ?? 'Modification impossible' })
    });
  }

  confirmRemove(m: ProjectMember): void {
    this.removeTarget = m;
    this.showRemoveDialog = true;
  }

  doRemove(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id || !this.removeTarget) { return; }
    this.projectService.removeMember(id, this.removeTarget.userId).subscribe({
      next: () => {
        this.msgs.add({ severity: 'success', summary: 'Membre retiré' });
        this.showRemoveDialog = false;
        this.reloadMembers();
      },
      error: (err) => this.msgs.add({ severity: 'error', summary: 'Erreur',
        detail: err.error?.message ?? 'Retrait impossible' })
    });
  }

  private reloadMembers(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { return; }
    this.projectService.listMembers(id).subscribe({
      next: list => this.members.set(list ?? []),
      error: () => { /* keep current list */ }
    });
  }
}
