import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../core/auth.service';
import { EmptyStateComponent } from '../../shared/empty-state.component';

interface Ticket { id: string; title: string; description: string | null; status: string; createdAt: string; }

@Component({
  selector: 'app-tickets',
  standalone: true,
  imports: [FormsModule, ButtonModule, InputTextModule, TextareaModule, EmptyStateComponent],
  template: `
    <div class="head">
      <h2><i class="pi pi-ticket"></i> Tickets</h2>
      @if (canWrite()) { <p-button icon="pi pi-plus" label="Nouveau" (onClick)="showForm = !showForm" /> }
    </div>

    @if (showForm && canWrite()) {
      <div class="form">
        <input pInputText placeholder="Titre du problème" [(ngModel)]="title" (keyup.enter)="create()" />
        <textarea pTextarea rows="3" placeholder="Détails (optionnel)" [(ngModel)]="description"></textarea>
        <p-button label="Ajouter" icon="pi pi-check" (onClick)="create()" [disabled]="!title.trim()" />
      </div>
    }

    @for (t of tickets; track t.id) {
      <div class="card">
        <div class="left">
          <div class="title">{{ t.title }}</div>
          @if (t.description) { <div class="sub">{{ t.description }}</div> }
        </div>
        <div class="right">
          <span class="tag" [class.tag-open]="t.status === 'OUVERT'" [class.tag-done]="t.status === 'RESOLU'">
            {{ t.status === 'OUVERT' ? 'Ouvert' : 'Résolu' }}
          </span>
          @if (canWrite() && t.status === 'OUVERT') {
            <p-button label="Fermer" icon="pi pi-check-square" size="small"
                      severity="secondary" (onClick)="close(t.id)" />
          }
        </div>
      </div>
    } @empty {
      @if (loaded) { <app-empty-state icon="pi pi-inbox" message="Aucun ticket. Tout va bien."></app-empty-state> }
    }
  `,
  styles: [`
    .head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
    .head h2 { margin: 0; display: flex; gap: 10px; align-items: center; }
    .form { display: flex; flex-direction: column; gap: 10px; max-width: 480px; margin-bottom: 22px;
      background: #fff; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; }
    .form input { font-size: 17px; }
    .card { display: flex; justify-content: space-between; align-items: center; background: #fff;
      border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 18px; margin-bottom: 10px; }
    .title { font-size: 18px; font-weight: 600; } .sub { color: #64748b; margin-top: 3px; }
    .right { display: flex; gap: 12px; align-items: center; }
    .tag { padding: 5px 14px; border-radius: 999px; font-size: 13px; font-weight: 700; }
    .tag-open { background: #fef3c7; color: #92400e; }
    .tag-done { background: #dcfce7; color: #166534; }
  `]
})
export class TicketsComponent {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private msgs = inject(MessageService);

  tickets: Ticket[] = [];
  loaded = false;
  showForm = false;
  title = '';
  description = '';
  canWrite = computed(() => this.auth.can('TICKET_WRITE'));

  constructor() { this.load(); }

  load(): void {
    this.http.get<Ticket[]>('/api/tickets').subscribe(t => { this.tickets = t; this.loaded = true; });
  }

  create(): void {
    this.http.post('/api/tickets', { title: this.title, description: this.description }).subscribe({
      next: () => {
        this.msgs.add({ severity: 'success', summary: 'Ticket ajouté' });
        this.title = ''; this.description = ''; this.showForm = false;
        this.load();
      },
      error: () => this.msgs.add({ severity: 'error', summary: 'Erreur', detail: 'Ajout impossible' })
    });
  }

  close(id: string): void {
    this.http.post(`/api/tickets/${id}/close`, {}).subscribe({
      next: () => { this.msgs.add({ severity: 'success', summary: 'Ticket résolu' }); this.load(); },
      error: () => this.msgs.add({ severity: 'error', summary: 'Erreur' })
    });
  }
}