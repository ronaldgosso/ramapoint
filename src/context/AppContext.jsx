/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from '../lib/uuid.js'
import { historyReducer, HISTORY_ACTIONS } from '../hooks/useUndoRedo.js'
import { getAllProjects, saveProject } from '../hooks/useProjectStore.js'

// ── Action Types ─────────────────────────────────────────
export const ACTIONS = {
  // Project
  SET_PROJECT:          'SET_PROJECT',
  SET_PROJECT_NAME:     'SET_PROJECT_NAME',
  NEW_PROJECT:          'NEW_PROJECT',
  // Features
  ADD_FEATURE:          'ADD_FEATURE',
  UPDATE_FEATURE:       'UPDATE_FEATURE',
  REMOVE_FEATURE:       'REMOVE_FEATURE',
  SET_FEATURES:         'SET_FEATURES',
  // Selection
  SELECT_FEATURE:       'SELECT_FEATURE',
  DESELECT:             'DESELECT',
  // Drawing
  SET_DRAWING_MODE:     'SET_DRAWING_MODE',
  // Tile
  SET_TILE_LAYER:       'SET_TILE_LAYER',
  // Routing
  ADD_ROUTING_NODE:     'ADD_ROUTING_NODE',
  UPDATE_ROUTING_NODE:  'UPDATE_ROUTING_NODE',
  REMOVE_ROUTING_NODE:  'REMOVE_ROUTING_NODE',
  ADD_ROUTING_EDGE:     'ADD_ROUTING_EDGE',
  UPDATE_ROUTING_EDGE:  'UPDATE_ROUTING_EDGE',
  REMOVE_ROUTING_EDGE:  'REMOVE_ROUTING_EDGE',
  // Projects list
  SET_PROJECTS:         'SET_PROJECTS',
  // UI
  SET_ONLINE_STATUS:    'SET_ONLINE_STATUS',
  SET_CACHED_TILES:     'SET_CACHED_TILES',
  SET_SAVE_STATE:       'SET_SAVE_STATE',
  TOGGLE_SIDEBAR:       'TOGGLE_SIDEBAR',
  SHOW_TOAST:           'SHOW_TOAST',
  HIDE_TOAST:           'HIDE_TOAST',
  // Modal
  OPEN_MODAL:           'OPEN_MODAL',
  CLOSE_MODAL:          'CLOSE_MODAL',
  // History
  UNDO:                 HISTORY_ACTIONS.UNDO,
  REDO:                 HISTORY_ACTIONS.REDO,
  PUSH_HISTORY:         HISTORY_ACTIONS.PUSH,
}

// ── Default new project ──────────────────────────────────
function newProjectTemplate(name = 'Untitled Campus', description = '') {
  return {
    id: uuidv4(),
    name,
    description,
    center: [40.7128, -74.006],
    zoom: 16,
    features: [],
    routingNodes: [],
    routingEdges: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// ── Initial State ────────────────────────────────────────
const initialState = {
  project: newProjectTemplate(),
  projects: [],
  selectedFeatureId: null,
  selectedNodeId: null,
  selectedEdgeId: null,
  activeTileLayer: localStorage.getItem('ramapoint_tile') || localStorage.getItem('campass_tile') || 'carto',
  drawingMode: null,
  onlineStatus: navigator.onLine,
  cachedTileCount: 0,
  activeModal: null,   // 'export' | 'project_manager' | 'new_project'
  sidebarOpen: false,
  saveState: 'saved',   // 'saved' | 'unsaved' | 'saving' | 'error'
  toast: { message: null, type: 'info', visible: false },
  history: [{ project: newProjectTemplate() }],
  historyIndex: 0,
}

// ── Reducer ──────────────────────────────────────────────
function appReducer(state, action) {
  switch (action.type) {
    // ── Project ───────────────────────────────────────────
    case ACTIONS.SET_PROJECT:
      return {
        ...state,
        project: action.project,
        selectedFeatureId: null,
        selectedNodeId: null,
        selectedEdgeId: null,
        saveState: 'saved',
        history: [{ project: action.project }],
        historyIndex: 0
      }

    case ACTIONS.SET_PROJECT_NAME: {
      const nextProject = { ...state.project, name: action.name }
      const histResult = historyReducer(
        { history: state.history, historyIndex: state.historyIndex },
        { type: HISTORY_ACTIONS.PUSH, snapshot: { project: nextProject } }
      )
      return {
        ...state,
        ...histResult,
        project: nextProject,
        saveState: 'unsaved',
      }
    }

    case ACTIONS.NEW_PROJECT: {
      const p = newProjectTemplate(action.name, action.description)
      return {
        ...state,
        project: p,
        selectedFeatureId: null,
        selectedNodeId: null,
        selectedEdgeId: null,
        drawingMode: null,
        saveState: 'saved',
        history: [{ project: p }],
        historyIndex: 0
      }
    }

    // ── Features ──────────────────────────────────────────
    case ACTIONS.ADD_FEATURE: {
      const feature = { id: uuidv4(), ...action.feature }
      const features = [...state.project.features, feature]
      const nextProject = { ...state.project, features }
      const histResult = historyReducer(
        { history: state.history, historyIndex: state.historyIndex },
        { type: HISTORY_ACTIONS.PUSH, snapshot: { project: nextProject } }
      )
      return {
        ...state,
        ...histResult,
        project: nextProject,
        selectedFeatureId: feature.id,
        saveState: 'unsaved',
      }
    }

    case ACTIONS.UPDATE_FEATURE: {
      const features = state.project.features.map((f) =>
        f.id === action.id ? { ...f, ...action.updates } : f
      )
      const nextProject = { ...state.project, features }

      const isTemporary = 'hidden' in action.updates && Object.keys(action.updates).length === 1
      if (isTemporary) {
        return { ...state, project: nextProject }
      }

      const histResult = historyReducer(
        { history: state.history, historyIndex: state.historyIndex },
        { type: HISTORY_ACTIONS.PUSH, snapshot: { project: nextProject } }
      )
      return {
        ...state,
        ...histResult,
        project: nextProject,
        saveState: 'unsaved',
      }
    }

    case ACTIONS.REMOVE_FEATURE: {
      const features = state.project.features.filter((f) => f.id !== action.id)
      const nextProject = { ...state.project, features }
      const histResult = historyReducer(
        { history: state.history, historyIndex: state.historyIndex },
        { type: HISTORY_ACTIONS.PUSH, snapshot: { project: nextProject } }
      )
      return {
        ...state,
        ...histResult,
        project: nextProject,
        selectedFeatureId: state.selectedFeatureId === action.id ? null : state.selectedFeatureId,
        saveState: 'unsaved',
      }
    }

    case ACTIONS.SET_FEATURES: {
      const nextProject = { ...state.project, features: action.features }
      const histResult = historyReducer(
        { history: state.history, historyIndex: state.historyIndex },
        { type: HISTORY_ACTIONS.PUSH, snapshot: { project: nextProject } }
      )
      return {
        ...state,
        ...histResult,
        project: nextProject,
        saveState: 'unsaved',
      }
    }

    // ── Selection ─────────────────────────────────────────
    case ACTIONS.SELECT_FEATURE: {
      const isNode = state.project.routingNodes.some((n) => n.id === action.id)
      const isEdge = state.project.routingEdges.some((e) => e.id === action.id)
      if (isNode) {
        return { ...state, selectedNodeId: action.id, selectedFeatureId: null, selectedEdgeId: null }
      } else if (isEdge) {
        return { ...state, selectedEdgeId: action.id, selectedFeatureId: null, selectedNodeId: null }
      } else {
        return { ...state, selectedFeatureId: action.id, selectedNodeId: null, selectedEdgeId: null }
      }
    }

    case ACTIONS.DESELECT:
      return { ...state, selectedFeatureId: null, selectedNodeId: null, selectedEdgeId: null }

    // ── Drawing ───────────────────────────────────────────
    case ACTIONS.SET_DRAWING_MODE:
      return { ...state, drawingMode: action.mode }

    // ── Tile ──────────────────────────────────────────────
    case ACTIONS.SET_TILE_LAYER:
      localStorage.setItem('ramapoint_tile', action.layerId)
      return { ...state, activeTileLayer: action.layerId }

    // ── Routing ───────────────────────────────────────────
    case ACTIONS.ADD_ROUTING_NODE: {
      const node = { id: uuidv4(), ...action.node }
      const routingNodes = [...state.project.routingNodes, node]
      const nextProject = { ...state.project, routingNodes }
      const histResult = historyReducer(
        { history: state.history, historyIndex: state.historyIndex },
        { type: HISTORY_ACTIONS.PUSH, snapshot: { project: nextProject } }
      )
      return {
        ...state,
        ...histResult,
        project: nextProject,
        selectedNodeId: node.id,
        saveState: 'unsaved',
      }
    }

    case ACTIONS.UPDATE_ROUTING_NODE: {
      const routingNodes = state.project.routingNodes.map((n) =>
        n.id === action.id ? { ...n, ...action.updates } : n
      )
      const nextProject = { ...state.project, routingNodes }

      const isTemporary = '_pending' in action.updates && Object.keys(action.updates).length === 1
      if (isTemporary) {
        return { ...state, project: nextProject }
      }

      const histResult = historyReducer(
        { history: state.history, historyIndex: state.historyIndex },
        { type: HISTORY_ACTIONS.PUSH, snapshot: { project: nextProject } }
      )
      return {
        ...state,
        ...histResult,
        project: nextProject,
        saveState: 'unsaved',
      }
    }

    case ACTIONS.REMOVE_ROUTING_NODE: {
      const routingNodes = state.project.routingNodes.filter((n) => n.id !== action.id)
      const routingEdges = state.project.routingEdges.filter(
        (e) => e.from !== action.id && e.to !== action.id
      )
      const nextProject = { ...state.project, routingNodes, routingEdges }
      const histResult = historyReducer(
        { history: state.history, historyIndex: state.historyIndex },
        { type: HISTORY_ACTIONS.PUSH, snapshot: { project: nextProject } }
      )
      return {
        ...state,
        ...histResult,
        project: nextProject,
        selectedNodeId: state.selectedNodeId === action.id ? null : state.selectedNodeId,
        saveState: 'unsaved',
      }
    }

    case ACTIONS.ADD_ROUTING_EDGE: {
      const edge = { id: uuidv4(), ...action.edge }
      const routingEdges = [...state.project.routingEdges, edge]
      const nextProject = { ...state.project, routingEdges }
      const histResult = historyReducer(
        { history: state.history, historyIndex: state.historyIndex },
        { type: HISTORY_ACTIONS.PUSH, snapshot: { project: nextProject } }
      )
      return {
        ...state,
        ...histResult,
        project: nextProject,
        selectedEdgeId: edge.id,
        saveState: 'unsaved',
      }
    }

    case ACTIONS.UPDATE_ROUTING_EDGE: {
      const routingEdges = state.project.routingEdges.map((e) =>
        e.id === action.id ? { ...e, ...action.updates } : e
      )
      const nextProject = { ...state.project, routingEdges }
      const histResult = historyReducer(
        { history: state.history, historyIndex: state.historyIndex },
        { type: HISTORY_ACTIONS.PUSH, snapshot: { project: nextProject } }
      )
      return {
        ...state,
        ...histResult,
        project: nextProject,
        saveState: 'unsaved',
      }
    }

    case ACTIONS.REMOVE_ROUTING_EDGE: {
      const routingEdges = state.project.routingEdges.filter((e) => e.id !== action.id)
      const nextProject = { ...state.project, routingEdges }
      const histResult = historyReducer(
        { history: state.history, historyIndex: state.historyIndex },
        { type: HISTORY_ACTIONS.PUSH, snapshot: { project: nextProject } }
      )
      return {
        ...state,
        ...histResult,
        project: nextProject,
        selectedEdgeId: state.selectedEdgeId === action.id ? null : state.selectedEdgeId,
        saveState: 'unsaved',
      }
    }

    // ── Projects list ─────────────────────────────────────
    case ACTIONS.SET_PROJECTS:
      return { ...state, projects: action.projects }

    // ── UI ────────────────────────────────────────────────
    case ACTIONS.SET_ONLINE_STATUS:
      return { ...state, onlineStatus: action.isOnline }

    case ACTIONS.SET_CACHED_TILES:
      return { ...state, cachedTileCount: action.count }

    case ACTIONS.SET_SAVE_STATE:
      return { ...state, saveState: action.saveState }

    case ACTIONS.TOGGLE_SIDEBAR:
      return { ...state, sidebarOpen: !state.sidebarOpen }

    case ACTIONS.SHOW_TOAST:
      return {
        ...state,
        toast: { message: action.message, type: action.toastType || 'info', visible: true }
      }

    case ACTIONS.HIDE_TOAST:
      return {
        ...state,
        toast: { ...state.toast, visible: false }
      }

    case ACTIONS.OPEN_MODAL:
      return { ...state, activeModal: action.modal }

    case ACTIONS.CLOSE_MODAL:
      return { ...state, activeModal: null }

    // ── History ───────────────────────────────────────────
    case HISTORY_ACTIONS.PUSH: {
      const histResult = historyReducer(
        { history: state.history, historyIndex: state.historyIndex },
        action
      )
      return { ...state, ...histResult }
    }

    case HISTORY_ACTIONS.UNDO: {
      const histResult = historyReducer(
        { history: state.history, historyIndex: state.historyIndex },
        action
      )
      // Restore project from history snapshot
      const snapshot = histResult.historyIndex >= 0
        ? state.history[histResult.historyIndex]
        : null
      return {
        ...state,
        ...histResult,
        project: snapshot ? snapshot.project : state.project,
        saveState: 'unsaved',
      }
    }

    case HISTORY_ACTIONS.REDO: {
      const histResult = historyReducer(
        { history: state.history, historyIndex: state.historyIndex },
        action
      )
      const snapshot = histResult.historyIndex >= 0
        ? state.history[histResult.historyIndex]
        : null
      return {
        ...state,
        ...histResult,
        project: snapshot ? snapshot.project : state.project,
        saveState: 'unsaved',
      }
    }

    default:
      return state
  }
}

// ── Context ──────────────────────────────────────────────
const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  // Load projects from IndexedDB on mount
  useEffect(() => {
    getAllProjects()
      .then((projects) => dispatch({ type: ACTIONS.SET_PROJECTS, projects: projects.reverse() }))
      .catch(() => {})
  }, [])

  // Online/offline event listeners
  useEffect(() => {
    const onOnline = () => dispatch({ type: ACTIONS.SET_ONLINE_STATUS, isOnline: true })
    const onOffline = () => dispatch({ type: ACTIONS.SET_ONLINE_STATUS, isOnline: false })
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  // Helper: save current project to IndexedDB + history
  const saveCurrentProject = useCallback(async () => {
    const project = { ...state.project, updatedAt: new Date().toISOString() }
    await saveProject(project)
    const projects = await getAllProjects()
    dispatch({ type: ACTIONS.SET_PROJECTS, projects: projects.reverse() })
    return project
  }, [state.project])

  // Auto-save logic
  useEffect(() => {
    if (state.saveState !== 'unsaved') return

    const timer = setTimeout(async () => {
      dispatch({ type: ACTIONS.SET_SAVE_STATE, saveState: 'saving' })
      try {
        await saveCurrentProject()
        dispatch({ type: ACTIONS.SET_SAVE_STATE, saveState: 'saved' })
      } catch (err) {
        console.error('Auto-save failed', err)
        dispatch({ type: ACTIONS.SET_SAVE_STATE, saveState: 'error' })
        dispatch({
          type: ACTIONS.SHOW_TOAST,
          message: 'Auto-save failed! Disk quota may be exceeded.',
          toastType: 'error',
        })
      }
    }, 3000) // 3 second debounce

    return () => clearTimeout(timer)
  }, [state.project, state.saveState, saveCurrentProject])

  // Push history snapshot (call after any feature mutation)
  const pushSnapshot = useCallback(() => {
    dispatch({
      type: HISTORY_ACTIONS.PUSH,
      snapshot: { project: state.project },
    })
  }, [state.project])

  const value = { state, dispatch, saveCurrentProject, pushSnapshot, ACTIONS }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

export default AppContext
