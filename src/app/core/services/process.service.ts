import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';

import {
  ProcessTimeline,
  ProcessTemplate,
  PROCESS_TEMPLATES,
  mapProcessTimeline,
  StartProcessBody,
  MyTask,
  mapMyTask,
} from '@app/core/models/process.model';

import { MessageService } from 'primeng/api';

type AnyRaw = Record<string, any>;

@Injectable({ providedIn: 'root' })
export class ProcessService {
  private http = inject(HttpClient);
  private msgs = inject(MessageService);

  /** POST /api/processes/start */
  start(body: StartProcessBody): Observable<{ instanceId: string; status: string }> {
    return this.http.post<AnyRaw | string>('/api/processes/start', body).pipe(
      map((raw: AnyRaw | string) => {
        if (typeof raw === 'string') {
          return { instanceId: raw, status: 'RUNNING' };
        }
        return {
          instanceId: String(raw?.['id'] ?? raw?.['instanceId'] ?? raw?.['processId'] ?? ''),
          status: String(raw?.['status'] ?? raw?.['processStatus'] ?? 'RUNNING'),
        };
      }),
      catchError(err => {
        this.msgs.add({
          severity: 'error',
          summary: 'Erreur',
          detail: err?.error?.message ?? 'Impossible de lancer le processus',
        });
        return of({ instanceId: '', status: 'ERROR' });
      })
    );
  }

  /** GET /api/processes/my-tasks */
  myTasks(): Observable<MyTask[]> {
    return this.http.get<AnyRaw>('/api/processes/my-tasks').pipe(
      map(raw => {
        const list = Array.isArray(raw) ? raw : (raw?.['tasks'] ?? []);
        return (Array.isArray(list) ? list : []).map(mapMyTask);
      }),
      catchError(() => of([]))
    );
  }

  /** GET /api/processes/{instanceId}/timeline */
  getTimeline(instanceId: string): Observable<ProcessTimeline> {
    return this.http.get<AnyRaw>(`/api/processes/${instanceId}/timeline`).pipe(
      map(raw => mapProcessTimeline(raw)),
      catchError(err => {
        this.msgs.add({
          severity: 'error',
          summary: 'Erreur',
          detail: err?.error?.message ?? 'Impossible de charger la timeline',
        });
        return of({
          instanceId,
          status: 'RUNNING',
          steps: [],
        } as ProcessTimeline);
      })
    );
  }

  /** GET /api/projects/{projectId}/processes?status= */
  listByProject(projectId: string, status?: string): Observable<MyTask[]> {
    const url = status
      ? `/api/projects/${projectId}/processes?status=${encodeURIComponent(status)}`
      : `/api/projects/${projectId}/processes`;
    return this.http.get<AnyRaw>(url).pipe(
      map(raw => {
        const list = Array.isArray(raw) ? raw : (raw?.['processes'] ?? []);
        return (Array.isArray(list) ? list : []).map(mapMyTask);
      }),
      catchError(() => of([]))
    );
  }

  /** GET /api/processes/templates (fallback to hardcoded on 404) */
  listTemplates(): Observable<ProcessTemplate[]> {
    return this.http.get<ProcessTemplate[]>('/api/processes/templates').pipe(
      catchError(() => of(PROCESS_TEMPLATES))
    );
  }

  /** GET /api/projects/{projectId}/process-templates */
  getProjectTemplates(projectId: string): Observable<ProcessTemplate[]> {
    return this.http.get<ProcessTemplate[]>(`/api/projects/${projectId}/process-templates`).pipe(
      catchError(() => of(PROCESS_TEMPLATES))
    );
  }

  /** PUT /api/projects/{projectId}/process-templates */
  updateProjectTemplates(projectId: string, templates: ProcessTemplate[]): Observable<ProcessTemplate[]> {
    return this.http.put<ProcessTemplate[]>(`/api/projects/${projectId}/process-templates`, templates).pipe(
      catchError(err => {
        this.msgs.add({
          severity: 'error',
          summary: 'Erreur',
          detail: err?.error?.message ?? 'Impossible de mettre \u00e0 jour les mod\u00e8les',
        });
        return of(templates);
      })
    );
  }

  /** POST /api/processes/{instanceId}/steps/{stepInstanceId}/complete */
  complete(instanceId: string, stepInstanceId: string, body: { comment?: string; documentIds?: string[] } = {}): Observable<{ stepInstanceId: string; newStatus: string }> {
    return this.http
      .post<AnyRaw>(`/api/processes/${instanceId}/steps/${stepInstanceId}/complete`, body)
      .pipe(
        map(raw => ({
          stepInstanceId,
          newStatus: String(raw?.['newStatus'] ?? raw?.['status'] ?? 'DONE'),
        })),
        catchError(err => {
          this.msgs.add({
            severity: 'error',
            summary: 'Erreur',
            detail: err?.error?.message ?? 'Impossible de valider l\u2019\u00e9tape',
          });
          return of({ stepInstanceId, newStatus: 'ERROR' });
        })
      );
  }

  /** POST /api/processes/{instanceId}/steps/{stepInstanceId}/reject (comment required) */
  reject(instanceId: string, stepInstanceId: string, comment: string): Observable<{ stepInstanceId: string; newStatus: string }> {
    return this.http
      .post<AnyRaw>(`/api/processes/${instanceId}/steps/${stepInstanceId}/reject`, { comment })
      .pipe(
        map(raw => ({
          stepInstanceId,
          newStatus: String(raw?.['newStatus'] ?? raw?.['status'] ?? 'REJECTED'),
        })),
        catchError(err => {
          this.msgs.add({
            severity: 'error',
            summary: 'Erreur',
            detail: err?.error?.message ?? 'Impossible de rejeter l\u2019\u00e9tape',
          });
          return of({ stepInstanceId, newStatus: 'ERROR' });
        })
      );
  }

  /** POST /api/processes/{instanceId}/cancel */
  cancel(instanceId: string, reason?: string): Observable<{ instanceId: string }> {
    return this.http
      .post<AnyRaw>(`/api/processes/${instanceId}/cancel`, { reason })
      .pipe(
        map(raw => ({ instanceId })),
        catchError(err => {
          this.msgs.add({
            severity: 'error',
            summary: 'Erreur',
            detail: err?.error?.message ?? 'Impossible d\u2019annuler le processus',
          });
          return of({ instanceId });
        })
      );
  }
}
