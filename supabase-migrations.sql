-- =============================================================================
-- StockMaster Admin — Migraciones delta (sobre schema existente)
-- Proyecto: fxguwdkamgxqtrnsqcbh
--
-- Aplicar en el SQL Editor de Supabase:
--   Dashboard → SQL Editor → New query → pegar todo → Run
--
-- Es seguro ejecutarlo varias veces (usa IF NOT EXISTS / OR REPLACE).
-- Tu schema original ya tiene las tablas, RLS y las funciones base.
-- Este archivo solo agrega/corrige lo que faltaba.
-- =============================================================================


-- ── 1. Columna clave_texto ────────────────────────────────────────────────────
-- Guarda la clave SM-XXXXX en texto plano para poder mostrarla en el panel
-- si el cliente la pierde. Solo el service key (API route) puede escribirla.
alter table licencias add column if not exists clave_texto text;


-- ── 2. Corregir default de ultima_vez ─────────────────────────────────────────
-- El schema original tenía "default now()" en ultima_vez, lo que provocaba que
-- al crear una licencia nueva la columna mostrara la fecha de creación (= "Hoy")
-- aunque el cliente nunca hubiese entrado.
-- Ahora por defecto es NULL → en el panel se muestra "Nunca" hasta el primer uso.
alter table licencias alter column ultima_vez drop default;
alter table licencias alter column ultima_vez set default null;


-- ── 3. Reemplazar función ping_licencia ───────────────────────────────────────
-- Idéntica a la original — se incluye para reponer el GRANT si fue revocado.
create or replace function ping_licencia(
  p_hash       text,
  p_version    text,
  p_terminales int default 0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update licencias
  set
    ultima_vez         = now(),
    version_app        = p_version,
    cantidad_aperturas = cantidad_aperturas + 1,
    terminales_activas = p_terminales
  where licencia_hash = p_hash;
end;
$$;

grant execute on function ping_licencia(text, text, int) to anon;


-- ── 4. Reemplazar función registrar_terminal ──────────────────────────────────
-- ON CONFLICT corregido: usa (licencia_hash, terminal_id) para coincidir con
-- el UNIQUE del schema → unique(licencia_hash, terminal_id)
create or replace function registrar_terminal(
  p_hash        text,
  p_terminal_id text,
  p_nombre_pc   text,
  p_version     text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into terminales (licencia_hash, terminal_id, nombre_pc, version_app, ultima_vez)
  values (p_hash, p_terminal_id, p_nombre_pc, p_version, now())
  on conflict (licencia_hash, terminal_id)
  do update set
    nombre_pc   = excluded.nombre_pc,
    version_app = excluded.version_app,
    ultima_vez  = now();
end;
$$;

grant execute on function registrar_terminal(text, text, text, text) to anon;
