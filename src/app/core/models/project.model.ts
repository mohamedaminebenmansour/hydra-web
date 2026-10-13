export type ProjectType = 'RESERVOIR' | 'RESEAU' | 'BRANCHEMENTS' | 'MIXTE' | 'AUTRE';

export type ProjectRole = 'MANAGER' | 'MEMBER' | 'VIEWER';

export interface Project {
  id: string;
  name: string;
  code?: string | null;
  status: string; // 'ACTIF' | 'CLOTURE'
  clientName?: string | null;
  location?: string | null;
  governorate?: string | null;
  projectType?: ProjectType | null;
  startDate?: string | null;
  endDate?: string | null;
  description?: string | null;
  contractValue?: number | null;
  createdAt?: string;
}

/** POST /api/projects */
export interface ProjectCreate {
  name: string;
  code?: string | null;
  clientName?: string | null;
  location?: string | null;
  governorate?: string | null;
  projectType?: ProjectType | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  description?: string | null;
  contractValue?: number | null;
  memberIds?: string[];
}

/** PUT /api/projects/{id} */
export interface ProjectUpdate {
  name: string;
  code?: string | null;
  status: string;
  clientName?: string | null;
  location?: string | null;
  governorate?: string | null;
  projectType?: ProjectType | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  description?: string | null;
  contractValue?: number | null;
}

/** Member of a project (detail page — next prompt). */
export interface ProjectMember {
  id: string;
  userId: string;
  fullName: string;
  email?: string;
  roleOnProject?: ProjectRole | string | null;
  canUpload?: boolean;
  addedAt?: string | null;
}

/** Auto-created by the backend on project creation. */
export interface ProjectFolder {
  id: string;
  name: string;
  code?: string | null;
  createdAt?: string | null;
}

/** POST /api/projects/{id}/members */
export interface MemberCreate {
  userId: string;
  roleOnProject?: ProjectRole | string | null;
  canUpload?: boolean;
}

/** PUT /api/projects/{id}/members/{userId} */
export interface MemberUpdate {
  roleOnProject?: ProjectRole | string | null;
  canUpload?: boolean;
}

export const PROJECT_TYPE_OPTS: { label: string; value: ProjectType }[] = [
  { label: 'Réservoir', value: 'RESERVOIR' },
  { label: 'Réseau', value: 'RESEAU' },
  { label: 'Branchements', value: 'BRANCHEMENTS' },
  { label: 'Mixte', value: 'MIXTE' },
  { label: 'Autre', value: 'AUTRE' }
];

export const PROJECT_TYPE_LABELS: Record<string, string> = {
  RESERVOIR: 'Réservoir',
  RESEAU: 'Réseau',
  BRANCHEMENTS: 'Branchements',
  MIXTE: 'Mixte',
  AUTRE: 'Autre'
};

export const PROJECT_ROLE_OPTS: { label: string; value: ProjectRole }[] = [
  { label: 'Responsable', value: 'MANAGER' },
  { label: 'Membre', value: 'MEMBER' },
  { label: 'Observateur', value: 'VIEWER' }
];

export const PROJECT_ROLE_LABELS: Record<string, string> = {
  MANAGER: 'Responsable',
  MEMBER: 'Membre',
  VIEWER: 'Observateur'
};

/**
 * Centralized backend → UI mapping. The backend is currently unreachable to
 * confirm exact JSON field names; if they differ, adjust ONLY here.
 */
export function mapProject(raw: any): Project {
  return {
    id: raw.id,
    name: raw.name,
    code: raw.code ?? null,
    status: raw.status ?? 'ACTIF',
    clientName: raw.clientName ?? null,
    location: raw.location ?? null,
    governorate: raw.governorate ?? null,
    projectType: raw.projectType ?? null,
    startDate: raw.startDate ?? null,
    endDate: raw.endDate ?? null,
    description: raw.description ?? null,
    contractValue: raw.contractValue ?? null,
    createdAt: raw.createdAt
  };
}

