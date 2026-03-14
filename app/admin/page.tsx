'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  RefreshCw, Plus, LogOut, Copy, Check, X,
  CheckCircle2, AlertTriangle, Clock, Ban,
  ChevronDown, ChevronUp, Loader2, Users, Activity,
  TrendingUp, Shield, Monitor, Cloud, Wifi, WifiOff,
  Server, Database, Trash2,
} from 'lucide-react'
import {
  Licencia, Terminal, PLAN_LABELS, PLANES,
  diasRestantes, estadoLicencia, getEdicion,
  getLimiteTerminales, getTotalPCsLabel,
} from '@/lib/supabase'

// ── Tipos extendidos ───────────────────────────────────────────────────────────

interface LicenciaConTerminales extends Licencia {
  terminales: Terminal[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function Badge({ estado }: { estado: ReturnType<typeof estadoLicencia> }) {
  const config = {
    activa:       { cls: 'badge-green',  icon: <CheckCircle2 size={10} />, label: 'Activa' },
    'por-vencer': { cls: 'badge-yellow', icon: <AlertTriangle size={10} />, label: 'Por vencer' },
    vencida:      { cls: 'badge-red',    icon: <X size={10} />, label: 'Vencida' },
    bloqueada:    { cls: 'badge-gray',   icon: <Ban size={10} />, label: 'Bloqueada' },
  }[estado]
  return <span className={`badge ${config.cls}`}>{config.icon}{config.label}</span>
}

function EdicionBadge({ planId }: { planId: string }) {
  const esServidor = getEdicion(planId) === 'SERVIDOR'
  return (
    <span className={`badge ${esServidor ? 'badge-blue' : 'badge-gray'}`}
      style={{ fontSize: 10, gap: 3 }}>
      {esServidor ? <Cloud size={9} /> : <Monitor size={9} />}
      {esServidor ? 'Servidor' : 'Local'}
    </span>
  )
}

function PCsIndicator({ licencia }: { licencia: LicenciaConTerminales }) {
  const edicion = getEdicion(licencia.plan_id)
  if (edicion === 'SERVIDOR') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text2)' }}>
        <Cloud size={11} style={{ color: 'var(--blue, #60a5fa)' }} />
        <span>Nube</span>
      </div>
    )
  }
  const limite = getLimiteTerminales(licencia.plan_id) ?? 0
  const totalPCs = limite + 1 // +1 for PC principal
  const activas = Math.min((licencia.terminales_activas ?? 0) + 1, totalPCs) // +1 for principal
  const porcentaje = totalPCs > 1 ? (activas / totalPCs) * 100 : 100
  const color = activas >= totalPCs ? 'var(--yellow)' : 'var(--green)'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <Monitor size={11} style={{ color }} />
      <span style={{ fontSize: 12, color, fontWeight: 600 }}>{activas}/{totalPCs}</span>
      <div style={{
        width: 32, height: 4, borderRadius: 2,
        background: 'var(--border)', overflow: 'hidden',
      }}>
        <div style={{
          width: `${porcentaje}%`, height: '100%',
          background: color, borderRadius: 2,
          transition: 'width 0.3s',
        }} />
      </div>
    </div>
  )
}

function formatFechaHora(fecha: string): string {
  const d = new Date(fecha)
  const hoy = new Date()
  const ayer = new Date(hoy); ayer.setDate(hoy.getDate() - 1)
  const hora = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  const mismaFecha = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  if (mismaFecha(d, hoy)) return `Hoy ${hora}`
  if (mismaFecha(d, ayer)) return `Ayer ${hora}`
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ` ${hora}`
}

function UltimaVez({ fecha }: { fecha: string | null }) {
  if (!fecha) return <span style={{ color: 'var(--text3)' }}>Nunca</span>
  const dias = Math.floor((Date.now() - new Date(fecha).getTime()) / 86400000)
  const texto = formatFechaHora(fecha)
  if (dias === 0) return <span style={{ color: 'var(--green)' }} title={fecha}>{texto}</span>
  if (dias <= 1) return <span style={{ color: 'var(--text2)' }} title={fecha}>{texto}</span>
  if (dias <= 7) return <span style={{ color: 'var(--text2)' }} title={fecha}>{texto}</span>
  return <span style={{ color: 'var(--text3)' }} title={fecha}>{texto}</span>
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button className="btn btn-ghost btn-icon btn-sm"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      title="Copiar">
      {copied ? <Check size={13} style={{ color: 'var(--green)' }} /> : <Copy size={13} />}
    </button>
  )
}

// ── Terminales expandibles ─────────────────────────────────────────────────────

function ListaTerminales({ licencia }: { licencia: LicenciaConTerminales }) {
  const [abierto, setAbierto] = useState(false)
  const edicion = getEdicion(licencia.plan_id)

  if (edicion === 'SERVIDOR') {
    return (
      <div style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}>
        <Database size={10} /> Todas se conectan a la nube directamente
      </div>
    )
  }

  const terminales = licencia.terminales ?? []
  const limite = getLimiteTerminales(licencia.plan_id) ?? 0

  if (limite === 0) {
    return <div style={{ fontSize: 12, color: 'var(--text3)' }}>Solo PC principal (plan sin terminales)</div>
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 12, color: 'var(--text2)', background: 'none',
          border: 'none', cursor: 'pointer', padding: 0,
        }}>
        {abierto ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        <Monitor size={11} />
        PC Principal + {terminales.length}/{limite} terminales activas
      </button>

      {abierto && (
        <div style={{
          marginTop: 8, borderLeft: '2px solid var(--border)',
          paddingLeft: 12, display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          {/* PC Principal */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--green)', flexShrink: 0,
            }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>PC Principal</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                <UltimaVez fecha={licencia.ultima_vez} />
                {licencia.version_app && ` · v${licencia.version_app}`}
              </div>
            </div>
            <span className="badge badge-green" style={{ fontSize: 10, marginLeft: 'auto' }}>Principal</span>
          </div>

          {/* Terminales */}
          {terminales.length === 0 ? (
            <div style={{ fontSize: 11, color: 'var(--text3)', paddingLeft: 14 }}>
              Sin terminales conectadas todavía
            </div>
          ) : (
            terminales.map((t) => {
              const diasInactiva = t.ultima_vez
                ? Math.floor((Date.now() - new Date(t.ultima_vez).getTime()) / 86400000)
                : 999
              const activa = diasInactiva <= 3
              return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: activa ? 'var(--blue, #60a5fa)' : 'var(--text3)',
                    flexShrink: 0,
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12 }}>{t.nombre_pc || `Terminal ${t.terminal_id.slice(0, 8)}`}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                      <UltimaVez fecha={t.ultima_vez} />
                      {t.version_app && ` · v${t.version_app}`}
                    </div>
                  </div>
                  <span className={`badge ${activa ? 'badge-blue' : 'badge-gray'}`} style={{ fontSize: 10 }}>
                    {activa ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
              )
            })
          )}

          {/* Slots disponibles */}
          {Array.from({ length: Math.max(0, limite - terminales.length) }).map((_, i) => (
            <div key={`slot-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                border: '1px dashed var(--border)', flexShrink: 0,
              }} />
              <div style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic' }}>
                Slot disponible
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Instrucciones por edición ──────────────────────────────────────────────────

function InstruccionesPostCreacion({
  planId, clave
}: { planId: string; clave: string }) {
  const esServidor = getEdicion(planId) === 'SERVIDOR'
  const limite = getLimiteTerminales(planId) ?? 0

  if (esServidor) {
    return (
      <div style={{
        background: 'var(--bg)', borderRadius: 8,
        border: '1px solid var(--border)', padding: '12px 14px',
        fontSize: 13,
      }}>
        <div style={{ fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Cloud size={14} style={{ color: 'var(--blue, #60a5fa)' }} />
          Instrucciones — Edición Servidor
        </div>
        <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--text2)' }}>
          <li>Configurar un Droplet en DigitalOcean (São Paulo, Ubuntu 24.04, $6/mes)</li>
          <li>Instalar PostgreSQL y crear la base de datos para este cliente</li>
          <li>Enviarle al cliente el instalador .exe + la clave SM de arriba + la URL de PostgreSQL</li>
          <li>El cliente instala el .exe en cada PC que quiera conectar</li>
          <li>En cada PC: ingresa la clave SM y la URL del servidor</li>
          <li>Todas las PCs quedan conectadas a la misma base de datos en la nube</li>
        </ol>
      </div>
    )
  }

  return (
    <div style={{
      background: 'var(--bg)', borderRadius: 8,
      border: '1px solid var(--border)', padding: '12px 14px',
      fontSize: 13,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Monitor size={14} />
        Instrucciones — Edición Local
      </div>
      <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--text2)' }}>
        <li>Enviarle el instalador .exe al cliente por WhatsApp</li>
        <li>Enviar la clave SM de arriba — <strong>solo para la PC principal</strong></li>
        <li>El cliente instala en la PC principal, ingresa la clave y elige "PC Principal"</li>
        {limite > 0 && (
          <li>
            Para las otras PCs ({limite} terminal{limite > 1 ? 'es' : ''} máx.): instalar el .exe,
            elegir "Terminal" y poner la IP de la PC principal. <strong>No necesitan clave.</strong>
          </li>
        )}
        {limite === 0 && (
          <li style={{ color: 'var(--text3)' }}>
            Este plan solo incluye la PC principal. Para agregar terminales, el cliente debe actualizar de plan.
          </li>
        )}
      </ol>
    </div>
  )
}

// ── Modal Nuevo Cliente ────────────────────────────────────────────────────────

function ModalNuevoCliente({ onClose, onCreado }: { onClose: () => void; onCreado: () => void }) {
  const [form, setForm] = useState({
    clienteNombre: '', planId: 'COMERCIO_LOCAL', clienteCuit: '', dias: '35',
  })
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<{ clave: string; expira: string } | null>(null)
  const [error, setError] = useState('')

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const esServidor = getEdicion(form.planId) === 'SERVIDOR'

  async function handleCrear() {
    if (!form.clienteNombre.trim()) { setError('El nombre es obligatorio.'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/generar-clave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!data.ok) { setError(data.error || 'Error al generar'); return }
      setResultado({ clave: data.clave, expira: data.expira })
      onCreado()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Nuevo cliente</h3>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={15} /></button>
        </div>

        {!resultado ? (
          <>
            <div className="modal-body">
              {error && (
                <div style={{
                  background: 'var(--red-bg)', border: '1px solid #3a1010',
                  borderRadius: 8, padding: '10px 14px', color: 'var(--red)', fontSize: 13,
                }}>
                  {error}
                </div>
              )}
              <div>
                <label>Nombre del cliente o empresa *</label>
                <input placeholder="Ej: Ferretería Don Pedro" value={form.clienteNombre}
                  onChange={e => set('clienteNombre', e.target.value)} autoFocus />
              </div>
              <div>
                <label>CUIT (opcional)</label>
                <input placeholder="20304050607" value={form.clienteCuit}
                  onChange={e => set('clienteCuit', e.target.value)} className="mono" />
              </div>
              <div>
                <label>Plan</label>
                <select value={form.planId} onChange={e => set('planId', e.target.value)}>
                  <optgroup label="— Edición Local (SQLite en el local)">
                    {PLANES.filter(p => p.endsWith('_LOCAL')).map(p => (
                      <option key={p} value={p}>{PLAN_LABELS[p]} · {getTotalPCsLabel(p)}</option>
                    ))}
                  </optgroup>
                  <optgroup label="— Edición Servidor (PostgreSQL en la nube)">
                    {PLANES.filter(p => p.endsWith('_SERVIDOR')).map(p => (
                      <option key={p} value={p}>{PLAN_LABELS[p]}</option>
                    ))}
                  </optgroup>
                </select>
                {/* Info chip */}
                <div style={{
                  marginTop: 6, padding: '6px 10px', borderRadius: 6,
                  background: esServidor ? 'rgba(96,165,250,0.08)' : 'var(--bg)',
                  border: `1px solid ${esServidor ? 'rgba(96,165,250,0.2)' : 'var(--border)'}`,
                  fontSize: 12, color: 'var(--text2)',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  {esServidor
                    ? <><Cloud size={12} style={{ color: 'var(--blue, #60a5fa)' }} /> Datos en DigitalOcean · PostgreSQL · Acceso desde cualquier lugar</>
                    : <><Monitor size={12} /> Datos en la PC del local · SQLite · {getTotalPCsLabel(form.planId)} conectadas por WiFi</>
                  }
                </div>
              </div>
              <div>
                <label>Días de licencia</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {[35, 65, 185, 370].map(d => (
                    <button key={d} type="button"
                      className={`btn ${form.dias === String(d) ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ justifyContent: 'center' }}
                      onClick={() => set('dias', String(d))}>
                      {d === 35 ? '1 mes' : d === 65 ? '2 meses' : d === 185 ? '6 meses' : '1 año'}
                    </button>
                  ))}
                </div>
                <p style={{ color: 'var(--text3)', fontSize: 11, marginTop: 6 }}>
                  +5 días de margen incluidos
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
              <button type="button" className="btn btn-primary" onClick={handleCrear} disabled={loading}>
                {loading ? <><Loader2 size={14} className="spin" /> Generando...</> : <><Plus size={14} /> Generar clave</>}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="modal-body">
              <div style={{ textAlign: 'center', paddingTop: 8 }}>
                <CheckCircle2 size={40} style={{ color: 'var(--green)' }} />
                <p style={{ fontWeight: 700, marginTop: 10, fontSize: 15 }}>Cliente creado correctamente</p>
                <p style={{ color: 'var(--text2)', fontSize: 13 }}>
                  Licencia válida hasta el {new Date(resultado.expira).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div>
                <label>Clave de activación — solo para la PC principal</label>
                <div className="clave-box">{resultado.clave}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => navigator.clipboard.writeText(resultado.clave)}>
                  <Copy size={14} /> Copiar clave
                </button>
                <button type="button" className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => {
                    const msg = encodeURIComponent(
                      `Hola! Tu clave de activación de StockMaster es:\n\n${resultado.clave}\n\n` +
                      (getEdicion(form.planId) === 'LOCAL'
                        ? `Ingresala en la PC principal la primera vez que abras el sistema.`
                        : `Ingresala junto con la URL del servidor cuando abras el sistema.`)
                    )
                    window.open(`https://wa.me/?text=${msg}`)
                  }}>
                  WhatsApp
                </button>
              </div>
              <InstruccionesPostCreacion planId={form.planId} clave={resultado.clave} />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-primary" onClick={onClose}>Listo</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Modal Acciones ─────────────────────────────────────────────────────────────

function ModalAcciones({
  licencia, onClose, onActualizado,
}: { licencia: LicenciaConTerminales; onClose: () => void; onActualizado: () => void }) {
  const [loading, setLoading] = useState<string | null>(null)
  const [nuevoPlan, setNuevoPlan] = useState(licencia.plan_id)
  const [confEliminar, setConfEliminar] = useState(false)
  const estado = estadoLicencia(licencia)
  const dias = diasRestantes(licencia.pagado_hasta)
  const edicion = getEdicion(licencia.plan_id)
  const limiteTerminales = getLimiteTerminales(licencia.plan_id)

  async function accion(tipo: string, extra?: object) {
    setLoading(tipo)
    try {
      await fetch('/api/licencias', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: licencia.id, accion: tipo, ...extra }),
      })
      onActualizado()
      if (tipo !== 'cambiar_plan') onClose()
    } finally {
      setLoading(null)
    }
  }

  async function eliminarCliente() {
    setLoading('eliminar')
    try {
      await fetch('/api/licencias', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: licencia.id }),
      })
      onActualizado()
      onClose()
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>{licencia.cliente_nombre}</h3>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <Badge estado={estado} />
              <EdicionBadge planId={licencia.plan_id} />
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>{PLAN_LABELS[licencia.plan_id] ?? licencia.plan_id}</span>
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={15} /></button>
        </div>

        <div className="modal-body">
          {/* Info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Vence', value: new Date(licencia.pagado_hasta).toLocaleDateString('es-AR') },
              { label: 'Días restantes', value: dias > 0 ? `${dias} días` : `Vencida hace ${Math.abs(dias)} días` },
              { label: 'Última apertura', value: licencia.ultima_vez ? formatFechaHora(licencia.ultima_vez) : 'Nunca' },
              { label: 'Aperturas totales', value: licencia.cantidad_aperturas || 0 },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                <div style={{ fontSize: 14, marginTop: 2, fontWeight: 600 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* PCs conectadas */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {edicion === 'SERVIDOR' ? 'Conexión al servidor' : 'PCs conectadas'}
            </p>
            {edicion === 'LOCAL' && limiteTerminales !== null && (
              <div style={{ marginBottom: 10, padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>
                    {(licencia.terminales_activas ?? 0) + 1} de {limiteTerminales + 1} PCs conectadas
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>{getTotalPCsLabel(licencia.plan_id)}</span>
                </div>
                <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 2,
                    width: `${Math.min(100, (((licencia.terminales_activas ?? 0) + 1) / (limiteTerminales + 1)) * 100)}%`,
                    background: (licencia.terminales_activas ?? 0) >= limiteTerminales ? 'var(--yellow)' : 'var(--green)',
                    transition: 'width 0.3s',
                  }} />
                </div>
              </div>
            )}
            <ListaTerminales licencia={licencia} />
          </div>

          {/* Renovar */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Renovar</p>
            <button type="button" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => accion('renovar')} disabled={!!loading}>
              {loading === 'renovar'
                ? <><Loader2 size={14} className="spin" /> Renovando...</>
                : <><RefreshCw size={14} /> Renovar 30 días (recibí el pago)</>}
            </button>
            <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
              Extiende desde la fecha de vencimiento actual.
            </p>
          </div>

          {/* Cambiar plan */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Cambiar plan</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={nuevoPlan} onChange={e => setNuevoPlan(e.target.value)} style={{ flex: 1 }}>
                <optgroup label="Edición Local">
                  {PLANES.filter(p => p.endsWith('_LOCAL')).map(p => (
                    <option key={p} value={p}>{PLAN_LABELS[p]} · {getTotalPCsLabel(p)}</option>
                  ))}
                </optgroup>
                <optgroup label="Edición Servidor">
                  {PLANES.filter(p => p.endsWith('_SERVIDOR')).map(p => (
                    <option key={p} value={p}>{PLAN_LABELS[p]}</option>
                  ))}
                </optgroup>
              </select>
              <button type="button" className="btn btn-ghost"
                onClick={() => accion('cambiar_plan', { plan_id: nuevoPlan })}
                disabled={!!loading || nuevoPlan === licencia.plan_id}>
                {loading === 'cambiar_plan' ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
              </button>
            </div>
          </div>

          {/* Clave de activación */}
          {licencia.clave_texto && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Clave de activación</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="clave-box" style={{ flex: 1, margin: 0, fontSize: 13 }}>{licencia.clave_texto}</div>
                <CopyButton text={licencia.clave_texto} />
                <button type="button" className="btn btn-ghost btn-sm"
                  onClick={() => {
                    const msg = encodeURIComponent(
                      `Hola! Tu clave de activación de StockMaster es:\n\n${licencia.clave_texto}\n\n` +
                      (getEdicion(licencia.plan_id) === 'LOCAL'
                        ? `Ingresala en la PC principal la primera vez que abras el sistema.`
                        : `Ingresala junto con la URL del servidor cuando abras el sistema.`)
                    )
                    window.open(`https://wa.me/?text=${msg}`)
                  }}
                  title="Enviar por WhatsApp">
                  WhatsApp
                </button>
              </div>
            </div>
          )}

          {/* Bloquear */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {licencia.activa ? 'Bloquear acceso' : 'Desbloquear acceso'}
            </p>
            {licencia.activa ? (
              <button type="button" className="btn btn-danger" style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => accion('bloquear')} disabled={!!loading}>
                {loading === 'bloquear' ? <><Loader2 size={14} className="spin" /> Bloqueando...</> : <><Ban size={14} /> Bloquear (no puede entrar)</>}
              </button>
            ) : (
              <button type="button" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => accion('desbloquear')} disabled={!!loading}>
                {loading === 'desbloquear' ? <><Loader2 size={14} className="spin" /> Desbloqueando...</> : <><CheckCircle2 size={14} /> Desbloquear</>}
              </button>
            )}
            <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
              Bloquear impide que el cliente abra el sistema hasta que lo desbloquees.
            </p>
          </div>

          {/* Eliminar cliente */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Eliminar cliente</p>
            {!confEliminar ? (
              <button type="button" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', color: 'var(--red)' }}
                onClick={() => setConfEliminar(true)} disabled={!!loading}>
                <Trash2 size={14} /> Eliminar cliente del sistema
              </button>
            ) : (
              <div style={{ background: 'var(--red-bg)', border: '1px solid #3a1010', borderRadius: 8, padding: '12px 14px' }}>
                <p style={{ fontSize: 13, color: 'var(--red)', fontWeight: 600, marginBottom: 6 }}>
                  ¿Eliminr a {licencia.cliente_nombre}?
                </p>
                <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>
                  Se borra la licencia y todas las terminales registradas. Los datos locales del cliente NO se borran de su PC. Si el sistema ya está instalado, mostrará &quot;licencia no encontrada&quot; en la próxima verificación.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfEliminar(false)} disabled={!!loading} style={{ flex: 1, justifyContent: 'center' }}>
                    Cancelar
                  </button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={eliminarCliente} disabled={!!loading} style={{ flex: 1, justifyContent: 'center' }}>
                    {loading === 'eliminar' ? <><Loader2 size={13} className="spin" /> Eliminando...</> : <><Trash2 size={13} /> Sí, eliminar</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter()
  const [licencias, setLicencias] = useState<LicenciaConTerminales[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<'todos' | 'activa' | 'por-vencer' | 'vencida' | 'bloqueada' | 'local' | 'servidor'>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [modalNuevo, setModalNuevo] = useState(false)
  const [seleccionada, setSeleccionada] = useState<LicenciaConTerminales | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/licencias')
      if (res.status === 401) { router.push('/'); return }
      setLicencias(await res.json())
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { cargar() }, [cargar])

  async function cerrarSesion() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/')
  }

  const stats = {
    total:      licencias.length,
    activas:    licencias.filter(l => estadoLicencia(l) === 'activa').length,
    porVencer:  licencias.filter(l => estadoLicencia(l) === 'por-vencer').length,
    vencidas:   licencias.filter(l => estadoLicencia(l) === 'vencida').length,
    bloqueadas: licencias.filter(l => estadoLicencia(l) === 'bloqueada').length,
    locales:    licencias.filter(l => getEdicion(l.plan_id) === 'LOCAL').length,
    servidores: licencias.filter(l => getEdicion(l.plan_id) === 'SERVIDOR').length,
    pcsTotal:   licencias.filter(l => getEdicion(l.plan_id) === 'LOCAL')
                  .reduce((acc, l) => acc + (l.terminales_activas ?? 0) + 1, 0),
  }

  const filtradas = licencias.filter(l => {
    if (filtro === 'local') return getEdicion(l.plan_id) === 'LOCAL'
    if (filtro === 'servidor') return getEdicion(l.plan_id) === 'SERVIDOR'
    const matchFiltro = filtro === 'todos' || estadoLicencia(l) === filtro
    const matchBusqueda = !busqueda || l.cliente_nombre.toLowerCase().includes(busqueda.toLowerCase())
    return matchFiltro && matchBusqueda
  }).filter(l => {
    if (filtro === 'local' || filtro === 'servidor') return true
    return !busqueda || l.cliente_nombre.toLowerCase().includes(busqueda.toLowerCase())
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        padding: '0 24px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--bg2)', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: 'linear-gradient(135deg, var(--green) 0%, #16a34a 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={14} color="#000" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 15 }}>StockMaster Admin</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={cargar} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'spin' : ''} /> Actualizar
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setModalNuevo(true)}>
            <Plus size={13} /> Nuevo cliente
          </button>
          <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={cerrarSesion} title="Salir">
            <LogOut size={14} />
          </button>
        </div>
      </header>

      <main style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total clientes', value: stats.total, icon: <Users size={18} />, color: 'var(--text2)' },
            { label: 'Activas', value: stats.activas, icon: <Activity size={18} />, color: 'var(--green)' },
            { label: 'Por vencer', value: stats.porVencer, icon: <Clock size={18} />, color: 'var(--yellow)' },
            { label: 'Vencidas', value: stats.vencidas, icon: <TrendingUp size={18} />, color: 'var(--red)' },
            { label: 'PCs activas (Local)', value: stats.pcsTotal, icon: <Monitor size={18} />, color: 'var(--text2)' },
            { label: 'Clientes Servidor', value: stats.servidores, icon: <Server size={18} />, color: 'var(--blue, #60a5fa)' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="stat-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ color }}>{icon}</div>
              </div>
              <div className="stat-value" style={{ color }}>{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          ))}
        </div>

        {/* Filtros + búsqueda */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <input
            placeholder="Buscar cliente..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{ maxWidth: 220, flex: '1 1 180px' }}
          />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {([
              { key: 'todos', label: `Todos (${stats.total})` },
              { key: 'activa', label: `Activas (${stats.activas})` },
              { key: 'por-vencer', label: `Por vencer (${stats.porVencer})` },
              { key: 'vencida', label: `Vencidas (${stats.vencidas})` },
              { key: 'bloqueada', label: `Bloqueadas (${stats.bloqueadas})` },
              { key: 'local', label: `Local (${stats.locales})` },
              { key: 'servidor', label: `Servidor (${stats.servidores})` },
            ] as const).map(f => (
              <button key={f.key} type="button"
                className={`btn btn-sm ${filtro === f.key ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFiltro(f.key as typeof filtro)}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabla */}
        <div className="card">
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text3)' }}>
              <Loader2 size={24} className="spin" style={{ marginBottom: 8 }} /><p style={{ fontSize: 13 }}>Cargando...</p>
            </div>
          ) : filtradas.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text3)' }}>
              <Users size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
              <p style={{ fontSize: 14 }}>No hay clientes{filtro !== 'todos' ? ' con este filtro' : ''}.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Plan / Edición</th>
                  <th>Estado</th>
                  <th>Vence</th>
                  <th>PCs conectadas</th>
                  <th>Última apertura</th>
                  <th>Usos</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map(l => {
                  const estado = estadoLicencia(l)
                  const dias = diasRestantes(l.pagado_hasta)
                  return (
                    <tr key={l.id} style={{ cursor: 'pointer' }} onClick={() => setSeleccionada(l)}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{l.cliente_nombre}</div>
                        {l.version_app && (
                          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }} className="mono">
                            v{l.version_app}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: 13, color: 'var(--text2)' }}>{PLAN_LABELS[l.plan_id] ?? l.plan_id}</div>
                        <div style={{ marginTop: 3 }}><EdicionBadge planId={l.plan_id} /></div>
                      </td>
                      <td><Badge estado={estado} /></td>
                      <td>
                        <div style={{ fontSize: 13 }}>{new Date(l.pagado_hasta).toLocaleDateString('es-AR')}</div>
                        {dias > 0 && dias <= 30 && (
                          <div style={{ fontSize: 11, color: dias <= 7 ? 'var(--red)' : 'var(--yellow)', marginTop: 2 }}>
                            {dias === 1 ? 'Vence mañana' : `${dias} días`}
                          </div>
                        )}
                        {dias <= 0 && (
                          <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 2 }}>Hace {Math.abs(dias)} días</div>
                        )}
                      </td>
                      <td><PCsIndicator licencia={l} /></td>
                      <td><UltimaVez fecha={l.ultima_vez} /></td>
                      <td style={{ color: 'var(--text2)', fontSize: 13 }}>{l.cantidad_aperturas || 0}</td>
                      <td>
                        <button type="button" className="btn btn-ghost btn-sm btn-icon"
                          onClick={e => { e.stopPropagation(); setSeleccionada(l) }}>
                          <ChevronDown size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {modalNuevo && (
        <ModalNuevoCliente onClose={() => setModalNuevo(false)} onCreado={() => cargar()} />
      )}
      {seleccionada && (
        <ModalAcciones
          licencia={seleccionada}
          onClose={() => setSeleccionada(null)}
          onActualizado={() => { cargar(); setSeleccionada(null) }}
        />
      )}
    </div>
  )
}
