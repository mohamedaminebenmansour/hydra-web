import { Component, inject, input, output, signal, viewChild, ElementRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError, first, map } from 'rxjs/operators';

import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { ChipModule } from 'primeng/chip';
import { BadgeModule } from 'primeng/badge';

import { Folder } from '@app/core/models/folder.model';
import { UserOptionDto } from '@app/core/models/user.model';
import { UserService } from '@app/core/services/user.service';
import { FolderAccessService } from '@app/core/services/folder-access.service';

import { COMPANY_ROLE_OPTS, FolderAccess, FolderAccessGrant } from '@app/core/models/folder.model';

type PermIndex = 0 | 1 | 2 | 3 | 4; // read, upload, download, approve, delete
type RolePerms = Record<string, boolean[]>;

function roleCatalog(code: string): string {
  const cat: Record<string, string> = {
    OWNER: 'Propriétaire de l\'organisation',
    DIRECTION: 'Direction',
    CHEF_PROJET: 'Chef de projet',
    DOC_CTRL: 'Contrôleur de documents',
    INGENIEER: 'Ingénieur',
    CONDUCTEUR: 'Conducteur',
    QA: 'Qualité',
    CHEF_CHANTIER: 'Chef de chantier',
    FINANCE: 'Finance',
    ACHAT: 'Achat',
    HSE: 'Hygiène Sécurité Environnement',
    SOUS_TRAITANT: 'Sous-traitant'
  };
  return cat[code] ?? code;
}

@Component({
  selector: 'app-folder-access-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    InputTextModule,
    ButtonModule,
    TagModule,
    TooltipModule,
    ToggleButtonModule,
    ChipModule,
    BadgeModule
  ],
  templateUrl: './folder-access-dialog.component.html',
  styleUrl: './folder-access-dialog.component.scss'
})
export class FolderAccessDialogComponent {
  private readonly folderAccessService = inject(FolderAccessService);
  private readonly userService = inject(UserService);

  readonly saved = output<string>();

  @Input() set visible(value: boolean) {
    this._visible.set(value);
    if (!value) {
      this._justClosed.set(true);
      this.loading.set(true);
      this.saveError.set(null);
      this.resetTemp();
      this.fetchAll();
    }
  }
  get visible(): boolean {
    return this._visible();
  }

  @Input() projectId = '';
  @Input() folder!: Folder;

  private readonly _visible = signal(false);
  private readonly _justClosed = signal(false);

  readonly loading = signal(false);
  readonly saveError = signal<string | null>(null);

  readonly access = signal<FolderAccess[]>([]);
  readonly users = signal<UserOptionDto[]>([]);
  readonly userResults = signal<UserOptionDto[]>([]);
  readonly searchText = signal('');
  readonly selectedUserIds = signal<string[]>([]);

  readonly rolePerms = signal<RolePerms>({});
  readonly roleLabels = signal<Record<string, string>>({});
  readonly roleConfigs = signal<
    { code: string; label: string; perms: boolean[] }[]
  >([]);

  private readonly AUTO_DEFAULT_PERMISSIONS = [true, false, false, false, false] as const;

  private readonly el = viewChild<ElementRef>('searchField');

  constructor() {
    if (this.folder) {
      this.loadAccess();
      this.fetchUsersAndRoles();
    }
  }

  private fetchAll(): void {
    this.loadAccess();
    this.fetchUsersAndRoles();
  }

  private loadAccess(): void {
    if (!this.folder) return;
    this.folderAccessService
      .list(this.projectId, this.folder.id)
      .pipe(first())
      .subscribe(g => this.access.set(g ?? []));
  }

  private fetchUsersAndRoles(): void {
    this.loading.set(true);
    forkJoin({
      users: this.userService.options(),
      roles: (this.userService.roleOptions(this.projectId).pipe(
        catchError(() => of<any[]>([]))
      ) as Observable<any[]>)
    })
      .pipe(first())
      .subscribe({
        next: ({ users, roles }) => {
          this.users.set(users ?? []);
          const labels = new Map<string, string>();
          (roles ?? []).forEach((r: { code: string; label: string }) =>
            labels.set(r.code, r.label)
          );
          this.roleLabels.set(Object.fromEntries(labels));
          this.updateRoleConfigs();
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.updateRoleConfigs();
        }
      });
  }

  private updateRoleConfigs(): void {
    const merged = new Map<string, string>();
    COMPANY_ROLE_OPTS.forEach(c => merged.set(c, c));
    Object.entries(this.roleLabels()).forEach(([code, label]) =>
      merged.set(code, label)
    );
    const entries = Array.from(merged.entries()).map(([code, label]) => ({
      code,
      label,
      perms: this.rolePerms()[code] ?? ([...this.AUTO_DEFAULT_PERMISSIONS] as boolean[])
    }));
    this.roleConfigs.set(entries);
  }

  toggleRolePerm(code: string, idx: PermIndex): void {
    this.rolePerms.update(prev => {
      const perms = [...(prev[code] ?? [...this.AUTO_DEFAULT_PERMISSIONS])];
      perms[idx] = !perms[idx];
      return { ...prev, [code]: perms };
    });
    this.updateRoleConfigs();
  }

  toggleRoleRead(code: string): void {
    // Lecture implicite : pas de toggle
  }

  hasRoleGrant(code: string): boolean {
    return this.access().some(a => a.userId == null && a.roleCode === code);
  }

  hasUserGrant(userId: string): boolean {
    return this.access().some(a => a.userId === userId);
  }

  private resetTemp(): void {
    this.selectedUserIds.set([]);
    this.rolePerms.set({});
    this.searchText.set('');
    this.userResults.set([]);
  }

  save(): void {
    if (!this.folder) return;
    this.loading.set(true);
    this.saveError.set(null);

    const existing = new Map<string, FolderAccess>();
    this.access().forEach(a => existing.set(this.keyOf(a), a));

    const nextRole = new Map<string, boolean[]>();
    const nextUser = new Set<string>();
    this.roleConfigs().forEach(cfg => {
      const perms = cfg.perms;
      if (perms.some(p => p)) {
        nextRole.set(cfg.code, perms);
      }
    });
    this.selectedUserIds().forEach(id => nextUser.add(id));

    const posts: any[] = [];
    const deletes: string[] = [];

    existing.forEach((grant, key) => {
      const existingRole = grant.userId == null;
      if (existingRole) {
        const wanted = nextRole.get(grant.roleCode!);
        if (wanted) {
          const target = [...wanted];
          while (target.length < 5) target.push(false);
          if (target[0] !== grant.canRead) target[0] = true;
          grant.canRead = target[0];
          grant.canUpload = target[1];
          grant.canDownload = target[2];
          grant.canApprove = target[3];
          grant.canDelete = target[4];
          posts.push(this.folderAccessService.grant(this.projectId, this.folder.id, grant as FolderAccessGrant));
        } else {
          deletes.push(grant.id);
        }
      } else {
        if (nextUser.has(grant.userId!)) {
          posts.push(this.folderAccessService.grant(this.projectId, this.folder.id, grant as FolderAccessGrant));
        } else {
          deletes.push(grant.id);
        }
      }
    });

    nextRole.forEach((perms, code) => {
      if (existing.has(this.keyOfRole(code))) {
        const grant = existing.get(this.keyOfRole(code))!;
        const target = [...perms];
        while (target.length < 5) target.push(false);
        if (target[0] !== grant.canRead) target[0] = true;
        grant.canRead = target[0];
        grant.canUpload = target[1];
        grant.canDownload = target[2];
        grant.canApprove = target[3];
        grant.canDelete = target[4];
        posts.push(this.folderAccessService.grant(this.projectId, this.folder.id, grant as FolderAccessGrant));
      } else {
        const base = [...perms];
        while (base.length < 5) base.push(false);
        base[0] = true;
        posts.push(this.folderAccessService.grant(this.projectId, this.folder.id, {
          roleCode: code,
          userId: null,
          canRead: true,
          canUpload: base[1],
          canDownload: base[2],
          canApprove: base[3],
          canDelete: base[4]
        }));
      }
    });

    nextUser.forEach(userId => {
      if (!existing.has(userId)) {
        posts.push(this.folderAccessService.grant(this.projectId, this.folder.id, {
          userId,
          roleCode: null,
          canRead: true,
          canUpload: false,
          canDownload: false,
          canApprove: false,
          canDelete: false
        }));
      }
    });

    forkJoin([...posts, ...deletes.map(id =>
      this.folderAccessService.revoke(this.projectId, this.folder.id, id)
    )])
      .pipe(first(), catchError(() => of(null)))
      .subscribe({
        next: () => {
          this.loadAccess();
          this.saved.emit(this.folder.id);
          this.loading.set(false);
        },
        error: () => {
          this.saveError.set('Échec de la sauvegarde des accès.');
          this.loading.set(false);
        }
      });
  }

  private keyOf(grant: FolderAccess): string {
    return grant.userId != null ? `user:${grant.userId}` : `role:${grant.roleCode}`;
  }

  private keyOfRole(code: string): string {
    return `role:${code}`;
  }

  roleLabel(code: string): string {
    return this.roleLabels()[code] ?? roleCatalog(code);
  }

  filteredUsers(): UserOptionDto[] {
    const q = this.searchText().trim().toLowerCase();
    const list = this.users();
    if (!q) { return list; }
    return list.filter(u =>
      u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }

  toggleUser(userId: string): void {
    this.selectedUserIds.update(ids =>
      ids.includes(userId) ? ids.filter(i => i !== userId) : [...ids, userId]);
  }

  get canConfigure(): boolean {
    return !!this.folder;
  }

  get isFinanceFolder(): boolean {
    return !!(this.folder?.code ?? '').startsWith('06');
  }

  get financeWarning(): string | null {
    if (!this.isFinanceFolder) return null;
    const has =
      this.access().some(a => a.userId == null && a.roleCode === 'SOUS_TRAITANT');
    return has
      ? "Le dossier Finance est verrouillé : les accès par sous-traitant sont interdits."
      : null;
  }
}
