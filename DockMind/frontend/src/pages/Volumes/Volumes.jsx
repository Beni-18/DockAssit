import React, { useState, useEffect } from 'react'
import Sidebar from '../../components/common/Sidebar'
import api from '../../services/api'
import { HardDrive, Trash2, Search, RefreshCw, Database } from 'lucide-react'
import { formatDate } from '../../utils/formatters'

const Volumes = () => {
  const [volumes, setVolumes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchVolumes = async () => {
    setLoading(true)
    try {
      const res = await api.get('/docker/volumes')
      setVolumes(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVolumes()
  }, [])

  const filteredVolumes = volumes.filter(vol =>
    vol.name.toLowerCase().includes(search.toLowerCase()) || vol.driver.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-extrabold text-text tracking-tight">Volumes</h2>
            <p className="text-muted text-sm mt-1">Manage persistent storage volumes.</p>
          </div>
          <button 
            onClick={fetchVolumes}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-text bg-surface border border-border rounded-xl hover:border-primary transition-all duration-200"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-xs font-semibold text-muted bg-surface border border-border px-3.5 py-2 rounded-xl">
            Total Volumes: {volumes.length}
          </div>
          
          <div className="relative w-80 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search volumes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-text placeholder-muted/60 focus:outline-none focus:border-primary transition-all duration-200"
            />
          </div>
        </div>

        {/* Volumes List/Table */}
        <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-muted">Loading Docker volumes...</div>
          ) : filteredVolumes.length === 0 ? (
            <div className="p-8 text-center text-muted">No volumes found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border text-xs text-muted uppercase tracking-wider bg-bg/20">
                    <th className="p-4 font-semibold">Volume Name</th>
                    <th className="p-4 font-semibold">Driver</th>
                    <th className="p-4 font-semibold">Size</th>
                    <th className="p-4 font-semibold">Created</th>
                    <th className="p-4 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredVolumes.map(vol => (
                    <tr key={vol.name} className="hover:bg-bg/10 transition-colors">
                      <td className="p-4 font-semibold text-text flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 border border-purple-500/20 text-purple-600 rounded-lg shrink-0">
                          <Database className="w-4 h-4" />
                        </div>
                        <span className="truncate max-w-xs">{vol.name}</span>
                      </td>
                      <td className="p-4 font-mono text-xs text-muted">{vol.driver}</td>
                      <td className="p-4 font-medium text-text">{vol.size || '—'}</td>
                      <td className="p-4 text-muted text-xs">{formatDate(vol.created)}</td>
                      <td className="p-4">
                        <div className="flex items-center justify-center">
                          <button
                            disabled
                            className="p-2 text-muted opacity-40 cursor-not-allowed rounded-lg"
                            title="Removing volumes isn't supported yet"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default Volumes
