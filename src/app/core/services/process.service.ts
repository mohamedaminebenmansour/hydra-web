import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';

import {
  ProcessStepView,
  ProcessTimelineEvent,
  MyTask,
  ProcessHeader,
  mapProcessStep,
  mapMyTask,
  mapProcessHeader,
} from '@app/core/models/process.model';

import { AuthService } from '@app/core/auth.service';
import { MessageService } from 'primeng/api';

@Injectable({ providedIn: 'root' })
export class ProcessService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private msgs = inject(MessageService);

  /** POST /api/processes/start
   *  Expected body: { templateKey: 'PAYMENT_APPROVAL', projectId: string, subjectType: string, subjectId: string }
   *  Returns: { processId, templateName, status, startedAt }
   */
  start(body: { templateKey?: string; projectId?: string; subjectType?: string; subjectId?: string }): Observable<ProcessHeader> {
    return this.http.post<AnyRaw>('/api/processes/start', body).pipe(
      map(mapProcessHeader),
      catchError(err => {
        this.msgs.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Impossible de lancer le processus' });
        return of(null as any);
      })
    );
  }

  /** GET /api/processes/my-tasks
   *  Returns: { tasks: MyTask[] }
   */
  myTasks(): Observable<MyTask[]> {
    return this.http.get<AnyRaw>('/api/processes/my-tasks').pipe(
      map(raw => {
        const tasks = raw?.['tasks'] ?? (Array.isArray(raw) ? raw : []);
        return (Array.isArray(tasks) ? tasks : []).map(mapMyTask);
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
        return {
          process: instance ? mapProcessHeader(instance) : { ...EMPTY_HEADER },
          steps: (raw?.['steps'] ?? []).map(mapProcessStep),
        };
      }),
      catchError(err => {
        this.msgs.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Impossible de charger leTimeline' });
        return of({ process: { ...EMPTY_HEADER }, steps: [] });
      })
    );
  }

  /** POST /api/processes/{id}/steps/{stepInstanceId}/complete
   *  Body can be empty {} or { comment: string }
   */
  complete(processId: string, stepInstanceId: string, body: { comment?: string } = {}): Observable<{ stepInstanceId: string; newStatus: string }> {
    return this.http.post<AnyRaw>(`/api/processes/${processId}/steps/${stepInstanceId}/complete`, body).pipe(
      map(raw => ({ stepInstanceId, newStatus: raw?.['newStatus'] ?? raw?.['status'] ?? 'COMPLETED' })),
      catchError(err => {
        this.msgs.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Impossible de valider l\'étape' });
        return of({ stepInstanceId, newStatus: 'ERROR' });
      })
    );
  }

  /** POST /api/processes/{id}/steps/{stepInstanceId}/reject
   *  Body: { comment: string } — comment is **required** on the backend
   */
  reject(processId: string, stepInstanceId: string, comment: string): Observable<{ stepInstanceId: string; newStatus: string }> {
    return this.http.post<AnyRaw>(`/api/processes/${processId}/steps/${stepInstanceId}/reject`, { comment }).pipe(
      map(raw => ({ stepInstanceId, newStatus: raw?.['newStatus'] ?? raw?.['status'] ?? 'REJECTED' })),
      catchError(err => {
        this.msgs.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Impossible de rejeter l\'étape' });
        return of({ stepInstanceId, newStatus: 'ERROR' });
      })
    );
  }
}

/** Fallback header used when the backend returns no process payload. */
const EMPTY_HEADER: ProcessHeader = {
  status: 'REJECTED',
  templateName: '',
  statusLabel: 'Refusé',
  startedAt: null,
};

/** Helper: accept any raw JSON from the backend; we defensively map known keys. */
interface AnyRaw {
  [key: string]: any;
}