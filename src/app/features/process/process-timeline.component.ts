import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { BadgeModule } from 'primeng/badge';
import { MessageService } from 'primeng/api';
import { ProcessService } from '@app/core/services/process.service';
import { ProcessStepView, mapProcessStep, ProcessHeader, mapProcessHeader } from '@app/core/models/process.model';

@Component({
  selector: 'app-process-timeline',
  standalone: true,
  styleUrl: './process-timeline.component.scss',
  imports: [ButtonModule, TagModule, BadgeModule, DatePipe, NgClass],
  template: `
    <section class="process-timeline">
      @if (process(); as proc) {
        <header class="timeline-header">
          <h2>{{ proc.templateName }}</h2>
          <p-badge [severity]="statusSeverity()" [value]="statusLabel()"></p-badge>
        </header>

        <div class="timeline-events">
          @for (step of steps(); track step.stepInstanceId) {
            <div class="timeline-event"
                 [ngClass]="{
                   'event-done': step.status === 'DONE',
                   'event-current': step.status === 'PENDING',
                   'event-rejected': step.status === 'REJECTED'
                 }">
              <div class="timeline-dot">
                <i class="pi {{ dotIcon(step.status) }} timeline-dot-icon"></i>
              </div>
              <div class="timeline-content">
                <h3>{{ step.stepName }}</h3>
                <p>
                  @if (step.assigneeName) {
                    <span>{{ step.assigneeName }} </span>
                  }
                  a fait
                  @if (step.completedAt) {
                    <span>{{ step.completedAt | date:'short' }}</span>
                  }
                  {{ step.statusFrench }}
                </p>
                @if (step.comment) {
                  <p class="timeline-comment">
                    <i class="pi pi-comment"></i> {{ step.comment }}
                  </p>
                }
              </div>
            </div>
          }
          @empty {
            <p class="empty-timeline">Aucune étape enregistrée</p>
          }
        </div>
      } @else {
        <p class="empty-timeline">Chargement...</p>
      }
    </section>
  `,
})
export class ProcessTimelineComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private processService = inject(ProcessService);
  private msgs = inject(MessageService);

  processId = '';
  process = signal<ProcessHeader | null>(null);
  steps = signal<ProcessStepView[]>([]);
  loading = signal(true);

  ngOnInit(): void {
    this.processId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.processId) {
      this.loading.set(false);
      return;
    }
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.processService.getTimeline(this.processId).subscribe({
      next: result => {
        const backend = result?.process ?? null;
        this.process.set(backend ? mapProcessHeader(backend) : null);
        const steps = (result?.steps ?? []).slice().sort((a: ProcessStepView, b: ProcessStepView) => {
          const da = a.completedAt ?? '';
          const db = b.completedAt ?? '';
          return da.localeCompare(db);
        });
        this.steps.set(steps);
        this.loading.set(false);
      },
      error: () => {
        this.msgs.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger le timeline' });
        this.loading.set(false);
      },
    });
  }

  statusSeverity = computed(() => {
    const m: Record<'RUNNING' | 'COMPLETED' | 'REJECTED', 'success' | 'danger' | 'warn'> = {
      COMPLETED: 'success',
      REJECTED: 'danger',
      RUNNING: 'warn',
    };
    return m[this.statusKey()] ?? 'warn';
  });

  statusLabel = computed(() => {
    const m: Record<'RUNNING' | 'COMPLETED' | 'REJECTED', string> = {
      COMPLETED: 'Terminé',
      REJECTED: 'Refusé',
      RUNNING: 'En cours',
    };
    return m[this.statusKey()] ?? 'En cours';
  });

  /** Narrowed process status, safe to use as a record key. */
  private statusKey(): 'RUNNING' | 'COMPLETED' | 'REJECTED' {
    const status = this.process()?.status;
    return status === 'COMPLETED' || status === 'REJECTED' ? status : 'RUNNING';
  }

  dotIcon(status: string): string {
    switch (status) {
      case 'DONE': return 'pi-check';
      case 'PENDING': return 'pi-clock';
      case 'REJECTED': return 'pi-times';
      default: return 'pi-clock';
    }
  }
}