import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { ProcessService } from '@app/core/services/process.service';
import { ProcessHeader } from '@app/core/models/process.model';

@Component({
  selector: 'app-start-process',
  standalone: true,
  styleUrl: './start-process.component.scss',
  imports: [ButtonModule, InputTextModule, SelectModule, ReactiveFormsModule],
  template: `
    <section class="start-process">
      <h2>Lancer approbation paiement</h2>

      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <div class="form-group">
          <label>Projet</label>
          <input pInputText formControlName="projectId" placeholder="ID du projet" />
        </div>

        <div class="form-group">
          <label>Objet (UUID)</label>
          <input pInputText formControlName="subjectId" placeholder="UUID de l'objet" />
        </div>

        <div class="form-group">
          <label>Type d'objet</label>
          <p-select [options]="subjectOptions" formControlName="subjectType" placeholder="Sélectionner"></p-select>
        </div>

        <div class="form-group">
          <label>Modèle de processus</label>
          <p-select [options]="templateOptions" formControlName="templateKey" placeholder="Sélectionner"></p-select>
        </div>

        <div class="form-actions">
          <button pButton type="submit" label="Lancer approbation" icon="pi pi-play" severity="success" [loading]="submitting()"></button>
          <button pButton type="button" label="Annuler" icon="pi pi-times" severity="secondary" (onClick)="cancel()"></button>
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

  form = this.fb.nonNullable.group({
    projectId: ['', Validators.required],
    subjectId: ['', Validators.required],
    subjectType: ['PAYMENT'],
    templateKey: ['PAYMENT_APPROVAL'],
  });

  /** Backend subject types (e.g. PAYMENT). */
  subjectOptions = [
    { label: 'Paiement', value: 'PAYMENT' },
    { label: 'Achat de matériel', value: 'MATERIAL' },
    { label: 'Sous-traitance', value: 'SUBCONTRACT' },
  ];

  /** Backend process templates. */
  templateOptions = [
    { label: 'Approbation de paiement', value: 'PAYMENT_APPROVAL' },
    { label: 'Achat de matériel', value: 'MATERIAL_PURCHASE' },
    { label: 'Sous-traitance', value: 'SUBCONTRACT_APPROVAL' },
  ];

  ngOnInit(): void {
    // Pre-fill the subject with a UUID passed as a query param (if any).
    const uuid = this.route.snapshot.queryParamMap.get('uuid');
    if (uuid) {
      this.form.controls.subjectId.setValue(uuid);
    }
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
        // Navigate to the timeline using the process instance id.
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
