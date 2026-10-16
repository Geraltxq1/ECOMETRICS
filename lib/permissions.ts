export const ROLES = {
  admin:   { canEdit: true,  canReview: true,  canPublish: true,  canAdmin: true,  canView: true, canExport: true },
  editor:  { canEdit: true,  canReview: false, canPublish: false, canAdmin: false, canView: true, canExport: true },
  viewer:  { canEdit: false, canReview: false, canPublish: false, canAdmin: false, canView: true, canExport: false },
  auditor: { canEdit: false, canReview: true,  canPublish: false, canAdmin: false, canView: true, canExport: true },
}
export const canEdit    = (rol: string) => ROLES[rol as keyof typeof ROLES]?.canEdit    ?? false
export const canReview  = (rol: string) => ROLES[rol as keyof typeof ROLES]?.canReview  ?? false
export const canPublish = (rol: string) => ROLES[rol as keyof typeof ROLES]?.canPublish ?? false
export const canAdmin   = (rol: string) => ROLES[rol as keyof typeof ROLES]?.canAdmin   ?? false
export const canView    = (rol: string) => ROLES[rol as keyof typeof ROLES]?.canView    ?? false
export const canExport  = (rol: string) => ROLES[rol as keyof typeof ROLES]?.canExport  ?? false
export const getRolLabel = (rol: string) => ({ admin: 'Administrador', editor: 'Editor', viewer: 'Visualizador', auditor: 'Auditor' }[rol] ?? rol)
export const getRolColor = (rol: string) => ({ admin: '#16a34a', editor: '#2563eb', viewer: '#64748b', auditor: '#d97706' }[rol] ?? '#64748b')
