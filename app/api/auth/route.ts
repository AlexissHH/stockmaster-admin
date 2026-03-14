import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'

// Token de sesión: HMAC-SHA256 de la contraseña con una sal fija del proyecto.
// Nunca se guarda ni transmite la contraseña cruda — solo este token.
function generarSessionToken(password: string): string {
  return crypto
    .createHmac('sha256', process.env.LICENSE_SECRET ?? 'fallback-salt')
    .update(password)
    .digest('hex')
}

const SESSION_TOKEN = generarSessionToken(process.env.ADMIN_PASSWORD ?? '')

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  const adminPassword = process.env.ADMIN_PASSWORD ?? ''
  const match = password
    && adminPassword.length > 0
    && (() => { try { return crypto.timingSafeEqual(Buffer.from(password), Buffer.from(adminPassword)) } catch { return false } })()

  if (!match) {
    // Espera fija para evitar timing attacks (no revelar si fue "muy rápido")
    await new Promise(r => setTimeout(r, 300))
    return NextResponse.json({ ok: false, error: 'Contraseña incorrecta' }, { status: 401 })
  }

  const cookieStore = await cookies()
  // Se guarda el TOKEN hasheado, nunca la contraseña
  cookieStore.set('admin_session', SESSION_TOKEN, {
    httpOnly: true,                                      // JS del navegador no puede leerla
    secure: process.env.NODE_ENV === 'production',       // solo HTTPS en producción
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,                           // 7 días
    path: '/',
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete('admin_session')
  return NextResponse.json({ ok: true })
}

export const dynamic = 'force-dynamic'