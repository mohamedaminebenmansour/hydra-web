/** Status of a single step inside a process instance. */
export type StepStatus = 'PENDING' | 'DONE' | 'REJECTED' | 'SKIPPED';

/** Status of a whole process instance. */
export type ProcessStatus = 'RUNNING' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';

/** Body for POST /api/processes/start */
export interface StartProcessBody {
  projectId: string;
  templateKey: string;
  subjectType: string;
  subjectId: string;
}

/** Lightweight task card for "Mes t\u00e2ches" */
export interface MyTask {
  stepInstanceId: string;
  instanceId: string;
  projectId: string;
  projectName?: string;
  templateKey?: string;
  templateName?: string;
  subjectType?: string;
  subjectId?: string;
  stepKey?: string;
  stepName?: string;
  status: StepStatus | string;
  assigneeRole?: string;
  assigneeName?: string;
  requiresAttachment?: boolean;
  startedAt?: string;
}

/** A single step in the timeline */
export interface TimelineStep {
  stepInstanceId?: string;
  stepOrder?: number;
  stepKey?: string;
  name?: string;
  status: string;
  assigneeRole?: string;
  assigneeName?: string;
  requiresAttachment?: boolean;
  comment?: string;
  startedAt?: string;
  completedAt?: string;
}

/** Full process timeline snapshot */
export interface ProcessTimeline {
  instanceId: string;
  status: string;
  projectId?: string;
  templateKey?: string;
  templateName?: string;
  subjectType?: string;
  subjectId?: string;
  steps: TimelineStep[];
}

/** Process template definition used by start page and hub cards. */
export interface ProcessTemplate {
  key: string;
  name: string;
  icon: string;
}

/** Default templates \u2013 fallback when /api/processes/templates 404s. */
export const PROCESS_TEMPLATES: ProcessTemplate[] = [
  { key: 'PAYMENT_APPROVAL', name: 'Approbation de paiement', icon: 'pi-wallet' },
  { key: 'MATERIAL_PURCHASE', name: 'Achat de mat\u00e9riel', icon: 'pi-shopping-cart' },
  { key: 'SUBCONTRACT_APPROVAL', name: 'Sous-traitance', icon: 'pi-users' },
];

/** Role \u2192 icon mapping (UX system) */
export const ROLE_ICONS: Record<string, string> = {
  OWNER: 'pi-crown',
  FINANCE: 'pi-wallet',
  CHEF_PROJET: 'pi-briefcase',
  default: 'pi-user',
};

/** Status \u2192 icon + French label (UX system) */
export const STATUS_INFO: Record<string, { icon: string; label: string; colorClass: string }> = {
  PENDING:   { icon: 'pi-clock',          label: 'En attente',   colorClass: 'proc-text-pending' },
  DONE:      { icon: 'pi-check-circle',   label: 'Termin\u00e9',      colorClass: 'proc-text-done' },
  REJECTED:  { icon: 'pi-times-circle',   label: 'Refus\u00e9',       colorClass: 'proc-text-rejected' },
  RUNNING:   { icon: 'pi-play',           label: 'En cours',     colorClass: 'proc-text-running' },
  CANCELLED: { icon: 'pi-ban',            label: 'Annul\u00e9',       colorClass: 'proc-text-muted' },
  SKIPPED:   { icon: 'pi-minus-circle',   label: 'Ignor\u00e9',       colorClass: 'proc-text-muted' },
};

/** Dot color class for a step status (timeline dots). */
export function dotColorClass(status: string): string {
  const s = String(status ?? '').toUpperCase();
  switch (s) {
    case 'DONE':   return 'proc-dot-done';
    case 'PENDING': return 'proc-dot-pending';
    case 'REJECTED': return 'proc-dot-rejected';
    case 'RUNNING': return 'proc-dot-running';
    default: return 'proc-dot-muted';
  }
}

/** Mapper: defensive \u2013 accepts camelCase, snake_case, and legacy keys. */
export function mapProcessStep(raw: any): TimelineStep {
  const rawStatus = String(raw?.status ?? raw?.step_status ?? 'PENDING').toUpperCase();
  return {
    stepInstanceId: String(raw?.stepInstanceId ?? raw?.step_instance_id ?? raw?.id ?? ''),
    stepOrder: raw?.stepOrder ?? raw?.step_order ?? raw?.order ?? undefined,
    stepKey: String(raw?.stepKey ?? raw?.step_key ?? ''),
    name: String(raw?.name ?? raw?.stepName ?? raw?.step_name ?? '\u00c9tape'),
    status: rawStatus,
    assigneeRole: String(raw?.assigneeRole ?? raw?.assignee_role ?? ''),
    assigneeName: String(raw?.assigneeName ?? raw?.assignee_name ?? raw?.assigneeUserEmail ?? raw?.assignee ?? ''),
    requiresAttachment: Boolean(raw?.requiresAttachment ?? raw?.requires_attachment ?? false),
    comment: String(raw?.comment ?? raw?.comment_text ?? ''),
    startedAt: String(raw?.startedAt ?? raw?.started_at ?? ''),
    completedAt: String(raw?.completedAt ?? raw?.completed_at ?? ''),
  };
}

/** Mapper: defensive \u2013 accepts camelCase, snake_case, and legacy keys. */
export function mapMyTask(raw: any): MyTask {
  const rawStatus = String(raw?.status ?? raw?.instanceStatus ?? raw?.instance_status ?? 'PENDING').toUpperCase();
  const status: StepStatus =
    rawStatus === 'DONE' || rawStatus === 'REJECTED' || rawStatus === 'SKIPPED' ? rawStatus : 'PENDING';

  return {
    stepInstanceId: String(raw?.stepInstanceId ?? raw?.step_instance_id ?? raw?.id ?? ''),
    instanceId: String(raw?.instanceId ?? raw?.instance_id ?? raw?.processId ?? ''),
    projectId: String(raw?.projectId ?? raw?.project_id ?? ''),
    projectName: String(raw?.projectName ?? raw?.project_name ?? ''),
    templateKey: String(raw?.templateKey ?? raw?.template_key ?? ''),
    templateName: String(raw?.templateName ?? raw?.template_name ?? raw?.templateKey ?? ''),
    subjectType: String(raw?.subjectType ?? raw?.subject_type ?? ''),
    subjectId: String(raw?.subjectId ?? raw?.subject_id ?? ''),
    stepKey: String(raw?.stepKey ?? raw?.step_key ?? ''),
    stepName: String(raw?.stepName ?? raw?.step_name ?? raw?.name ?? '\u00c9tape'),
    status,
    assigneeRole: String(raw?.assigneeRole ?? raw?.assignee_role ?? ''),
    assigneeName: String(raw?.assigneeName ?? raw?.assignee_name ?? raw?.assigneeUserEmail ?? raw?.assignee ?? ''),
    requiresAttachment: Boolean(raw?.requiresAttachment ?? raw?.requires_attachment ?? false),
    startedAt: String(raw?.startedAt ?? raw?.started_at ?? ''),
  };
}

/** Mapper: defensive \u2013 accepts camelCase, snake_case, and legacy keys. */
export function mapProcessTimeline(raw: any): ProcessTimeline {
  const steps = Array.isArray(raw?.steps) ? raw.steps : (Array.isArray(raw) ? raw : []);
  return {
    instanceId: String(raw?.instanceId ?? raw?.instance_id ?? raw?.id ?? raw?.processId ?? ''),
    status: String(raw?.status ?? raw?.process_status ?? 'RUNNING'),
    projectId: String(raw?.projectId ?? raw?.project_id ?? ''),
    templateKey: String(raw?.templateKey ?? raw?.template_key ?? ''),
    templateName: String(raw?.templateName ?? raw?.template_name ?? ''),
    subjectType: String(raw?.subjectType ?? raw?.subject_type ?? ''),
    subjectId: String(raw?.subjectId ?? raw?.subject_id ?? ''),
    steps: steps.map(mapProcessStep),
  };
}


