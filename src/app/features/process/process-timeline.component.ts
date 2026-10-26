import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { BadgeModule } from 'primeng/badge';
import { MessageService } from 'primeng/api';
import { ProcessService } from '@app/core/services/process.service';
import { ProcessTimeline, STATUS_INFO, dotColorClass } from '@app/core/models/process.model';

@Component({
  selector: 'app-process-timeline',
  standalone: true,
  styleUrl: './process-timeline.component.scss',
  imports: [ButtonModule, TagModule, BadgeModule, DatePipe, NgClass],
  template: `
    <section class="process-timeline proc-bg">
      <header class="timeline-header">
        <div>
          <h2>{{ timeline().templateName || 'Processus' }}</h2>
          <p class="timeline-sub">{{ statusLabel() || '' }}</p>
        </div>
        <p-badge [value]="statusLabel()" [severity]="statusSeverity()" size="large" />
        <button pButton icon="pi pi-arrow-left" label="Retour" [text]="true" (onClick)="back()" class="back-btn"></button>
      </header>

      @if (loading()) {
        <p class="skeleton">Chargement\u2026</p>
      } @else {
        <div class="timeline-events">
          @for (step of timeline().steps; track step.stepInstanceId) {
            <div class="timeline-event"
                 [ngClass]="{
                   'event-done': step.status === 'DONE',
                   'event-current': step.status === 'PENDING',
                   'event-rejected': step.status === 'REJECTED'
                 }">
              <div class="timeline-dot {{ dotColorClass(step.status) }}">
                <i class="pi {{ stepIcon(step.status) }} timeline-dot-icon"></i>
              </div>
              <div class="timeline-content">
                <h3>{{ step.name }}</h3>
                <p>
                  @if (step.assigneeName) {
                    <span>{{ step.assigneeName }}</span>
                  }
                  @if (step.completedAt) {
                    <span>{{ step.completedAt | date:'short' }}</span>
                  }
                  <span class="step-status {{ step.status.toLowerCase() }}">{{ stepLabel(step.status) }}</span>
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
            <p class="empty-timeline">Aucune \u00e9tape enregistr\u00e9e</p>
          }
        </div>
      }
    </section>
  `,
})
export class ProcessTimelineComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private processService = inject(ProcessService);
  private msgs = inject(MessageService);

  instanceId = '';
  timeline = signal<ProcessTimeline>({ instanceId: '', status: 'RUNNING', steps: [] });
  loading = signal(true);

  ngOnInit(): void {
    this.instanceId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.instanceId) {
      this.loading.set(false);
      this.router.navigate(['/processus']);
      return;
    }
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.processService.getTimeline(this.instanceId).subscribe({
      next: (result: ProcessTimeline) => {
        const steps = (result?.steps ?? []).slice().sort((a, b) => {
          const da = a.stepOrder ?? 0;
          const db = b.stepOrder ?? 0;
          return da - db;
        });
        this.timeline.set({ ...result, steps });
        this.loading.set(false);
      },
      error: () => {
        this.msgs.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger la timeline' });
        this.loading.set(false);
      },
    });
  }

  back(): void {
    this.router.navigate(['/processus']);
  }

  statusLabel = computed(() => {
    const info = STATUS_INFO[String(this.timeline().status ?? '').toUpperCase()];
    return info ? info.label : 'En cours';
  });

  statusSeverity = computed(() => {
    const s = String(this.timeline().status ?? '').toUpperCase();
    if (s === 'DONE' || s === 'COMPLETED') return 'success';
    if (s === 'REJECTED' || s === 'CANCELLED') return 'danger';
    if (s === 'PENDING' || s === 'RUNNING') return 'warn';
    return 'info';
  });

  stepIcon(status: string): string {
    const info = STATUS_INFO[String(status ?? '').toUpperCase()];
    return info ? info.icon : 'pi-clock';
  }

  stepLabel(status: string): string {
    const info = STATUS_INFO[String(status ?? '').toUpperCase()];
    return info ? info.label : status;
  }

  dotColorClass(status: string): string {
    return dotColorClass(status);
  }
}



