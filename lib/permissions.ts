export type Role = 'admin' | 'editor' | 'viewer' | 'auditor'

export const ROLES: Record<Role, { label: string; color: string; bg: string; permisos: string[] }> = {
  admin:   { label: 'Admin',   color: '#16a34a', bg: '#f0fdf4', permisos: ['ver', 'editar', 'admin', 'exportar', 'auditar'] },
  editor:  { label: 'Editor',  color: '#1d4ed8', bg: '#eff6ff', permisos: ['ver', 'editar', 'exportar'] },
  viewer:  { label: 'Viewer',  color: '#64748b', bg: '#f8fafc', permisos: ['ver'] },
  auditor: { label: 'Auditor', color: '#d97706', bg: '#fffbeb', permisos: ['ver', 'auditar'] },
}

export function canEdit(rol: string): boolean {
  return ['admin', 'editor'].includes(rol)
}

export function canAdmin(rol: string): boolean {
  return rol === 'admin'
}

export function canView(rol: string): boolean {
  return ['admin', 'editor', 'viewer', 'auditor'].includes(rol)
}

export function canExport(rol: string): boolean {
  return ['admin', 'editor'].includes(rol)
}

export function canAudit(rol: string): boolean {
  return ['admin', 'auditor'].includes(rol)
}

export function canReview(rol: string): boolean {
  return ['admin', 'auditor'].includes(rol)
}

export function canPublish(rol: string): boolean {
  return rol === 'admin'
}

export function getRolLabel(rol: string): string {
  return ROLES[rol as Role]?.label ?? rol
}

export function getRolColor(rol: string): string {
  return ROLES[rol as Role]?.color ?? '#64748b'
}
