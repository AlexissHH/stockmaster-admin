// lib/supabase.server.ts
// Server-only — NUNCA importar desde componentes 'use client'
// Usa SUPABASE_SERVICE_KEY (sin NEXT_PUBLIC_) — nunca llega al navegador.

import { createClient } from '@supabase/supabase-js'

// No usamos throws a nivel de módulo para evitar 500 con body vacío.
// Los errores se capturan dentro de cada route.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_KEY ?? '',
  { auth: { persistSession: false } }
)
