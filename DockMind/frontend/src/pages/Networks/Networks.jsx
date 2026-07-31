import React, { useState, useEffect } from 'react'
import Sidebar from '../../components/common/Sidebar'
import api from '../../services/api'
import { Network, Trash2, Search, RefreshCw, GitFork } from 'lucide-react'

const Networks = () => {
  const [networks, setNetworks] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchNetworks = async () => {
    setLoading(true)
    try {
      const res = await api.get('/docker/networks')
      setNetworks(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNetworks()
  }, [])

  const filteredNetworks = networks.filter(net =>
    net.name.toLowerCase().includes(search.toLowerCase()) || 
    net.driver.toLowerCase().includes(search.toLowerCase()) ||
    net.scope.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-extrabold text-text tracking-tight">Networks</h2>
            <p className="text-muted text-sm mt-1">Manage virtual networks and integrations.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchNetworks}
              className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-text bg-surface border border-border rounded-xl hover:border-primary transition-all duration-200"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-xs font-semibold text-muted bg-surface border border-border px-3.5 py-2 rounded-xl">
            Total Networks: {networks.length}
          </div>
          
          <div className="relative w-80 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search networks..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-text placeholder-muted/60 focus:outline-none focus:border-primary transition-all duration-200"
            />
          </div>
        </div>

        {/* Networks List/Table */}
        <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-muted">Loading Docker networks...</div>
          ) : filteredNetworks.length === 0 ? (
            <div className="p-8 text-center text-muted">No networks found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border text-xs text-muted uppercase tracking-wider bg-bg/20">
                    <th className="p-4 font-semibold">Network Name</th>
                    <th className="p-4 font-semibold">Network ID</th>
                    <th className="p-4 font-semibold">Driver</th>
                    <th className="p-4 font-semibold">Scope</th>
                    <th className="p-4 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredNetworks.map(net => (
                    <tr key={net.id} className="hover:bg-bg/10 transition-colors">
                      <td className="p-4 font-semibold text-text flex items-center gap-3">
                        <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 rounded-lg shrink-0">
                          <GitFork className="w-4 h-4" />
                        </div>
                        <span className="truncate max-w-xs">{net.name}</span>
                      </td>
                      <td className="p-4 font-mono text-xs text-muted">{net.id}</td>
                      <td className="p-4 font-mono text-xs text-text">{net.driver}</td>
                      <td className="p-4">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                          net.scope === 'swarm' 
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}>
                          {net.scope}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center">
                          {['bridge', 'host', 'none'].includes(net.name.toLowerCase()) ? (
                            <span className="text-xs text-muted italic">System</span>
                          ) : (
                            <button
                              disabled
                              className="p-2 text-muted opacity-40 cursor-not-allowed rounded-lg"
                              title="Removing networks isn't supported yet"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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

export default Networks
