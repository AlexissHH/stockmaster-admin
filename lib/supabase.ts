// ⚠️  This file is safe to import from client components.
// Do NOT add the Supabase client here. Use lib/supabase.server.ts for that.

export type PlanId =
  | 'STARTER_LOCAL' | 'COMERCIO_LOCAL' | 'COMERCIO_PLUS_LOCAL' | 'PYME_LOCAL'
  | 'STARTER_SERVIDOR' | 'COMERCIO_SERVIDOR' | 'COMERCIO_PLUS_SERVIDOR' | 'PYME_SERVIDOR'

export type Edition = 'LOCAL' | 'SERVIDOR'

export const PLAN_LABELS: Record<string, string> = {
  STARTER_LOCAL:     'Starter Local',
  COMERCIO_LOCAL:    'Comercio Local',
  COMERCIO_PLUS_LOCAL: 'Comercio Plus Local',
  PYME_LOCAL:        'Pyme Local',
  STARTER_SERVIDOR:  'Starter Servidor',
  COMERCIO_SERVIDOR: 'Comercio Servidor',
  COMERCIO_PLUS_SERVIDOR: 'Comercio Plus Servidor',
  PYME_SERVIDOR:     'Pyme Servidor',
}

export const PLANES = Object.keys(PLAN_LABELS) as PlanId[]

export const LIMITE_TERMINALES: Record<string, number> = {
  STARTER_LOCAL:  0,
  COMERCIO_LOCAL: 2,
  COMERCIO_PLUS_LOCAL: 3,
  PYME_LOCAL:     4,
}

export function getEdicion(planId: string): Edition {
  return planId.endsWith('_SERVIDOR') ? 'SERVIDOR' : 'LOCAL'
}

export function getLimiteTerminales(planId: string): number | null {
  if (getEdicion(planId) === 'SERVIDOR') return null
  return LIMITE_TERMINALES[planId] ?? 0
}

export function getTotalPCsLabel(planId: string): string {
  if (getEdicion(planId) === 'SERVIDOR') return 'Ilimitadas'
  const limite = LIMITE_TERMINALES[planId] ?? 0
  if (limite === 0) return '1 PC'
  return `hasta ${limite + 1} PCs`
}

export interface Licencia {
  id: string
  licencia_hash: string
  cliente_nombre: string
  plan_id: string
  pagado_hasta: string
  activa: boolean
  edition: string
  terminales_activas: number
  version_app: string | null
  ultima_vez: string | null
  cantidad_aperturas: number
  creada_en: string
  clave_texto: string | null
  update_required: boolean | null
  update_version: string | null
  update_notes: string | null
  update_url: string | null
}

export interface Terminal {
  id: string
  licencia_hash: string
  terminal_id: string
  nombre_pc: string | null
  ultima_vez: string | null
  version_app: string | null
}

export function diasRestantes(pagadoHasta: string): number {
  return Math.floor((new Date(pagadoHasta).getTime() - Date.now()) / 86400000)
}

export function estadoLicencia(l: Licencia): 'activa' | 'por-vencer' | 'vencida' | 'bloqueada' {
  if (!l.activa) return 'bloqueada'
  const dias = diasRestantes(l.pagado_hasta)
  if (dias <= 0) return 'vencida'
  if (dias <= 7) return 'por-vencer'
  return 'activa'
}
