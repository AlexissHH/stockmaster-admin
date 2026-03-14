import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { claveParaDias, hashClave } from '@/lib/licencias'
import { supabase } from '@/lib/supabase.server'


function generarSessionToken(password: string): string {
  return crypto
    .createHmac('sha256', process.env.LICENSE_SECRET ?? 'fallback-salt')
    .update(password)
    .digest('hex')
}

async function autenticado(): Promise<boolean> {
  try {
    const token = (await cookies()).get('admin_session')?.value
    if (!token || !process.env.ADMIN_PASSWORD) return false
    const esperado = generarSessionToken(process.env.ADMIN_PASSWORD)
    const bufToken    = Buffer.from(token)
    const bufEsperado = Buffer.from(esperado)
    if (bufToken.length !== bufEsperado.length) return false
    return crypto.timingSafeEqual(bufToken, bufEsperado)
  } catch { return false }
}

export async function POST(req: NextRequest) {
  if (!await autenticado()) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Verificar variables de entorno
  if (!process.env.SUPABASE_SERVICE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_KEY no configurado en .env.local' }, { status: 500 })
  }
  if (!process.env.LICENSE_SECRET) {
    return NextResponse.json({ error: 'LICENSE_SECRET no configurado en .env.local' }, { status: 500 })
  }

  try {
    const body = await req.json()
    const { planId, clienteNombre, clienteCuit, dias } = body

    if (!planId || !clienteNombre || !dias) {
      return NextResponse.json({ error: 'Faltan campos: planId, clienteNombre y dias son obligatorios' }, { status: 400 })
    }

    const secret = process.env.LICENSE_SECRET
    const clave = claveParaDias(
      { planId, clienteNombre, clienteCuit: clienteCuit || undefined },
      Number(dias),
      secret,
    )
    const hash = hashClave(clave)

    const expira = new Date()
    expira.setDate(expira.getDate() + Number(dias))
    const edition = planId.endsWith('_SERVIDOR') ? 'SERVIDOR' : 'LOCAL'

    // Verificar si ya existe (para no sobreescribir estadísticas)
    const { data: existente } = await supabase
      .from('licencias')
      .select('id')
      .eq('licencia_hash', hash)
      .maybeSingle()

    let sbError: { message: string } | null = null

    if (existente) {
      const res = await supabase.from('licencias').update({
        cliente_nombre: clienteNombre,
        plan_id: planId,
        pagado_hasta: expira.toISOString(),
        activa: true,
        edition,
        clave_texto: clave,
      }).eq('id', existente.id)
      sbError = res.error
    } else {
      const res = await supabase.from('licencias').insert({
        licencia_hash:      hash,
        cliente_nombre:     clienteNombre,
        plan_id:            planId,
        pagado_hasta:       expira.toISOString(),
        activa:             true,
        edition,
        terminales_activas: 0,
        ultima_vez:         null,
        cantidad_aperturas: 0,
        clave_texto:        clave,
      })
      sbError = res.error
    }

    if (sbError) {
      console.error('[generar-clave] Error Supabase:', sbError.message)
      // Si el error es por la columna clave_texto que no existe aún, reintentar sin ella
      if (sbError.message.includes('clave_texto')) {
        const res2 = existente
          ? await supabase.from('licencias').update({
              cliente_nombre: clienteNombre,
              plan_id: planId,
              pagado_hasta: expira.toISOString(),
              activa: true,
              edition,
            }).eq('id', existente.id)
          : await supabase.from('licencias').insert({
              licencia_hash:      hash,
              cliente_nombre:     clienteNombre,
              plan_id:            planId,
              pagado_hasta:       expira.toISOString(),
              activa:             true,
              edition,
              terminales_activas: 0,
              cantidad_aperturas: 0,
            })
        if (res2.error) {
          return NextResponse.json({ error: res2.error.message }, { status: 500 })
        }
        // Funcionó sin clave_texto — recordar ejecutar la migración
        return NextResponse.json({
          ok: true,
          clave,
          expira: expira.toISOString(),
          aviso: 'Ejecutá supabase-migrations.sql en Supabase para habilitar el guardado de claves.',
        })
      }
      return NextResponse.json({ error: sbError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, clave, expira: expira.toISOString() })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    console.error('[generar-clave] Excepción:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'