import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import AppShell from '../../components/common/ui/AppShell'
import PageHeader from '../../components/common/ui/PageHeader'
import Card from '../../components/common/ui/Card'
import Button from '../../components/common/ui/Button'
import { SkeletonRows } from '../../components/common/ui/Skeleton'
import api from '../../services/api'
import { Trash2, Search, RefreshCw, Database } from 'lucide-react'
import { formatDate } from '../../utils/formatters'

const Volumes = () => {
  const [volumes, setVolumes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')

  const fetchVolumes = async () => {
    setLoading(true)
    try {
      const res = await api.get('/docker/volumes')
      setVolumes(res.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchVolumes() }, [])

  const filteredVolumes = volumes.filter((vol) =>
    vol.name.toLowerCase().includes(search.toLowerCase()) ||
    vol.driver.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AppShell>
      <PageHeader
        title="Volumes"
        subtitle="Manage persistent Docker storage volumes."
        actions={
          <Button variant="glass" size="sm" shape="rounded" onClick={fetchVolumes}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
        <div
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-muted"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-glass-border)' }}
        >
          <Database className="w-3.5 h-3.5" />
          {volumes.length} volume{volumes.length !== 1 ? 's' : ''}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
          <input
            type="text"
            placeholder="Search volumes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base pl-10 py-2.5 text-xs"
            style={{ borderRadius: '12px' }}
          />
        </div>
      </div>

      <Card className="overflow-hidden" animate={false}>
        {loading ? (
          <SkeletonRows rows={5} cols={5} />
        ) : filteredVolumes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-glass-border)' }}
            >
              <Database className="w-5 h-5 text-muted" />
            </div>
            <p className="text-sm text-muted">No volumes found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-glass-border)' }}>
                  {['Volume Name', 'Driver', 'Size', 'Created', 'Actions'].map((h) => (
                    <th key={h} className="px-5 py-4 text-2xs font-bold text-muted uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredVolumes.map((vol, idx) => (
                  <motion.tr
                    key={vol.name}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.04 }}
                    className="data-row group/row"
                    style={{ borderBottom: '1px solid var(--color-glass-border)' }}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: 'rgba(10,79,122,0.15)', border: '1px solid rgba(10,79,122,0.3)' }}
                        >
                          <Database className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
                        </div>
                        <span className="font-semibold text-text text-xs truncate max-w-[200px]">{vol.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-2xs text-muted">{vol.driver}</td>
                    <td className="px-5 py-4 text-xs font-medium text-text">{vol.size || '—'}</td>
                    <td className="px-5 py-4 text-2xs text-muted">{formatDate(vol.created)}</td>
                    <td className="px-5 py-4">
                      <button
                        disabled
                        title="Removing volumes isn't supported yet"
                        className="row-actions p-2 rounded-lg opacity-30 cursor-not-allowed"
                        style={{ color: 'var(--color-danger)' }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </AppShell>
  )
}

export default Volumes
