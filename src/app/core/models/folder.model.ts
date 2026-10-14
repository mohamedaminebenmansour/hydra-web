/**
 * Folder as returned by GET /api/projects/{id}/folders (FolderResponse).
 * Serialized camelCase by Jackson: id, projectId, parentId, code, name,
 * sortOrder, createdAt. There is NO documentCount — the UI derives
 * per-folder counts from its own search results when needed.
 */
export interface Folder {
  id: string;
  projectId: string | null;
  parentId?: string | null;
  code?: string | null;
  name: string;
  sortOrder?: number | null;
  createdAt?: string | null;
}

/** Centralized backend → UI mapping (single place to adjust). */
export function mapFolder(raw: any): Folder {
  return {
    id: raw?.id,
    projectId: raw?.projectId ?? null,
    parentId: raw?.parentId ?? null,
    code: raw?.code ?? null,
    name: raw?.name ?? '',
    sortOrder: raw?.sortOrder ?? null,
    createdAt: raw?.createdAt ?? null
  };
}
