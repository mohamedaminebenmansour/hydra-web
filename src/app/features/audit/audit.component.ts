import { Component, OnInit, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../core/auth.service';
import { PERM } from '../../core/permissions';
import { EmptyStateComponent } from '../../shared/empty-state.component';

/** Matches backend AuditService.EventResponse (Jackson names). */
interface BackendEvent {
  id: number | string;
  createdAt: string | null;
  userId: string | null;
  userEmail: string | null;
  userFullName: string | null;
  action: string | null;
  entityType: string | null;
  entityId: string | null;
  details: string | null;
}

interface AuditEvent {
  id: string;
  occurredAt: string;
  actorName: string;
  action: string;
  entityType: string;
  details: string;
}

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    InputTextModule,
    DatePickerModule,
    SelectModule,
    TagModule,
    DividerModule,
    EmptyStateComponent
  ],
  template: `
    <div class="head">
      <h2><i class="pi pi-history"></i> Journal d'activité</h2>
    </div>

    <div class="filters">
      @if (canSeeUsers()) {
        <p-select [options]="userOptions()" [(ngModel)]="userId"
                  placeholder="Tous les utilisateurs" [showClear]="true"
                  optionLabel="label" optionValue="value" styleClass="f-user" />
      }
      <p-datepicker [(ngModel)]="fromDate" [showTime]="false"
                    dateFormat="dd/mm/yy" placeholder="Du" styleClass="f-date" />
      <p-datepicker [(ngModel)]="toDate" [showTime]="false"
                    dateFormat="dd/mm/yy" placeholder="Au" styleClass="f-date" />
      <input pInputText placeholder="Action (ex. LOGIN_SUCCESS)" [(ngModel)]="action"
             (keyup.enter)="apply()" />
      <div class="f-btns">
        <p-button label="Journée" icon="pi pi-calendar" severity="secondary" (onClick)="setDay()" />
        <p-button label="Filtrer" icon="pi pi-filter" (onClick)="apply()" />
        <p-button label="Réinitialiser" icon="pi pi-times" [text]="true" (onClick)="reset()" />
      </div>
    </div>

    <p-divider />

    @if (loading) {
      <div class="loading"><i class="pi pi-spin pi-spinner"></i> Chargement…</div>
    } @else if (events.length) {
      <div class="list">
        @for (e of events; track e.id) {
          <div class="row">
            <div class="r-time">{{ formatTime(e.occurredAt) }}</div>
            <div class="r-user">{{ e.actorName }}</div>
            <div class="r-action"><p-tag [value]="e.action" severity="info" /></div>
            <div class="r-entity">{{ e.entityType }}</div>
            <div class="r-details">{{ e.details }}</div>
          </div>
        }
      </div>
    } @else {
      <app-empty-state icon="pi pi-history" message="Aucune activité pour ces filtres."></app-empty-state>
    }
  `,
  styles: [`
    .head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
    .head h2 { margin: 0; display: flex; gap: 10px; align-items: center; }
    .filters { display: flex; flex-wrap: wrap; gap: 10px; align-items: center;
      background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; }
    .filters p-select, .filters p-datepicker { min-width: 170px; }
    .filters input { flex: 1 1 160px; min-width: 140px; }
    .f-btns { display: flex; gap: 8px; margin-left: auto; }
    .loading { color: #64748b; padding: 24px; text-align: center; font-size: 16px; }
    .list { display: flex; flex-direction: column; gap: 8px; }
    .row { display: grid; grid-template-columns: 150px 180px 160px 120px 1fr; gap: 12px;
      align-items: center; background: #fff; border: 1px solid #e2e8f0;
      border-radius: 10px; padding: 10px 14px; font-size: 14px; }
    .r-time { color: #64748b; }
    .r-user { font-weight: 600; }
    .r-entity { color: #475569; }
    .r-details { color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    @media (max-width: 720px) {
      .row { grid-template-columns: 1fr 1fr; }
      .r-details { grid-column: 1 / -1; white-space: normal; }
    }
  `]
})
export class AuditComponent implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private msgs = inject(MessageService);

  events: AuditEvent[] = [];
  loading = false;

  userId: string | null = null;
  fromDate: Date | null = null;
  toDate: Date | null = null;
  action = '';

  private users: { id: string; fullName: string }[] = [];

  /** User filter needs list users API. */
  canSeeUsers = computed(() =>
    this.auth.can(PERM.USER_CREATE) ||
    this.auth.can(PERM.USER_UPDATE) ||
    this.auth.can(PERM.ROLE_ASSIGN));

  userOptions = computed(() =>
    this.users.map(u => ({ label: u.fullName, value: u.id })));

  ngOnInit(): void {
    if (this.canSeeUsers()) {
      this.http.get<any[]>('/api/users').subscribe({
        next: list => {
          this.users = (list ?? []).map(d => ({
            id: d.id,
            fullName: d.fullName ?? d.email ?? d.id
          }));
        },
        error: () => { this.users = []; }
      });
    }
    this.apply();
  }

  apply(): void {
    let params = new HttpParams();
    params = params.set('page', '0');
    params = params.set('size', '50');
    if (this.userId) {
      params = params.set('userId', this.userId);
    }
    // Backend expects LocalDate: yyyy-MM-dd
    if (this.fromDate) {
      params = params.set('from', this.toYmd(this.fromDate));
    }
    if (this.toDate) {
      params = params.set('to', this.toYmd(this.toDate));
    }
    if (this.action.trim()) {
      params = params.set('action', this.action.trim());
    }

    this.loading = true;
    this.http.get<BackendEvent[]>('/api/audit/events', { params }).subscribe({
      next: list => {
        this.events = (list ?? []).map(e => this.mapEvent(e));
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.events = [];
        const detail = err?.error?.message
          ?? (err?.status === 404
            ? 'API journal indisponible (backend non déployé ?)'
            : err?.status === 403
              ? 'Permission AUDIT_VIEW requise'
              : 'Chargement du journal impossible');
        this.msgs.add({ severity: 'error', summary: 'Erreur', detail });
      }
    });
  }

  setDay(): void {
    const base = this.fromDate ?? new Date();
    this.fromDate = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    this.toDate = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    this.apply();
  }

  reset(): void {
    this.userId = null;
    this.fromDate = null;
    this.toDate = null;
    this.action = '';
    this.apply();
  }

  formatTime(iso: string): string {
    if (!iso) { return '—'; }
    const d = new Date(iso);
    if (isNaN(d.getTime())) { return iso; }
    return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  }

  /** Format as yyyy-MM-dd for Spring @DateTimeFormat ISO.DATE */
  private toYmd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private mapEvent(e: BackendEvent | any): AuditEvent {
    const name = e.userFullName
      ?? e.actorName
      ?? e.userName
      ?? e.userEmail
      ?? e.email
      ?? '—';
    const when = e.createdAt ?? e.occurredAt ?? e.timestamp ?? '';
    let details = e.details ?? e.description ?? '';
    if (details && typeof details === 'object') {
      try { details = JSON.stringify(details); } catch { details = String(details); }
    }
    return {
      id: String(e.id ?? when ?? Math.random()),
      occurredAt: when,
      actorName: name,
      action: e.action ?? '—',
      entityType: e.entityType ?? e.entity ?? '—',
      details: details == null ? '' : String(details)
    };
  }
}
