export const PERM = {
  TICKET_READ: 'TICKET_READ',
  TICKET_WRITE: 'TICKET_WRITE',
  USER_CREATE: 'USER_CREATE',
  USER_UPDATE: 'USER_UPDATE',
  USER_DEACTIVATE: 'USER_DEACTIVATE',
  ROLE_ASSIGN: 'ROLE_ASSIGN',
  ROLE_MANAGE: 'ROLE_MANAGE',
  PROJECT_MANAGE: 'PROJECT_MANAGE',
  DOCUMENT_READ: 'DOCUMENT_READ',
  DOCUMENT_UPLOAD: 'DOCUMENT_UPLOAD',
  DOCUMENT_DOWNLOAD: 'DOCUMENT_DOWNLOAD',
  AUDIT_VIEW: 'AUDIT_VIEW'
} as const;

export const PERM_LABELS: Record<string, string> = {
  USER_CREATE: 'Ajouter des utilisateurs',
  USER_UPDATE: 'Modifier des utilisateurs',
  USER_DEACTIVATE: 'Désactiver des utilisateurs',
  ROLE_ASSIGN: 'Attribuer les rôles',
  ROLE_MANAGE: 'Créer des rôles',
  PROJECT_MANAGE: 'Gérer les projets',
  DOCUMENT_READ: 'Voir les documents',
  DOCUMENT_UPLOAD: 'Ajouter des documents',
  DOCUMENT_DOWNLOAD: 'Télécharger des documents',
  AUDIT_VIEW: "Voir le rapport d'activité",
  TICKET_READ: 'Voir les tickets',
  TICKET_WRITE: 'Créer et fermer les tickets'
};