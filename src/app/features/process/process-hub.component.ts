import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageService } from 'primeng/api';
import { ProcessService } from '@app/core/services/process.service';
import { ProcessTemplate, PROCESS_TEMPLATES } from '@app/core/models/process.model';

@Component({
  selector: 'app-process-hub',
  standalone: true,
  styleUrl: './process-hub.component.scss',
  imports: [ButtonModule, CardModule],
  template: `
    <section class="process-hub proc-bg">
      <header class="hub-header">
        <h1><i class="pi pi-sitemap"></i> Processus</h1>
        <p>D\u00e9marrez et suivez vos processus m\u00e9tiers depuis un seul endroit.</p>
      </header>

      <div class="hub-actions">
        <p-card header="Mes t\u00e2ches" subheader="T\u00e2ches en attente de votre validation">
          <p>Consultez vos t\u00e2ches \u00e0 valider ou rejeter.</p>
          <p-button label="Voir mes t\u00e2ches" icon="pi pi-check-square" routerLink="/mes-taches" />
        </p-card>

        <p-card header="Nouveau processus" subheader="Lancer un processus m\u00e9tier">
          <p>S\u00e9lectionnez un mod\u00e8le et d\u00e9marrez un nouveau processus.</p>
          <p-button label="Lancer un processus" icon="pi pi-play" routerLink="/processes/start" />
        </p-card>
      </div>

      <div class="hub-how">
        <h2>Comment \u00e7a marche</h2>
        <div class="steps">
          <div class="step">
            <div class="step-number">1</div>
            <div class="step-label">Cr\u00e9er</div>
            <div class="step-desc">D\u00e9marrez un processus depuis un mod\u00e8le.</div>
          </div>
          <div class="step">
            <div class="step-number">2</div>
            <div class="step-label">Ex\u00e9cuter</div>
            <div class="step-desc">Les \u00e9tapes se cr\u00e9ent automatiquement pour les acteurs concern\u00e9s.</div>
          </div>
          <div class="step">
            <div class="step-number">3</div>
            <div class="step-label">Suivre</div>
            <div class="step-desc">Consultez l\u2019\u00e9tat d\u2019avancement depuis la timeline.</div>
          </div>
        </div>
      </div>

      <div class="hub-templates">
        <h2>Mod\u00e8les disponibles</h2>
        <div class="template-grid">
          @for (tpl of templates(); track tpl.key) {
            <div class="template-card">
              <i class="pi {{ tpl.icon }} template-icon"></i>
              <div class="template-info">
                <div class="template-name">{{ tpl.name }}</div>
                <div class="template-key">{{ tpl.key }}</div>
              </div>
              <p-button label="Utiliser" icon="pi pi-arrow-right" size="small"
                        (onClick)="startTemplate(tpl.key)" />
            </div>
          } @empty {
            <div class="empty-state">Aucun mod\u00e8le disponible</div>
          }
        </div>
      </div>
    </section>
  `,
})
export class ProcessHubComponent {
  private processService = inject(ProcessService);
  private msgs = inject(MessageService);
  private router = inject(Router);

  templates = signal<ProcessTemplate[]>([]);
  loading = signal(true);

  constructor() {
    this.loadTemplates();
  }

  private loadTemplates(): void {
    this.processService.listTemplates().subscribe({
      next: (list) => {
        this.templates.set(list ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.templates.set(PROCESS_TEMPLATES);
        this.loading.set(false);
      },
    });
  }

  startTemplate(key: string): void {
    this.router.navigate(['/processes/start'], { queryParams: { template: key } });
  }
}
