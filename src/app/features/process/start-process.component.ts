import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { ProcessService } from '@app/core/services/process.service';
import { ProcessHeader, ProcessTemplate } from '@app/core/models/process.model';

@Component({
  selector: 'app-start-process',
  standalone: true,
  styleUrl: './start-process.component.scss',
  imports: [ButtonModule, ChipModule, SelectModule, ReactiveFormsModule],
  template: `
    <section class="start-process">
      <h2>Lancer un processus</h2>

      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <div class="form-group">
          <label>Projet</label>
          <p-chip [label]="projectIdChip()" [removable]="false" />
        </div>

        <div class="form-group">
          <label>Modèle de processus</label>
          <p-select [options]="templateOptions" formControlName="templateKey" placeholder="Sélectionner" />
        </div>

        <div class="form-actions">
          <button pButton type="submit" label="Lancer" icon="pi pi-play" severity="success"
                  [loading]="submitting()" [disabled]="form.invalid"></button>
          <button pButton type="button" label="Annuler" icon="pi pi-times" severity="secondary"
                  (onClick)="cancel()"></button>
        </div>
      </form>
    </section>
  `,
})
export class StartProcessComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private processService = inject(ProcessService);
  private msgs = inject(MessageService);

  submitting = signal(false);
  templates = signal<ProcessTemplate[]>([]);

  form = this.fb.nonNullable.group({
    projectId: [''],
    subjectId: ['', Validators.required],
    subjectType: ['PAYMENT'],
    templateKey: ['PAYMENT_APPROVAL'],
  });

  ngOnInit(): void {
    const projectId = this.route.snapshot.queryParamMap.get('projectId') || '';
    const template = this.route.snapshot.queryParamMap.get('template') || '';

    // Hidden subjectId: random UUID
    this.form.controls.subjectId.setValue(crypto.randomUUID());

    if (projectId) {
      this.form.controls.projectId.setValue(projectId);
    }
    if (template && this.templateOptions.some(t => t.value === template)) {
      this.form.controls.templateKey.setValue(template);
    }

    this.loadTemplates();
  }

  projectIdChip = (): string => {
    const id = this.form.controls.projectId.value;
    return id ? `Projet #${id}` : 'Aucun projet sélectionné';
  };

  readonly templateOptions = [
    { label: 'Approbation de paiement', value: 'PAYMENT_APPROVAL', icon: 'pi-wallet' },
    { label: 'Achat de matériel', value: 'MATERIAL_PURCHASE', icon: 'pi-shopping-cart' },
    { label: 'Sous-traitance', value: 'SUBCONTRACT_APPROVAL', icon: 'pi-users' },
  ];

  private loadTemplates(): void {
    this.processService.listTemplates().subscribe({
      next: (list) => {
        if (list?.length) {
          this.templates.set(list);
        }
      },
      error: () => { /* keep defaults */ },
    });
  }

  onSubmit(): void {
    if (this.form.invalid) { return; }
    this.submitting.set(true);
    this.processService.start({
      projectId: this.form.controls.projectId.value,
      subjectId: this.form.controls.subjectId.value,
      subjectType: this.form.controls.subjectType.value,
      templateKey: this.form.controls.templateKey.value,
    }).subscribe({
      next: (header: ProcessHeader) => {
        this.submitting.set(false);
        this.msgs.add({
          severity: 'success',
          summary: 'Processus démarré',
          detail: `Processus ${header.statusLabel.toLowerCase()} — ${header.templateName}`,
        });
        const id = header.id;
        if (id) {
          this.router.navigate(['/processes', id]);
        }
      },
      error: () => {
        this.msgs.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de lancer le processus' });
        this.submitting.set(false);
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/']);
  }
}
