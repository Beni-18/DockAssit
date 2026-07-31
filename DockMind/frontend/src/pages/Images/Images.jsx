import React, { useState, useEffect } from 'react'
import Sidebar from '../../components/common/Sidebar'
import api from '../../services/api'
import { Disc, Trash2, Search, RefreshCw, Layers } from 'lucide-react'
import { formatBytes, formatDate } from '../../utils/formatters'

const Images = () => {
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchImages = async () => {
    setLoading(true)
    try {
      const res = await api.get('/docker/images')
      setImages(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchImages()
  }, [])

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this image?')) {
      try {
        await api.post('/docker/execute', { action: 'remove_image', target: id })
        setImages(images.filter(img => img.id !== id))
      } catch (e) {
        alert(e.response?.data?.detail || 'Failed to remove image')
      }
    }
  }

  const filteredImages = images.filter(img => {
    const tagsStr = img.tags ? img.tags.join(' ') : ''
    return tagsStr.toLowerCase().includes(search.toLowerCase()) || img.id.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-extrabold text-text tracking-tight">Images</h2>
            <p className="text-muted text-sm mt-1">Manage and inspect your Docker images.</p>
          </div>
          <button 
            onClick={fetchImages}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-text bg-surface border border-border rounded-xl hover:border-primary transition-all duration-200"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-xs font-semibold text-muted bg-surface border border-border px-3.5 py-2 rounded-xl">
            Total Images: {images.length}
          </div>
          
          <div className="relative w-80 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search images..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-text placeholder-muted/60 focus:outline-none focus:border-primary transition-all duration-200"
            />
          </div>
        </div>

        {/* Images Grid/Table */}
        <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-muted">Loading Docker images...</div>
          ) : filteredImages.length === 0 ? (
            <div className="p-8 text-center text-muted">No images found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border text-xs text-muted uppercase tracking-wider bg-bg/20">
                    <th className="p-4 font-semibold">Image Tag</th>
                    <th className="p-4 font-semibold">Image ID</th>
                    <th className="p-4 font-semibold">Virtual Size</th>
                    <th className="p-4 font-semibold">Created</th>
                    <th className="p-4 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredImages.map(img => {
                    const tag = img.tags && img.tags.length > 0 ? img.tags[0] : '<none>'
                    return (
                      <tr key={img.id} className="hover:bg-bg/10 transition-colors">
                        <td className="p-4 font-semibold text-text flex items-center gap-3">
                          <div className="p-2 bg-primary/10 border border-primary/20 text-primary rounded-lg shrink-0">
                            <Layers className="w-4 h-4" />
                          </div>
                          <span className="truncate max-w-xs">{tag}</span>
                        </td>
                        <td className="p-4 font-mono text-xs text-muted">{img.id}</td>
                        <td className="p-4 font-medium text-text">{formatBytes(img.size)}</td>
                        <td className="p-4 text-muted text-xs">{formatDate(img.created)}</td>
                        <td className="p-4">
                          <div className="flex items-center justify-center">
                            <button
                              onClick={() => handleDelete(img.id)}
                              className="p-2 text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-lg transition-all"
                              title="Delete Image"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default Images
