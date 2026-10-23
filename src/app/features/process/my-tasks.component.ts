import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { InputTextarea } from 'primeng/inputtextarea';
import { TagModule } from 'primeng/tag';
import { BadgeModule } from 'primeng/badge';
import { ProcessService } from '@app/core/services/process.service';
import { MyTask, StepStatus } from '@app/core/models/process.model';

@Component({
  selector: 'app-my-tasks',
  standalone: true,
  styleUrl: './my-tasks.component.scss',
  imports: [ButtonModule, NgClass, FormsModule, DialogModule, InputTextarea, TagModule, BadgeModule],
  template: `
    <section class="my-tasks">
      <header class="section-header">
        <h2>Mes tâches</h2>
        <p-badge [value]="pendingCount()" size="large" severity="warn" *ngIf="pendingCount() > 0" />
      </header>

      @if (loading()) {
        <p class="skeleton">Chargement…</p>
      } @else {
        <div class="status-chips">
          <p-tag [value]="'Toutes'" [severity]="'secondary'" [style]="{ 'cursor': 'pointer' }" (onClick)="filterStatus(null)" />
          <p-tag [value]="'En attente'" [severity]="activeFilter() === 'PENDING' ? 'warn' : 'secondary'" [style]="{ 'cursor': 'pointer' }" (onClick)="filterStatus('PENDING')" />
          <p-tag [value]="'Terminées'" [severity]="activeFilter() === 'DONE' ? 'success' : 'secondary'" [style]="{ 'cursor': 'pointer' }" (onClick)="filterStatus('DONE')" />
          <p-tag [value]="'Rejetées'" [severity]="activeFilter() === 'REJECTED' ? 'danger' : 'secondary'" [style]="{ 'cursor': 'pointer' }" (onClick)="filterStatus('REJECTED')" />
        </div>

        <div class="tasks-grid">
          @for (task of visibleTasks(); track task.stepInstanceId) {
            <div class="task-card">
              <div class="card-header">
                <span class="card-project">{{ task.processName }}</span>
                <span class="card-step">{{ task.stepName }}</span>
              </div>
              <div class="card-body">
                <p class="card-subject">{{ task.subjectType }} • {{ task.subjectId }}</p>
                <p class="card-assignee">Assigné à {{ task.assigneeName }}</p>
              </div>
              <div class="card-actions">
                @if (canAct(task)) {
                  <button pButton
                        label="Valider"
                        icon="pi pi-check"
                        severity="success"
                        size="small"
                        [outlined]="true"
                        (onClick)="validate(task)"
                        class="btn-validate"
                  ></button>
                  <button pButton
                        label="Rejeter"
                        icon="pi pi-close"
                        severity="danger"
                        size="small"
                        [outlined]="true"
                        (onClick)="openRejectDialog(task)"
                        class="btn-reject"
                  ></button>
                } @else {
                  <span class="status-badge"
                        [ngClass]="{
                          'badge-done': task.status === 'DONE',
                          'badge-current': task.status === 'PENDING',
                          'badge-rejected': task.status === 'REJECTED'
                        }">
                    {{ taskStatusFrench(task.status) }}
                  </span>
                }
              </div>
            </div>
          }
          @empty {
            <div class="empty-state">
              <i class="pi pi-folder"></i>
              <p>Rien à faire</p>
            </div>
          }
        </div>
      }

      <!-- Reject dialog -->
      <p-dialog [(visible)]="rejectDialogVisible" [modal]="true" [style]="{ width: '440px' }"
                header="Rejeter l'étape">
        <div class="reject-dialog-body">
          <label for="reject-comment">Commentaire (obligatoire)</label>
          <textarea pInputTextarea id="reject-comment" [(ngModel)]="rejectComment"
                    [autoResize]="true" rows="3" placeholder="Motif du rejet…"></textarea>
          <small class="hint">Un commentaire est requis pour rejeter l'étape.</small>
        </div>
        <ng-template pTemplate="footer">
          <p-button label="Annuler" [text]="true" (onClick)="closeRejectDialog()" />
          <p-button label="Confirmer le rejet" icon="pi pi-close" severity="danger"
                    (onClick)="confirmReject()" [disabled]="!rejectComment.trim()" />
        </ng-template>
      </p-dialog>
    </section>
  `,
})
export class MyTasksComponent implements OnInit {
  private processService = inject(ProcessService);
  private msgs = inject(MessageService);

  loading = signal(true);
  allTasks = signal<MyTask[]>([]);
  activeFilter = signal<StepStatus | null>(null);

  rejectDialogVisible = false;
  rejectTask: MyTask | null = null;
  rejectComment = '';

  visibleTasks = computed<MyTask[]>(() => {
    const tasks = this.allTasks();
    const f = this.activeFilter();
    return f ? tasks.filter(t => t.status === f) : tasks;
  });

  pendingCount = computed(() => this.allTasks().filter(t => t.status === 'PENDING').length);

  taskStatusFrench = (status: StepStatus): string => {
    const m: Record<StepStatus, string> = {
      DONE: 'Terminé',
      PENDING: 'En attente de vous',
      REJECTED: 'Refusé',
    };
    return m[status] ?? status;
  };

  ngOnInit(): void {
    this.reload();
  }

  /** Re-fetch the task list from the backend. */
  reload(): void {
    this.loading.set(true);
    this.processService.myTasks().subscribe({
      next: (tasks: MyTask[]) => {
        this.allTasks.set(tasks ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.msgs.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger mes tâches' });
        this.allTasks.set([]);
        this.loading.set(false);
      },
    });
  }

  canAct(task: MyTask): boolean {
    return task.status === 'PENDING';
  }

  validate(task: MyTask): void {
    this.processService.complete(task.processId, task.stepInstanceId, {}).subscribe({
      next: () => {
        this.msgs.add({ severity: 'success', summary: 'Validé' });
        this.reload();
      },
      error: () => this.msgs.add({ severity: 'error', summary: 'Erreur', detail: 'Échec de la validation' }),
    });
  }

  openRejectDialog(task: MyTask): void {
    this.rejectTask = task;
    this.rejectComment = '';
    this.rejectDialogVisible = true;
  }

  closeRejectDialog(): void {
    this.rejectDialogVisible = false;
    this.rejectTask = null;
    this.rejectComment = '';
  }

  confirmReject(): void {
    if (!this.rejectTask || !this.rejectComment.trim()) { return; }
    this.processService.reject(this.rejectTask.processId, this.rejectTask.stepInstanceId, this.rejectComment).subscribe({
      next: () => {
        this.msgs.add({ severity: 'success', summary: 'Rejeté' });
        this.closeRejectDialog();
        this.reload();
      },
      error: () => this.msgs.add({ severity: 'error', summary: 'Erreur', detail: 'Échec du rejet' }),
    });
  }

  filterStatus(status: StepStatus | null): void {
    this.activeFilter.set(status);
  }
}
