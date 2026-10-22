import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { ProcessService } from '@app/core/services/process.service';
import { MyTask, StepStatus } from '@app/core/models/process.model';

@Component({
  selector: 'app-my-tasks',
  standalone: true,
  styleUrl: './my-tasks.component.scss',
  imports: [ButtonModule, NgClass, FormsModule],
  template: `
    <section class="my-tasks">
      <header class="section-header">
        <h2>Mes tâches</h2>
      </header>

      @if (loading()) {
        <p class="skeleton">Chargement...</p>
      } @else {
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
    </section>
  `,
})
export class MyTasksComponent implements OnInit {
  private processService = inject(ProcessService);
  private msgs = inject(MessageService);

  loading = signal(true);
  allTasks = signal<MyTask[]>([]);

  visibleTasks = computed<MyTask[]>(() => this.allTasks());

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
    const comment = prompt('Commentaire pour le rejet :');
    if (comment === null) { return; } // user cancelled
    this.processService.reject(task.processId, task.stepInstanceId, comment).subscribe({
      next: () => {
        this.msgs.add({ severity: 'success', summary: 'Rejeté' });
        this.reload();
      },
      error: () => this.msgs.add({ severity: 'error', summary: 'Erreur', detail: 'Échec du rejet' }),
    });
  }
}
