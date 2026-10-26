import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, first, map } from 'rxjs/operators';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TabsModule } from 'primeng/tabs';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { ChipModule } from 'primeng/chip';
import { BadgeModule } from 'primeng/badge';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { AuthService } from '@app/core/auth.service';
import { PERM } from '@app/core/permissions';
import { ProjectService } from '@app/core/services/project.service';
import { ProcessService } from '@app/core/services/process.service';
import { MyTask, STATUS_INFO } from '@app/core/models/process.model';
import { FolderAccessService } from '@app/core/services/folder-access.service';
import { UserService } from '@app/core/services/user.service';
import {
  Project, ProjectFolder, ProjectMember, ProjectRole,
  PROJECT_TYPE_LABELS, PROJECT_ROLE_OPTS, PROJECT_ROLE_LABELS
} from '@app/core/models/project.model';
import { UserOptionDto } from '@app/core/models/user.model';
import { EmptyStateComponent } from '@app/shared/empty-state.component';
import { FolderAccessDialogComponent } from './folder-access-dialog.component';

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
    BadgeModule,
    CardModule,
    TooltipModule,
    RouterLink,
    EmptyStateComponent,
    FolderAccessDialogComponent
  ],
  templateUrl: './project-detail.component.html',
  styleUrl: './project-detail.component.scss'
})
export class ProjectDetailComponent implements OnInit {
  private projectService = inject(ProjectService);
  private processService = inject(ProcessService);
  private folderAccessService = inject(FolderAccessService);
  private userService = inject(UserService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private msgs = inject(MessageService);

  project = signal<Project | null>(null);
  members = signal<ProjectMember[]>([]);
  folders = signal<ProjectFolder[]>([]);
  folderAccessCounts = signal<Record<string, number>>({});
  users = signal<UserOptionDto[]>([]);

  loading = signal(true);
  notFound = signal(false);
  processesLoading = signal(false);
  projectId: string | null = null;
  activeTab = signal<string | number>('0');
  processes = signal<MyTask[]>([]);

  readonly roleOpts = PROJECT_ROLE_OPTS;

  readonly addRoleBtns = [
    { value: 'ADMIN' as ProjectRole, icon: 'pi pi-shield', color: '#dc2626' },
    { value: 'MANAGER' as ProjectRole, icon: 'pi pi-briefcase', color: '#f97316' },
    { value: 'ENGINEER' as ProjectRole, icon: 'pi pi-cog', color: '#2563eb' },
    { value: 'VIEWER' as ProjectRole, icon: 'pi pi-eye', color: '#6b7280' },
  ];

  // add dialog
  showAddDialog = false;
  addUserId: string | null = null;
  addFilter = '';
  addRole: ProjectRole = 'ENGINEER';
  addCanUpload = false;

  // edit dialog
  showEditDialog = false;
  editTarget: ProjectMember | null = null;
  editRole: ProjectRole = 'ENGINEER';
  editCanUpload = false;

  // remove dialog
  showRemoveDialog = false;
  removeTarget: ProjectMember | null = null;

  // folder access dialog
  showAccessDialog = false;
  accessFolder: ProjectFolder | null = null;

  canManage = computed(() => this.auth.can(PERM.PROJECT_ASSIGN) || this.auth.can(PERM.PROJECT_WRITE));

  // Configurer l'accÃ¨s aux dossiers : visible pour ADMIN / OWNER (PROJECT_ASSIGN/PROJECT_MANAGE)
  canConfigureProject = computed(() => this.auth.can(PERM.PROJECT_ASSIGN) || this.auth.can(PERM.PROJECT_MANAGE));

  // Users not yet on this project, shaped for the picker list.
  availableUserOpts = computed(() => {
    const ids = new Set(this.members().map(m => m.userId));
    return this.users()
      .filter(u => !ids.has(u.id))
      .map(u => ({ value: u.id, name: u.fullName || u.email, email: u.email }));
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.projectId = id;
    if (!id) { this.notFound.set(true); this.loading.set(false); return; }

    this.projectService.get(id).subscribe({
      next: p => this.project.set(p),
      error: (err) => {
        // 403 â†’ not a member; 404 â†’ missing. Backend still enforces membership.
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
      next: list => {
        this.folders.set(list ?? []);
        this.loadFolderAccessCounts();
      },
      error: () => this.folders.set([])
    });

    this.loading.set(false);

    if (this.canManage()) { this.loadMemberOptions(); }

    this.loadProcesses();
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
    return r ? (PROJECT_ROLE_LABELS[r] ?? r) : 'â€”';
  }

  taskStatusFrench(status: string): string {
    const m: Record<string, string> = {
      PENDING: 'En attente',
      DONE: 'TerminÃ©',
      REJECTED: 'RefusÃ©',
    };
    return m[status] ?? status;
  }

  roleSeverity(r: string | null | undefined): 'success' | 'info' | 'secondary' {
    if (r === 'ADMIN' || r === 'MANAGER') { return 'success'; }
    if (r === 'ENGINEER') { return 'info'; }
    return 'secondary';
  }

  fmtDate(iso: string | null | undefined): string {
    if (!iso) { return 'â€”'; }
    const d = new Date(iso);
    if (isNaN(d.getTime())) { return iso; }
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  back(): void { this.router.navigate(['/projects']); }

  openFolder(f: { id: string }): void {
    if (!this.projectId) { return; }
    this.router.navigate(['/projects', this.projectId, 'folders', f.id]);
  }

  openAdd(): void {
    this.addUserId = null;
    this.addFilter = '';
    this.addRole = 'ENGINEER';
    this.addCanUpload = false;
    this.showAddDialog = true;
  }

  selectedAddUser(): { value: string; name: string; email: string } | null {
    return this.availableUserOpts().find(u => u.value === this.addUserId) ?? null;
  }

  setAddRole(role: ProjectRole): void {
    this.addRole = role;
  }

  isAddRoleSelected(role: ProjectRole): boolean {
    return this.addRole === role;
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
      projectRole: this.addRole,
      canUpload: this.addCanUpload
    }).subscribe({
      next: () => {
        this.msgs.add({ severity: 'success', summary: 'Membre ajoutÃ©' });
        this.showAddDialog = false;
        this.reloadMembers();
      },
      error: (err) => this.msgs.add({ severity: 'error', summary: 'Erreur',
        detail: err.error?.message ?? 'Ajout impossible' })
    });
  }

  openEdit(m: ProjectMember): void {
    this.editTarget = m;
    this.editRole = (m.projectRole as ProjectRole) ?? 'ENGINEER';
    this.editCanUpload = !!m.canUpload;
    this.showEditDialog = true;
  }

  saveEdit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id || !this.editTarget) { return; }
    this.projectService.updateMember(id, this.editTarget.userId, {
      projectRole: this.editRole,
      canUpload: this.editCanUpload
    }).subscribe({
      next: () => {
        this.msgs.add({ severity: 'success', summary: 'Membre modifiÃ©' });
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
        this.msgs.add({ severity: 'success', summary: 'Membre retirÃ©' });
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

  private loadFolderAccessCounts(): void {
    const projectId = this.projectId;
    if (!projectId) return;
    const folderIds = this.folders().map(f => f.id).filter(Boolean);
    if (!folderIds.length) return;
    forkJoin(folderIds.map(fid =>
      this.folderAccessService.list(projectId, fid).pipe(
        map(accs => ({ fid, count: accs.filter(a => a.userId == null).length })),
        catchError(() => of({ fid, count: 0 }))
      )
    )).subscribe(results => {
      const counts: Record<string, number> = {};
      results.forEach(r => counts[r.fid] = r.count);
      this.folderAccessCounts.set(counts);
    });
  }

  badgeCount(folderId: string): number {
    return this.folderAccessCounts()[folderId] ?? 0;
  }

  openAccess(folder: ProjectFolder): void {
    this.accessFolder = folder;
    this.showAccessDialog = true;
  }

  onAccessSaved(): void {
    this.showAccessDialog = false;
    this.accessFolder = null;
    this.loadFolderAccessCounts();
  }

  /** Load processes for this project (graceful 404 -> empty list). */
  loadProcesses(): void {
    if (!this.projectId) { return; }
    this.processesLoading.set(true);
    this.processService.listByProject(this.projectId).subscribe({
      next: (list) => this.processes.set(list ?? []),
      error: () => this.processes.set([]),
      complete: () => this.processesLoading.set(false),
    });
  }

  /** Start a new process for this project. */
  startProcess(): void {
    this.router.navigate(['/processes/start'], {
      queryParams: { projectId: this.projectId },
    });
  }

  /** Start a payment approval process for this project (1-click from chantier). */
  startPaymentApproval(): void {
    this.router.navigate(['/processes/start'], {
      queryParams: { projectId: this.projectId, template: 'PAYMENT_APPROVAL' },
    });
  }

  addFolder(): void {
    this.msgs.add({ severity: 'info', summary: 'Dossier', detail: 'Creation de dossier a implementer' });
  }
}
