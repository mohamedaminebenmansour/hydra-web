import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Ticket, TicketFilter, TicketUpsert } from '@app/core/models/ticket.model';

@Injectable({ providedIn: 'root' })
export class TicketService {
  private http = inject(HttpClient);

  /** GET /api/tickets — builds query params only for defined filters. */
  list(filter: TicketFilter): Observable<Ticket[]> {
    let params = new HttpParams();
    if (filter.projectId) { params = params.set('projectId', filter.projectId); }
    if (filter.status) { params = params.set('status', filter.status); }
    if (filter.priority) { params = params.set('priority', filter.priority); }
    if (filter.mine) { params = params.set('mine', 'true'); }
    return this.http.get<Ticket[]>('/api/tickets', { params });
  }

  /** POST /api/tickets */
  create(body: TicketUpsert): Observable<Ticket> {
    return this.http.post<Ticket>('/api/tickets', this.normalize(body));
  }

  /** PUT /api/tickets/{id} */
  update(id: string, body: TicketUpsert): Observable<Ticket> {
    return this.http.put<Ticket>(`/api/tickets/${id}`, this.normalize(body));
  }

  /** POST /api/tickets/{id}/start */
  start(id: string): Observable<Ticket> {
    return this.http.post<Ticket>(`/api/tickets/${id}/start`, {});
  }

  /** POST /api/tickets/{id}/wait */
  wait(id: string): Observable<Ticket> {
    return this.http.post<Ticket>(`/api/tickets/${id}/wait`, {});
  }

  /** POST /api/tickets/{id}/resume */
  resume(id: string): Observable<Ticket> {
    return this.http.post<Ticket>(`/api/tickets/${id}/resume`, {});
  }

  /** POST /api/tickets/{id}/close */
  close(id: string): Observable<Ticket> {
    return this.http.post<Ticket>(`/api/tickets/${id}/close`, {});
  }

  /** Backend expects yyyy-MM-dd date strings, not full ISO datetimes. */
  private normalize(body: TicketUpsert) {
    return { ...body, startAt: this.toYmd(body.startAt), dueAt: this.toYmd(body.dueAt) };
  }

  private toYmd(d: Date | string | null): string | null {
    if (d === null || d === undefined) { return null; }
    if (typeof d === 'string') { return d; } // already yyyy-MM-dd
    const x = new Date(d);
    if (isNaN(x.getTime())) { return null; }
    const y = x.getFullYear();
    const m = String(x.getMonth() + 1).padStart(2, '0');
    const day = String(x.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
