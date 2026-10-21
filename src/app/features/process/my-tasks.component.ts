import { Component, OnInit } from '@angular/core';
import { signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { MessageService } from 'primeng/api';
import { AuthService } from '@app/core/auth.service';
import { ProcessService } from '@app/core/services/process.service';
import { MyTask } from '@app/core/models/process.model';
import { EmptyStateComponent } from '@app/shared/empty-state.component';

@Component({
  selector: 'app-my-tasks',
  standalone: true,
  styleUrl: './my-tasks.component.scss',
  imports: [RouterLink, ButtonModule, DialogModule, InputTextModule, TextareaModule, EmptyStateComponent],
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
                        (onClick)="validate(task.stepInstanceId)"
                        class="btn-validate"
                  />
                  <button pButton
                        label="Rejeter"
                        icon="pi pi-close"
                        severity="danger"
                        size="small"
                        [outlined]="true"
                        (onClick)="openRejectDialog(task)"
                        class="btn-reject"
                  />
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
  private auth = inject(AuthService);
  private msgs = inject(MessageService);

  loading = signal(true);
  allTasks = signal<MyTask[]>([]);

  visibleTasks = computed<MyTask[]>(() => {
    const tasks = this.allTasks();
    return tasks;
  });

  taskStatusFrench = computed<string>(() => {
    const m: Record<'DONE' | 'PENDING' | 'REJECTED', string> = {
      DONE: 'Terminé',
      PENDING: 'En attente de vous',
      REJECTED: 'Refusé',
    };
    return m[this.visibleTasks().length > 0 ? this.visibleTasks()[0]?.status ?? 'PENDING' : 'PENDING'];
  });

  ngOnInit(): void {
    this.loading.set(true);
    this.processService.myTasks().subscribe({
      next: tasks => {
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

  canAct = computed<boolean>(() => {
    const me = this.auth.me();
    if (!me) return false;
    return this.visibleTasks().some(t => t.status === 'PENDING');
  });

  validate(stepInstanceId: string): void {
    this.processService.complete('', stepInstanceId, {}).subscribe({
      next: () => {
        this.msgs.add({ severity: 'success', summary: 'Validé' });
        this.allTasks.set([]); // refresh list
      },
      error: () => this.msgs.add({ severity: 'error', summary: 'Erreur', detail: 'Échec de la validation' }),
    });
  }

  openRejectDialog(task: MyTask): void {
    // TODO: wire a proper dialog with required comment input
    // For now, attempt reject with empty comment – server will reject if comment required
    this.processService.reject('', task.stepInstanceId, '').subscribe({
      next: () => {
        this.msgs.add({ severity: 'success', summary: 'Rejeté' });
        this.allTasks.set([]); // refresh list
      },
      error: () => this.msgs.add({ severity: 'error', summary: 'Erreur', detail: 'Commentaire requis pour le rejet' }),
    });
  }
}