import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import AppShell from '../../components/common/ui/AppShell'
import PageHeader from '../../components/common/ui/PageHeader'
import Card from '../../components/common/ui/Card'
import Button from '../../components/common/ui/Button'
import ConfirmDialog from '../../components/common/ui/ConfirmDialog'
import { SkeletonRows } from '../../components/common/ui/Skeleton'
import { useToast } from '../../components/common/ui/ToastProvider'
import api from '../../services/api'
import { removeImage } from '../../services/docker'
import { Trash2, Search, RefreshCw, Layers, Package } from 'lucide-react'
import { formatBytes, formatDate } from '../../utils/formatters'

const Images = () => {
  const [images, setImages]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [removeTarget, setRemoveTarget] = useState(null)
  const { toast } = useToast()

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

  useEffect(() => { fetchImages() }, [])

  const handleDelete = async (id) => {
    try {
      await removeImage(id)
      setImages(images.filter((img) => img.id !== id))
      toast.success('Image removed.')
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to remove image')
    }
  }

  const filteredImages = images.filter((img) => {
    const tagsStr = img.tags ? img.tags.join(' ') : ''
    return tagsStr.toLowerCase().includes(search.toLowerCase()) || img.id.toLowerCase().includes(search.toLowerCase())
  })

  const removeTargetImage = images.find((img) => img.id === removeTarget)
  const removeTargetTag = removeTargetImage?.tags?.[0] || removeTargetImage?.id?.slice(0, 19) || ''

  return (
    <AppShell>
      <PageHeader
        title="Images"
        subtitle="Manage and inspect your Docker images."
        actions={
          <Button variant="glass" size="sm" shape="rounded" onClick={fetchImages}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
        <div
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-muted"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-glass-border)' }}
        >
          <Package className="w-3.5 h-3.5" />
          {images.length} image{images.length !== 1 ? 's' : ''}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
          <input
            type="text"
            placeholder="Search images…"
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
        ) : filteredImages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-glass-border)' }}
            >
              <Layers className="w-5 h-5 text-muted" />
            </div>
            <p className="text-sm text-muted">No images found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-glass-border)' }}>
                  {['Image Tag', 'Image ID', 'Size', 'Created', 'Actions'].map((h) => (
                    <th key={h} className="px-5 py-4 text-2xs font-bold text-muted uppercase tracking-widest">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredImages.map((img, idx) => {
                  const tag = img.tags && img.tags.length > 0 ? img.tags[0] : '<none>'
                  return (
                    <motion.tr
                      key={img.id}
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
                            style={{
                              background: 'rgba(36,150,237,0.1)',
                              border: '1px solid rgba(36,150,237,0.2)',
                            }}
                          >
                            <Layers className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                          </div>
                          <span className="font-semibold text-text text-xs truncate max-w-[200px]">{tag}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-2xs text-muted">{img.id}</td>
                      <td className="px-5 py-4 text-xs font-medium text-text tabular-nums">{formatBytes(img.size)}</td>
                      <td className="px-5 py-4 text-2xs text-muted">{formatDate(img.created)}</td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => setRemoveTarget(img.id)}
                          className="row-actions p-2 rounded-lg transition-all duration-150"
                          style={{ color: 'rgba(239,68,68,0.6)' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = 'var(--color-danger)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(239,68,68,0.6)' }}
                          title="Delete Image"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title="Delete image?"
        description={removeTargetTag ? `This permanently deletes "${removeTargetTag}". This can't be undone.` : undefined}
        confirmLabel="Delete"
        onConfirm={() => removeTarget && handleDelete(removeTarget)}
      />
    </AppShell>
  )
}

export default Images
