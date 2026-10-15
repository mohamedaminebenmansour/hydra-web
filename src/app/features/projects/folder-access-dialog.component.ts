import { Component, inject, Input, Output, signal, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, first } from 'rxjs/operators';

import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ChipModule } from 'primeng/chip';
import { BadgeModule } from 'primeng/badge';

import { Folder } from '@app/core/models/folder.model';
import { UserOptionDto } from '@app/core/models/user.model';
import { UserService } from '@app/core/services/user.service';
import { FolderAccessService } from '@app/core/services/folder-access.service';

import { COMPANY_ROLE_OPTS, COMPANY_ROLE_LABELS, FolderAccess, FolderAccessGrant } from '@app/core/models/folder.model';

const D = [true, false, false, false, false];

@Component({
  selector: 'app-folder-access-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, InputTextModule, ButtonModule, TagModule, TooltipModule, ToggleSwitchModule, ChipModule, BadgeModule],
  templateUrl: './folder-access-dialog.component.html',
  styleUrl: './folder-access-dialog.component.scss'
})
export class FolderAccessDialogComponent {
  readonly roleOpts = COMPANY_ROLE_OPTS;
  private readonly fa = inject(FolderAccessService);
  private readonly us = inject(UserService);
  @Output() saved = new EventEmitter<string>();
  @Output() visibleChange = new EventEmitter<boolean>();
  @Input() visible = false;
  @Input() projectId = '';
  @Input() folder!: Folder;
  readonly loading = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly access = signal<FolderAccess[]>([]);
  readonly users = signal<UserOptionDto[]>([]);
  readonly userResults = signal<UserOptionDto[]>([]);
  readonly searchText = signal('');
  readonly selectedUserIds = signal<string[]>([]);
  readonly rolePerms = signal<Record<string, boolean[]>>({});

  ngOnInit(): void { if (this.folder) { this.loadAccess(); this.fetchUsers(); } }
  private loadAccess(): void {
    if (!this.folder) { return; }
    this.loading.set(true);
    this.fa.list(this.projectId, this.folder.id).pipe(first()).subscribe({
      next: g => { this.access.set(g ?? []); this.hydrate(); this.loading.set(false); },
      error: () => { this.access.set([]); this.loading.set(false); }
    });
  }
  private fetchUsers(): void { this.us.options().pipe(first()).subscribe({ next: l => this.users.set(l ?? []), error: () => this.users.set([]) }); }
  private hydrate(): void {
    const p: Record<string, boolean[]> = {};
    for (const g of this.access()) { if (g.userId == null && g.roleCode) { p[g.roleCode] = [g.canRead, g.canUpload, g.canDownload, g.canApprove, g.canDelete]; } }
    this.rolePerms.set(p);
  }
  roleLabel(code: string): string { return COMPANY_ROLE_LABELS[code] ?? code; }
  roleBadgeLabel(code: string): string {
    return this.access().some(g => g.userId == null && g.roleCode === code) ? 'Activé' : 'Créer';
  }
  rolePermsFor(code: string): boolean[] { return this.rolePerms()[code] ?? [...D]; }
  toggleRolePerm(code: string, idx: number): void {
    this.rolePerms.update(prev => { const next = [...(prev[code] ?? [...D])]; next[idx] = !next[idx]; if (idx !== 0 && (next[1] || next[2] || next[3] || next[4])) { next[0] = true; } return { ...prev, [code]: next }; });
  }
  isFinanceFolder(): boolean { return !!(this.folder?.code ?? '').startsWith('06'); }
  roleBlocked(code: string): boolean { if (!this.isFinanceFolder()) { return false; } return code === 'SOUS_TRAITANT' || code === 'CHEF_CHANTIER' || code === 'CONDUCTEUR'; }
  financeWarning(): string | null {
    if (!this.isFinanceFolder()) { return null; }
    const has = this.access().some(a => a.userId == null && a.roleCode === 'SOUS_TRAITANT');
    return has ? 'Le dossier Finance est verrouillé : les accès par sous-traitant sont interdits.' : null;
  }
  openSearch(): void { this.userResults.set(this.users()); this.searchText.set(''); }
  searchUsers(): void {
    const q = this.searchText().trim().toLowerCase(); const list = this.users();
    if (!q) { this.userResults.set(list); return; }
    this.userResults.set(list.filter(u => (u.fullName ?? '').toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q)));
  }
  isSelected(userId: string): boolean { return this.selectedUserIds().includes(userId); }
  toggleUser(userId: string): void { this.selectedUserIds.update(ids => ids.includes(userId) ? ids.filter(i => i !== userId) : [...ids, userId]); }
  save(): void {
    if (!this.folder) { return; }
    this.loading.set(true); this.saveError.set(null);
    const existing = new Map<string, FolderAccess>();
    for (const g of this.access()) { existing.set(g.userId != null ? `user:${g.userId}` : `role:${g.roleCode}`, g); }
    const posts: any[] = []; const deletes: string[] = [];
    for (const code of COMPANY_ROLE_OPTS) {
      const p = this.rolePermsFor(code);
      if (p.some(v => v)) { posts.push(this.fa.grant(this.projectId, this.folder.id, { roleCode: code, userId: null, canRead: true, canUpload: p[1], canDownload: p[2], canApprove: p[3], canDelete: p[4] })); }
      else { const e = existing.get(`role:${code}`); if (e) { deletes.push(e.id); } }
    }
    for (const id of this.selectedUserIds()) { if (!existing.get(`user:${id}`)) { posts.push(this.fa.grant(this.projectId, this.folder.id, { userId: id, roleCode: null, canRead: true, canUpload: false, canDownload: false, canApprove: false, canDelete: false })); } }
    for (const g of this.access()) { if (g.userId != null && !this.selectedUserIds().includes(g.userId)) { deletes.push(g.id); } }
    forkJoin([...posts, ...deletes.map(id => this.fa.revoke(this.projectId, this.folder.id, id) as any)]).pipe(first(), catchError(() => of(null as any))).subscribe({
      next: () => { this.loadAccess(); this.saved.emit(this.folder.id); },
      error: () => { this.saveError.set('Échec de la sauvegarde des accès.'); this.loading.set(false); }
    });
  }
}
