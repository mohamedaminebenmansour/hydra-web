import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { AvatarModule } from 'primeng/avatar';
import { BadgeModule } from 'primeng/badge';
import { MessageService } from 'primeng/api';
import { ProcessService } from '@app/core/services/process.service';
import { ProcessStepView, mapProcessStep, ProcessHeader, mapProcessHeader } from '@app/core/models/process.model';

@Component({
  selector: 'app-process-timeline',
  standalone: true,
  styleUrl: './process-timeline.component.scss',
  imports: [ButtonModule, TagModule, AvatarModule, BadgeModule],
  template: `
    <section class="process-timeline">
      @if (process()) {
        <header class="timeline-header">
          <h2>{{ process().templateName }}</h2>
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
                <p-avatar [image]="dotIcon(step.status)" [style]="{ width: '40px', height: '40px' }"></p-avatar>
              </div>
              <div class="timeline-content">
                <h3>{{ step.stepName }}</h3>
                <p-class>
                  <span *ngIf="step.assigneeName">{{ step.assigneeName }} </span>
                  a fait
                  <span *ngIf="step.completedAt">{{ step.completedAt | date:'short' }}</span>
                  {{ step.statusFrench }}
                </p>
                <p *ngIf="step.comment" class="timeline-comment">
                  <i class="pi pi-comment"></i> {{ step.comment }}
                </p>
              </div>
            </div>
          }
          @empty {
            <p class="empty-timeline">Aucune étape enregistrée</p>
          }
        </div>
      } @else {
        <p-chips [value]="[]"></p-chips>
      }
    </section>
  `,
})
export class ProcessTimelineComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private processService = inject(ProcessService);
  private msgs = inject(MessageService);

  processId = '';
  process = signal<any>(null);
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
        this.process.set(result?.process ?? null);
        this.steps.set(result?.steps ?? []).sort((a, b) => (a.completedAt ?? '').localeCompare(b.completedAt ?? ''));
        this.loading.set(false);
      },
      error: () => {
        this.msgs.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger le timeline' });
        this.loading.set(false);
      },
    });
  }

  statusSeverity = computed(() => {
    const m: Record<'RUNNING' | 'COMPLETED' | 'REJECTED' | 'DRAFT', 'success' | 'danger' | 'warning' | 'secondary'> = {
      RUNNING: 'warning',
      COMPLETED: 'success',
      REJECTED: 'danger',
      DRAFT: 'secondary',
    };
    return m[this.process()?.status ?? 'RUNNING'] ?? 'warning';
  });

  statusLabel = computed(() => {
    const m: Record<'RUNNING' | 'COMPLETED' | 'REJECTED' | 'DRAFT', string> = {
      RUNNING: 'En cours',
      COMPLETED: 'Terminé',
      REJECTED: 'Refusé',
      DRAFT: 'Brouillon',
    };
    return m[this.process()?.status ?? 'RUNNING'] ?? 'En cours';
  });
}