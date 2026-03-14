// Ported from src/main/lib/licencia-keygen.ts — binary + Base32 format.
// Must stay 100% byte-compatible with the Electron app.
//
// SERVER-ONLY: requires LICENSE_SECRET (no NEXT_PUBLIC_ prefix).
// Do NOT import from client components.

import { createHmac, createHash } from 'crypto'

// ── Plan IDs (must match the Electron app exactly) ───────────────────────────

const PLAN_IDS = [
  'STARTER_LOCAL',
  'COMERCIO_LOCAL',
  'PYME_LOCAL',
  'STARTER_SERVIDOR',
  'COMERCIO_SERVIDOR',
  'PYME_SERVIDOR',
] as const

export type PlanId = (typeof PLAN_IDS)[number]

// ── Tipos públicos ────────────────────────────────────────────────────────────

export interface DatosLicencia {
  planId: string
  clienteNombre: string
  clienteCuit?: string
  emitidaEn: string  // YYYY-MM-DD
  expiresAt: string  // YYYY-MM-DD
}

// ── Constantes internas ───────────────────────────────────────────────────────

const FORMAT_VERSION = 0x01
const EPOCH_MS = Date.UTC(2020, 0, 1)
const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const HMAC_BYTES = 8
const MAX_NOMBRE_BYTES = 50

// ── Base32 ────────────────────────────────────────────────────────────────────

function base32Encode(buf: Buffer): string {
  let bits = 0
  let value = 0
  let output = ''

  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i]
    bits += 8
    while (bits >= 5) {
      bits -= 5
      output += B32_ALPHABET[(value >> bits) & 0x1f]
    }
  }

  if (bits > 0) {
    output += B32_ALPHABET[(value << (5 - bits)) & 0x1f]
  }

  return output
}

// ── Helpers de fecha ──────────────────────────────────────────────────────────

function dateToDays(iso: string): number {
  const y = parseInt(iso.slice(0, 4), 10)
  const m = parseInt(iso.slice(5, 7), 10) - 1
  const d = parseInt(iso.slice(8, 10), 10)
  const ms = Date.UTC(y, m, d, 12, 0, 0)
  return Math.floor((ms - EPOCH_MS) / 86_400_000)
}

// ── Funciones públicas ────────────────────────────────────────────────────────

/**
 * Genera una clave de activación en el mismo formato binario+Base32 que usa el
 * Electron app. El `secret` debe ser `process.env.LICENSE_SECRET`.
 */
export function generarClave(datos: DatosLicencia, secret: string): string {
  if (!secret) throw new Error('LICENSE_SECRET no puede estar vacío')

  const planIdx = (PLAN_IDS as readonly string[]).indexOf(datos.planId)
  if (planIdx === -1) throw new Error(`Plan inválido: "${datos.planId}"`)

  const nombreBuf = Buffer.from(datos.clienteNombre.trim().slice(0, MAX_NOMBRE_BYTES), 'utf8')

  const hasCuit = Boolean(datos.clienteCuit?.trim())
  let cuitBuf: Buffer | undefined
  if (hasCuit && datos.clienteCuit) {
    const cuitDigits = datos.clienteCuit.replace(/\D/g, '')
    if (cuitDigits.length !== 11) throw new Error(`CUIT inválido: debe tener exactamente 11 dígitos`)
    cuitBuf = Buffer.from(cuitDigits, 'ascii')
  }

  const emitidaDays = dateToDays(datos.emitidaEn)
  const expiresAtDays = dateToDays(datos.expiresAt)

  const flags = (planIdx & 0x07) | (hasCuit ? 0x08 : 0x00)

  const parts: Buffer[] = [
    Buffer.from([FORMAT_VERSION]),
    Buffer.from([flags]),
    Buffer.from([emitidaDays >> 8, emitidaDays & 0xff]),
    Buffer.from([expiresAtDays >> 8, expiresAtDays & 0xff]),
    Buffer.from([nombreBuf.length]),
    nombreBuf,
  ]

  if (cuitBuf) parts.push(cuitBuf)

  const payload = Buffer.concat(parts)
  const hmac = createHmac('sha256', secret).update(payload).digest()
  const combined = Buffer.concat([payload, hmac.subarray(0, HMAC_BYTES)])

  const encoded = base32Encode(combined)
  const chunks = encoded.match(/.{1,6}/g) ?? []
  return 'SM-' + chunks.join('-')
}

/**
 * Hash SHA-256 de la clave normalizada.
 * Mismo algoritmo que el Electron app — este es el valor guardado en Supabase.
 */
export function hashClave(clave: string): string {
  const normalized = clave.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return createHash('sha256').update(normalized, 'utf8').digest('hex')
}

/**
 * Genera una clave que vence en `dias` días a partir de hoy.
 * Requiere `secret` = `process.env.LICENSE_SECRET`.
 */
export function claveParaDias(
  datos: Omit<DatosLicencia, 'emitidaEn' | 'expiresAt'>,
  dias: number,
  secret: string,
): string {
  const hoy = new Date().toISOString().slice(0, 10)
  const expira = new Date()
  expira.setDate(expira.getDate() + dias)
  return generarClave(
    { ...datos, emitidaEn: hoy, expiresAt: expira.toISOString().slice(0, 10) },
    secret,
  )
}
