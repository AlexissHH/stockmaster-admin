import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { supabase } from '@/lib/supabase.server'

function generarSessionToken(password: string): string {
  return crypto
    .createHmac('sha256', process.env.LICENSE_SECRET ?? 'fallback-salt')
    .update(password)
    .digest('hex')
}

function autenticado(): boolean {
  try {
    const token = cookies().get('admin_session')?.value
    if (!token || !process.env.ADMIN_PASSWORD) return false
    const esperado = generarSessionToken(process.env.ADMIN_PASSWORD)
    // timingSafeEqual requiere que los buffers tengan el mismo largo
    const bufToken = Buffer.from(token)
    const bufEsperado = Buffer.from(esperado)
    if (bufToken.length !== bufEsperado.length) return false
    return crypto.timingSafeEqual(bufToken, bufEsperado)
  } catch {
    return false
  }
}

// GET /api/licencias — listar todas con sus terminales
export async function GET() {
  if (!autenticado()) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const { data: licencias, error } = await supabase
      .from('licencias')
      .select('*')
      .order('cliente_nombre')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const hashes = (licencias ?? [])
      .filter(l => !l.plan_id?.endsWith('_SERVIDOR'))
      .map(l => l.licencia_hash)

    let terminalesPorHash: Record<string, unknown[]> = {}

    if (hashes.length > 0) {
      const { data: terminales } = await supabase
        .from('terminales')
        .select('*')
        .in('licencia_hash', hashes)
        .order('ultima_vez', { ascending: false })

      if (terminales) {
        for (const t of terminales) {
          if (!terminalesPorHash[t.licencia_hash]) terminalesPorHash[t.licencia_hash] = []
          terminalesPorHash[t.licencia_hash].push(t)
        }
      }
    }

    const result = (licencias ?? []).map(l => ({
      ...l,
      terminales: terminalesPorHash[l.licencia_hash] ?? [],
    }))

    return NextResponse.json(result)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// PATCH /api/licencias — acciones
export async function PATCH(req: NextRequest) {
  if (!autenticado()) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const { id, accion, plan_id } = await req.json()
    if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

    let update: Record<string, unknown> = {}

    if (accion === 'renovar') {
      const { data } = await supabase.from('licencias').select('pagado_hasta').eq('id', id).single()
      const base = data?.pagado_hasta
        ? new Date(Math.max(Date.now(), new Date(data.pagado_hasta).getTime()))
        : new Date()
      base.setDate(base.getDate() + 30)
      update = { pagado_hasta: base.toISOString(), activa: true }
    } else if (accion === 'bloquear') {
      update = { activa: false }
    } else if (accion === 'desbloquear') {
      update = { activa: true }
    } else if (accion === 'cambiar_plan' && plan_id) {
      update = { plan_id, edition: plan_id.endsWith('_SERVIDOR') ? 'SERVIDOR' : 'LOCAL' }
    } else {
      return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
    }

    const { error } = await supabase.from('licencias').update(update).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST /api/licencias — crear nueva
export async function POST(req: NextRequest) {
  if (!autenticado()) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const { licencia_hash, cliente_nombre, plan_id, pagado_hasta } = await req.json()

    const { error } = await supabase.from('licencias').insert({
      licencia_hash,
      cliente_nombre,
      plan_id,
      pagado_hasta,
      activa: true,
      edition: plan_id?.endsWith('_SERVIDOR') ? 'SERVIDOR' : 'LOCAL',
      terminales_activas: 0,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// DELETE /api/licencias — eliminar cliente
export async function DELETE(req: NextRequest) {
  if (!autenticado()) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

    const { data: lic } = await supabase.from('licencias').select('licencia_hash').eq('id', id).single()
    if (lic?.licencia_hash) {
      await supabase.from('terminales').delete().eq('licencia_hash', lic.licencia_hash)
    }

    const { error } = await supabase.from('licencias').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}