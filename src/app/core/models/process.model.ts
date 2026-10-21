export interface ProcessStepView {
  /** Unique step instance ID (backend returns stepInstanceId) */
  stepInstanceId: string;
  /** Human-readable step name, e.g. "Paiement à valider" */
  stepName: string;
  /** Status: 'DONE' | 'PENDING' | 'REJECTED' */
  status: 'DONE' | 'PENDING' | 'REJECTED';
  /** Who performed the step (full name or initials) */
  assigneeName: string;
  /** When it was completed/started (ISO string, normalized by mapper) */
  completedAt: string | null;
  /** Optional comment left on reject */
  comment: string | null;
}

export interface ProcessTimelineEvent extends ProcessStepView {
  /** Backend may send 'createdAt' or 'timestamp' – we accept both. */
  createdAt?: string;
}

/** Lightweight task card for "Mes tâches" */
export interface MyTask {
  processId: string;
  processName: string;
  stepInstanceId: string;
  stepName: string;
  subjectType: string;   // e.g. 'PAYMENT_APPROVAL'
  subjectId: string;     // UUID of the payment/subject
  assigneeName: string;
  status: 'PENDING' | 'REJECTED' | 'DONE';
  isOverdue?: boolean;
}

/** Full process snapshot for the timeline header */
export interface ProcessHeader {
  /** Backend process status */
  status: 'RUNNING' | 'COMPLETED' | 'REJECTED' | 'DRAFT';
  /** Template / project name */
  templateName: string;
  /** Human-readable status label */
  statusLabel: string;
  /** When the process was started */
  startedAt: string | null;
}

/** Mapper: defensive – accepts camelCase, snake_case, and legacy keys.
 *  Expected backend shapes (to be verified when API is up):
 *  - /api/processes/start      → { processId, templateName, status, startedAt }
 *  - /api/processes/{id}/timeline → { process, steps: ProcessStepView[] }
 *  - /api/processes/my-tasks   → { tasks: MyTask[] }
 *  - POST /steps/{id}/complete → { stepInstanceId, newStatus }
 *  - POST /steps/{id}/reject   → { stepInstanceId, newStatus, comment }
 */
export function mapProcessStep(raw: any): ProcessStepView {
  return {
    stepInstanceId: raw?.stepInstanceId ?? raw?.step_instance_id ?? raw?.id ?? '',
    stepName: raw?.stepName ?? raw?.step_name ?? raw?.subject ?? 'Étape inconnue',
    status: (raw?.status ?? raw?.step_status ?? 'PENDING') as 'DONE' | 'PENDING' | 'REJECTED',
    assigneeName: raw?.assigneeName ?? raw?.assignee ?? raw?.createdByName ?? raw?.created_by ?? '',
    completedAt: raw?.completedAt ?? raw?.completed_at ?? raw?.createdAt ?? raw?.created_at ?? null,
    comment: raw?.comment ?? raw?.commentaire ?? null,
  };
}

export function mapMyTask(raw: any): MyTask {
  return {
    processId: raw?.processId ?? raw?.process_id ?? '',
    processName: raw?.processName ?? raw?.process_name ?? 'Processus inconnu',
    stepInstanceId: raw?.stepInstanceId ?? raw?.step_instance_id ?? '',
    stepName: raw?.stepName ?? raw?.step_name ?? raw?.subject ?? 'Étape en attente',
    subjectType: raw?.subjectType ?? raw?.subject_type ?? 'PAYMENT_APPROVAL',
    subjectId: raw?.subjectId ?? raw?.subject_id ?? '',
    assigneeName: raw?.assigneeName ?? raw?.assignee ?? raw?.assignedToName ?? raw?.assigned_to ?? '',
    status: (raw?.status ?? raw?.step_status ?? 'PENDING') as 'PENDING' | 'REJECTED' | 'DONE',
    isOverdue: !!raw?.isOverdue,
  };
}

export function mapProcessHeader(raw: any): ProcessHeader {
  const status = (raw?.status ?? raw?.process_status ?? 'RUNNING') as 'RUNNING' | 'COMPLETED' | 'REJECTED' | 'DRAFT';
  // French labels per UX rules
  const statusLabelMap: Record<string, string> = {
    RUNNING: 'En cours',
    COMPLETED: 'Terminé',
    REJECTED: 'Refusé',
    DRAFT: 'Brouillon',
  };
  return {
    status,
    templateName: raw?.templateName ?? raw?.template_name ?? raw?.projectName ?? 'Processus',
    statusLabel: statusLabelMap[status] ?? status,
    startedAt: raw?.startedAt ?? raw?.started_at ?? null,
  };
}