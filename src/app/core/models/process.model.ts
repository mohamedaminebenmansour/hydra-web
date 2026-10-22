/** Status of a single step inside a process instance. */
export type StepStatus = 'DONE' | 'PENDING' | 'REJECTED';

/** Status of a whole process instance. */
export type ProcessStatus = 'RUNNING' | 'COMPLETED' | 'REJECTED' | 'DRAFT';

export interface ProcessStepView {
  /** Unique step instance ID (backend returns stepInstanceId) */
  stepInstanceId: string;
  /** Human-readable step name, e.g. "Paiement à valider" */
  stepName: string;
  /** Status: 'DONE' | 'PENDING' | 'REJECTED' */
  status: StepStatus;
  /** Who performed the step (full name or initials) */
  assigneeName: string;
  /** When it was completed/started (ISO string, normalized by mapper) */
  completedAt: string | null;
  /** Optional comment left on reject */
  comment: string | null;
  /** French status label */
  statusFrench: string;
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
  subjectType: string;   // e.g. 'PAYMENT'
  subjectId: string;     // UUID of the payment/subject
  assigneeName: string;
  status: StepStatus;
  isOverdue?: boolean;
}

/** Full process snapshot for the timeline header */
export interface ProcessHeader {
  /** Process instance ID when the backend exposes it */
  id?: string;
  /** Backend process status */
  status: ProcessStatus;
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
const STEP_STATUS_LABELS: Record<StepStatus, string> = {
  DONE: 'Terminé',
  PENDING: 'En attente de vous',
  REJECTED: 'Refusé',
};

const PROCESS_STATUS_LABELS: Record<ProcessStatus, string> = {
  RUNNING: 'En cours',
  COMPLETED: 'Terminé',
  REJECTED: 'Refusé',
  DRAFT: 'Brouillon',
};

export function mapProcessStep(raw: any): ProcessStepView {
  const rawStatus = String(raw?.status ?? raw?.step_status ?? 'PENDING').toUpperCase();
  const status: StepStatus =
    rawStatus === 'DONE' || rawStatus === 'REJECTED' ? rawStatus : 'PENDING';

  return {
    stepInstanceId: String(raw?.stepInstanceId ?? raw?.step_instance_id ?? raw?.id ?? ''),
    stepName: String(raw?.stepName ?? raw?.name ?? raw?.step_name ?? 'Étape'),
    status,
    assigneeName: String(raw?.assigneeName ?? raw?.assigneeUserEmail ?? raw?.assignee ?? ''),
    completedAt: raw?.completedAt ?? raw?.completed_at ?? null,
    comment: raw?.comment ?? null,
    statusFrench: STEP_STATUS_LABELS[status],
  };
}

export function mapMyTask(raw: any): MyTask {
  // Backend MyTaskSummary: stepInstanceId, instanceId, templateKey,
  // subjectType, subjectId, stepName/name, instanceStatus
  const rawStatus = String(raw?.status ?? raw?.instanceStatus ?? 'PENDING').toUpperCase();
  const status: StepStatus =
    rawStatus === 'DONE' || rawStatus === 'REJECTED' ? rawStatus : 'PENDING';

  return {
    processId: String(raw?.processId ?? raw?.instanceId ?? raw?.instance_id ?? ''),
    processName: String(raw?.processName ?? raw?.templateKey ?? raw?.template_key ?? 'Processus'),
    stepInstanceId: String(raw?.stepInstanceId ?? raw?.step_instance_id ?? raw?.id ?? ''),
    stepName: String(raw?.stepName ?? raw?.name ?? raw?.step_key ?? 'Étape'),
    subjectType: String(raw?.subjectType ?? raw?.subject_type ?? ''),
    subjectId: String(raw?.subjectId ?? raw?.subject_id ?? ''),
    assigneeName: String(raw?.assigneeName ?? raw?.assigneeUserEmail ?? ''),
    status,
    isOverdue: !!raw?.isOverdue,
  };
}

export function mapProcessHeader(raw: any): ProcessHeader {
  const rawStatus = String(raw?.status ?? raw?.process_status ?? 'RUNNING').toUpperCase();
  const status: ProcessStatus =
    rawStatus === 'COMPLETED' || rawStatus === 'REJECTED' || rawStatus === 'DRAFT'
      ? rawStatus
      : 'RUNNING';

  return {
    id: raw?.id != null ? String(raw.id) : undefined,
    status,
    templateName: String(raw?.templateName ?? raw?.template_key ?? raw?.templateKey ?? 'Processus'),
    statusLabel: PROCESS_STATUS_LABELS[status],
    startedAt: raw?.startedAt ?? raw?.created_at ?? raw?.createdAt ?? null,
  };
}
