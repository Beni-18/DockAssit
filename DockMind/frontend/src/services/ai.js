import api from './api'

/**
 * AI service — natural language interpretation and chat
 */

// Parse a natural language instruction into a structured Docker intent
// (does not execute it) — { action, resource, target }
export const interpretPrompt = async (prompt) => {
  const response = await api.post('/ai/interpret', { prompt })
  return response.data
}

// General-purpose AI chat — { response }
export const chatWithAI = async (prompt) => {
  const response = await api.post('/ai/chat', { prompt })
  return response.data
}
