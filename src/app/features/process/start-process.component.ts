import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { ProcessService } from '@app/core/services/process.service';
import { MyTask, ProcessHeader } from '@app/core/models/process.model';

@Component({
  selector: 'app-start-process',
  standalone: true,
  styleUrl: './start-process.component.scss',
  imports: [ButtonModule, InputTextModule, SelectModule],
  template: `
    <section class="start-process">
      <h2>Lancer approbation paiement</h2>

      @if (loading()) {
        <p>Chargement...</p>
      } @else {
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label>Projet</label>
            <p-inputText formControlName="projectId" placeholder="ID du projet" />
          </div>

          <div class="form-group">
            <label>Objet (UUID)</label>
            <p-inputText formControlName="subjectId" placeholder="UUID de l'objet" />
          </div>

          <div class="form-group">
            <label>Type d'objet</label>
            <p-select [options]="subjectOptions" formControlName="subjectType" placeholder="Sélectionner"></p-select>
          </div>

          <div class="form-actions">
            <button pButton type="submit" label="Lancer approbation" icon="pi pi-play" severity="success" [loading]="loading()" />
            <button pButton type="button" label="Annuler" icon="pi pi-times" severity="secondary" (onClick)="cancel()" />
          </div>
        </form>
      }
    </section>
  `,
})
export class StartProcessComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private processService = inject(ProcessService);
  private msgs = inject(MessageService);

  loading = signal(false);
  form: FormGroup;
  subjectOptions = [
    { label: 'Paiement à valider', value: 'PAYMENT_APPROVAL' },
    { label: 'Achat de matériel', value: 'MATERIAL_PURCHASE' },
    { label: 'Sous-traitance', value: 'SUBCONTRACT' },
  ];

  ngOnInit(): void {
    this.form = this.fb.group({
      projectId: [''],
      subjectId: ['', Validators.required],
      subjectType: ['PAYMENT_APPROVAL'],
    });

    // Pre-fill with a fake UUID for testing if none provided
    const uuid = this.route.snapshot.queryParamMap.get('uuid');
    if (uuid) {
      this.form.get('subjectId')?.setValue(uuid);
    }
  }

  onSubmit(): void {
    if (this.form.invalid) { return; }
    this.loading.set(true);
    this.processService.start(this.form.value).subscribe({
      next: (header: ProcessHeader) => {
        this.msgs.add({ severity: 'success', summary: 'Processus démarré', detail: `Processus ${header.statusLabel.toLowerCase()} ${header.templateName}` });
        this.loading.set(false);
        // Navigate to timeline
        this.router.navigate(['/processes', header.templateName?.toLowerCase() ?? 'process', header.status ?? '']);
      },
      error: () => {
        this.msgs.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de lancer le processus' });
        this.loading.set(false);
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/']);
  }
}