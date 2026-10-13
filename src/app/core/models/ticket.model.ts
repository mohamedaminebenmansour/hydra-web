export interface Ticket {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  projectId: string | null;
  projectName: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  startAt: string | null;
  dueAt: string | null;
  documentId: string | null;
  createdAt: string;
}

/**
 * Body for create/update. startAt/dueAt accept a Date (from p-datepicker) or an
 * already-formatted 'yyyy-MM-dd' string; TicketService normalizes to 'yyyy-MM-dd'.
 */
export interface TicketUpsert {
  title: string;
  description: string | null;
  projectId: string | null;
  assignedToId: string | null;
  priority: string;
  startAt: Date | string | null;
  dueAt: Date | string | null;
  documentId: string | null;
}

export interface TicketFilter {
  projectId?: string | null;
  status?: string | null;
  priority?: string | null;
  mine?: boolean;
}
