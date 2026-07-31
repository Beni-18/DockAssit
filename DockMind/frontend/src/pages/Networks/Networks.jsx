import React, { useState, useEffect } from 'react'
import Sidebar from '../../components/common/Sidebar'
import api from '../../services/api'
import { createNetwork } from '../../services/docker'
import { Network, Trash2, Search, RefreshCw, GitFork, Plus, X } from 'lucide-react'

const Networks = () => {
  const [networks, setNetworks] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Add Network Modal States
  const [showAddModal, setShowAddModal] = useState(false)
  const [newNetName, setNewNetName] = useState('')
  const [newNetDriver, setNewNetDriver] = useState('bridge')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState(null)
  const [addSuccess, setAddSuccess] = useState(null)

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

  const handleDelete = async (id, name) => {
    if (confirm(`Are you sure you want to delete network ${name}?`)) {
      try {
        await api.post('/docker/execute', { action: 'remove_network', target: id })
        setNetworks(networks.filter(net => net.id !== id))
      } catch (e) {
        alert(e.response?.data?.detail || 'Failed to remove network')
      }
    }
  }

  const handleAddNetwork = async (e) => {
    e.preventDefault()
    if (!newNetName.trim()) {
      setAddError('Network name is required.')
      return
    }
    setAddLoading(true)
    setAddError(null)
    setAddSuccess(null)
    try {
      const res = await createNetwork(newNetName, newNetDriver)
      setAddSuccess(res.message || 'Network created successfully.')
      setTimeout(() => {
        setShowAddModal(false)
        setNewNetName('')
        setNewNetDriver('bridge')
        setAddSuccess(null)
        fetchNetworks()
      }, 2000)
    } catch (err) {
      setAddError(err.response?.data?.detail || 'Failed to create network.')
    } finally {
      setAddLoading(false)
    }
  }

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
            <button 
              onClick={() => {
                setAddError(null)
                setAddSuccess(null)
                setShowAddModal(true)
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary/95 rounded-xl shadow-lg shadow-primary/10 transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              Add Network
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
                              onClick={() => handleDelete(net.id, net.name)}
                              className="p-2 text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-lg transition-all"
                              title="Delete Network"
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

        {/* Add Network Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-surface border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="flex justify-between items-center px-6 py-4 border-b border-border bg-bg/50">
                <div>
                  <h3 className="font-bold text-text text-lg">Create New Network</h3>
                  <p className="text-xs text-muted">Create a virtual Docker network bridge or overlay.</p>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 rounded-lg border border-border hover:bg-bg text-muted hover:text-text transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleAddNetwork} className="p-6 space-y-4 text-sm">
                {addError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                    {addError}
                  </div>
                )}
                {addSuccess && (
                  <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
                    {addSuccess}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">Network Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. my_custom_net"
                    value={newNetName}
                    onChange={e => setNewNetName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-bg/50 border border-border rounded-xl text-text placeholder-muted/60 focus:outline-none focus:border-primary focus:bg-surface transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">Driver / Type *</label>
                  <select
                    value={newNetDriver}
                    onChange={e => setNewNetDriver(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-bg/50 border border-border rounded-xl text-text focus:outline-none focus:border-primary focus:bg-surface transition-all font-medium"
                  >
                    <option value="bridge">bridge (Local container communication)</option>
                    <option value="host">host (Direct host network bypass)</option>
                    <option value="overlay">overlay (Multi-host swarm routing)</option>
                    <option value="macvlan">macvlan (Direct MAC interface assignment)</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-border flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-border rounded-xl text-xs font-semibold hover:bg-bg text-muted hover:text-text transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addLoading}
                    className="px-5 py-2 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary/95 transition-all shadow-md shadow-primary/10 disabled:opacity-50"
                  >
                    {addLoading ? 'Creating...' : 'Create Network'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default Networks
