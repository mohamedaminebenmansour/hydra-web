import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';

import {
  ProcessStepView,
  MyTask,
  ProcessHeader,
  mapProcessStep,
  mapMyTask,
  mapProcessHeader,
} from '@app/core/models/process.model';

import { MessageService } from 'primeng/api';

/** Raw JSON payload coming from the backend. Always read with bracket notation. */
type AnyRaw = Record<string, any>;

@Injectable({ providedIn: 'root' })
export class ProcessService {
  private http = inject(HttpClient);
  private msgs = inject(MessageService);

  /** POST /api/processes/start
   *  Expected body: { templateKey: 'PAYMENT_APPROVAL', projectId: string, subjectType: string, subjectId: string }
   *  Returns: either a bare UUID string, or { id / processId, templateName, status, startedAt }
   */
  start(body: { templateKey?: string; projectId?: string; subjectType?: string; subjectId?: string }): Observable<ProcessHeader> {
    return this.http.post<AnyRaw | string>('/api/processes/start', body).pipe(
      map((raw: AnyRaw | string) => {
        if (typeof raw === 'string') {
          // Backend answered with the bare instance UUID.
          return mapProcessHeader({
            id: raw,
            status: 'RUNNING',
            templateKey: body.templateKey,
          });
        }
        const id = raw?.['id'] ?? raw?.['processId'];
        return mapProcessHeader({ ...raw, id, status: raw?.['status'] ?? 'RUNNING' });
      }),
      catchError(err => {
        this.msgs.add({
          severity: 'error',
          summary: 'Erreur',
          detail: err?.error?.message ?? 'Impossible de lancer le processus',
        });
        return of(mapProcessHeader({}));
      })
    );
  }

  /** GET /api/processes/my-tasks
   *  Returns: { tasks: MyTask[] } (or a bare array)
   */
  myTasks(): Observable<MyTask[]> {
    return this.http.get<AnyRaw>('/api/processes/my-tasks').pipe(
      map(raw => {
        const list = Array.isArray(raw) ? raw : (raw?.['tasks'] ?? []);
        return (Array.isArray(list) ? list : []).map(mapMyTask);
      }),
      catchError(() => of([]))
    );
  }

  /** GET /api/processes/{id}/timeline
   *  Returns: { process: ProcessHeader, steps: ProcessStepView[] }
   */
  getTimeline(processId: string): Observable<{ process: ProcessHeader; steps: ProcessStepView[] }> {
    return this.http.get<AnyRaw>(`/api/processes/${processId}/timeline`).pipe(
      map(raw => {
        const instance = raw?.['instance'] ?? raw?.['process'] ?? null;
        const steps = raw?.['steps'] ?? [];
        return {
          process: instance ? mapProcessHeader(instance) : mapProcessHeader({}),
          steps: (Array.isArray(steps) ? steps : []).map(mapProcessStep),
        };
      }),
      catchError(err => {
        this.msgs.add({
          severity: 'error',
          summary: 'Erreur',
          detail: err?.error?.message ?? 'Impossible de charger la timeline',
        });
        // Same shape as the success branch: { process: ProcessHeader; steps: ProcessStepView[] }
        return of({ process: mapProcessHeader({}), steps: [] });
      })
    );
  }

  /** POST /api/processes/{id}/steps/{stepInstanceId}/complete
   *  Body can be empty {} or { comment: string }
   */
  complete(processId: string, stepInstanceId: string, body: { comment?: string } = {}): Observable<{ stepInstanceId: string; newStatus: string }> {
    return this.http
      .post<AnyRaw>(`/api/processes/${processId}/steps/${stepInstanceId}/complete`, body)
      .pipe(
        map(raw => ({
          stepInstanceId,
          newStatus: String(raw?.['newStatus'] ?? raw?.['status'] ?? 'DONE'),
        })),
        catchError(err => {
          this.msgs.add({
            severity: 'error',
            summary: 'Erreur',
            detail: err?.error?.message ?? 'Impossible de valider l\'étape',
          });
          return of({ stepInstanceId, newStatus: 'ERROR' });
        })
      );
  }

  /** POST /api/processes/{id}/steps/{stepInstanceId}/reject
   *  Body: { comment: string } — comment is **required** on the backend
   */
  reject(processId: string, stepInstanceId: string, comment: string): Observable<{ stepInstanceId: string; newStatus: string }> {
    return this.http
      .post<AnyRaw>(`/api/processes/${processId}/steps/${stepInstanceId}/reject`, { comment })
      .pipe(
        map(raw => ({
          stepInstanceId,
          newStatus: String(raw?.['newStatus'] ?? raw?.['status'] ?? 'REJECTED'),
        })),
        catchError(err => {
          this.msgs.add({
            severity: 'error',
            summary: 'Erreur',
            detail: err?.error?.message ?? 'Impossible de rejeter l\'étape',
          });
          return of({ stepInstanceId, newStatus: 'ERROR' });
        })
      );
  }
}
