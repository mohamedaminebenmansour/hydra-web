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
    <section class="process-hub">
      <header class="hub-header">
        <h1><i class="pi pi-sitemap"></i> Processus</h1>
        <p>Démarrez et suivez vos processus métiers depuis un seul endroit.</p>
      </header>

      <div class="hub-actions">
        <p-card header="Mes tâches" subheader="Tâches en attente de votre validation">
          <p>Consultez vos tâches à valider ou rejeter.</p>
          <p-button label="Voir mes tâches" icon="pi pi-check-square" routerLink="/mes-taches" />
        </p-card>

        <p-card header="Nouveau processus" subheader="Lancer un processus métier">
          <p>Sélectionnez un modèle et démarrez un nouveau processus.</p>
          <p-button label="Lancer un processus" icon="pi pi-play" routerLink="/processes/start" />
        </p-card>
      </div>

      <div class="hub-how">
        <h2>Comment ça marche</h2>
        <div class="steps">
          <div class="step">
            <div class="step-number">1</div>
            <div class="step-label">Créer</div>
            <div class="step-desc">Démarrez un processus depuis un modèle.</div>
          </div>
          <div class="step">
            <div class="step-number">2</div>
            <div class="step-label">Exécuter</div>
            <div class="step-desc">Les étapes se créent automatiquement pour les acteurs concernés.</div>
          </div>
          <div class="step">
            <div class="step-number">3</div>
            <div class="step-label">Suivre</div>
            <div class="step-desc">Consultez l'état d'avancement depuis la timeline.</div>
          </div>
        </div>
      </div>

      <div class="hub-templates">
        <h2>Modèles disponibles</h2>
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
            <div class="empty-state">Aucun modèle disponible</div>
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