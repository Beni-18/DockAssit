import api from './api'

/**
 * AI service — status and configuration for the configured Ollama provider.
 */

// Real, live reachability status for the configured Ollama host — never hardcoded
export const getAiHealth = async () => {
  const response = await api.get('/ai/health')
  return response.data
}
