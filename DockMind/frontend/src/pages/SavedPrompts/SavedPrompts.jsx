import React, { useEffect, useState } from 'react'
import Sidebar from '../../components/common/Sidebar'
import api from '../../services/api'

const SavedPrompts = () => {
  const [prompts, setPrompts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/prompts').then((res) => {
      setPrompts(res.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleDelete = async (id) => {
    await api.delete(`/prompts/${id}`)
    setPrompts(prompts.filter((p) => p.id !== id))
  }

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Saved Prompts</h2>
          <p className="text-muted text-sm mt-1">Reusable AI prompt templates</p>
        </div>

        {loading ? (
          <p className="text-muted text-sm">Loading prompts...</p>
        ) : prompts.length === 0 ? (
          <p className="text-muted text-sm">No saved prompts yet. Save one from the Dashboard!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {prompts.map((p) => (
              <div key={p.id} className="bg-surface border border-border rounded-xl p-5">
                <h4 className="font-medium mb-2">{p.title}</h4>
                <p className="text-sm text-muted mb-4">{p.content}</p>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="text-xs text-danger hover:text-red-400 transition-colors"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default SavedPrompts
