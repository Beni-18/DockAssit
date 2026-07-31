/**
 * Application-wide constants
 */

export const APP_NAME = 'DockMind'
export const API_BASE_URL = '/api/v1'

// Docker container states
export const CONTAINER_STATUS = {
  RUNNING: 'running',
  EXITED: 'exited',
  PAUSED: 'paused',
  RESTARTING: 'restarting',
  CREATED: 'created',
  DEAD: 'dead',
}

// Supported Docker actions
export const DOCKER_ACTIONS = {
  START: 'start',
  STOP: 'stop',
  RESTART: 'restart',
  REMOVE: 'remove',
  PAUSE: 'pause',
  UNPAUSE: 'unpause',
  LOGS: 'logs',
}

// Polling intervals (ms)
export const POLL_INTERVALS = {
  CONTAINERS: 10000,  // 10 seconds
  METRICS: 5000,      // 5 seconds
  LOGS: 3000,         // 3 seconds
}

// Route paths
export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/',
  HISTORY: '/history',
  FREQUENT_COMMANDS: '/frequent-commands',
  SETTINGS: '/settings',
}
