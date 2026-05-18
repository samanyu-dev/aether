import { create } from 'zustand';
import { Node, Edge, Position } from 'reactflow';
import dagre from 'dagre';

export interface AetherEvent {
  id: string;
  sessionId: string;
  timestamp: string;
  type: 'thought' | 'tool_call' | 'tool_result' | 'memory' | 'token' | 'hallucination' | 'system';
  parentId?: string;
  content: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}

interface AetherState {
  events: AetherEvent[];
  sessions: string[];
  activeSession: string | null;
  isStreaming: boolean;
  isConnected: boolean;
  selectedEventId: string | null;
  nodes: Node[];
  edges: Edge[];
  timelinePosition: number; // 0 to 1
  activeNodeId: string | null;
  activePathNodeIds: string[];
  
  // Actions
  addEvent: (event: AetherEvent) => void;
  addEvents: (events: AetherEvent[]) => void;
  setActiveSession: (sessionId: string) => void;
  setStreaming: (status: boolean) => void;
  setConnected: (status: boolean) => void;
  setTimelinePosition: (pos: number) => void;
  computeGraph: () => void;
  clearActiveEvents: () => void;
  setSelectedEvent: (id: string | null) => void;
  loadReplay: (events: AetherEvent[]) => void;
}

export const useAetherStore = create<AetherState>((set) => ({
  events: [],
  sessions: [],
  activeSession: null,
  isStreaming: false,
  isConnected: false,
  selectedEventId: null,
  nodes: [],
  edges: [],
  timelinePosition: 1,
  activeNodeId: null,
  activePathNodeIds: [],

  setSelectedEvent: (id) => set({ selectedEventId: id }),

  addEvent: (event) => set((state) => {
    // Only track events for the active session to keep memory low
    // In Phase 1, we focus on a single active stream
    const isNewSession = !state.sessions.includes(event.sessionId);
    const newSessions = isNewSession ? [...state.sessions, event.sessionId] : state.sessions;
    
    // If it's a different session and we already have an active one, just update session list
    if (state.activeSession && event.sessionId !== state.activeSession) {
      return { sessions: newSessions };
    }

    // Maintain a buffer of events for the active session
    // Capping at 200 events for Phase 1 stability
    const newEvents = [...state.events, event].slice(-200);

    return { 
      events: newEvents, 
      sessions: newSessions,
      activeSession: state.activeSession || event.sessionId 
    };
  }),

  addEvents: (newEventsList) => set((state) => {
    // Basic filter for Phase 1: only keep events for the current active session
    // If no active session, use the sessionId from the first event in the list
    const targetSession = state.activeSession || newEventsList[0]?.sessionId;
    
    if (!targetSession) return state;

    const sessionEvents = newEventsList.filter(e => e.sessionId === targetSession);
    const combinedEvents = [...state.events, ...sessionEvents].slice(-200);

    return {
      events: combinedEvents,
      activeSession: targetSession,
    };
  }),

  setActiveSession: (sessionId) => {
    set({ 
      activeSession: sessionId,
      events: [],
      nodes: [],
      edges: []
    });
  },

  setStreaming: (status) => set({ isStreaming: status }),
  setConnected: (status) => set({ isConnected: status }),
  setTimelinePosition: (pos) => set({ timelinePosition: pos }),
  
  computeGraph: () => set((state) => {
    if (!state.activeSession) return state;

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'LR', nodesep: 80, ranksep: 120 });

    // Filter events by timeline and remove tokens (tokens are for sidebar only)
    const count = Math.ceil(state.events.length * state.timelinePosition);
    let visibleEvents = state.events.slice(0, count).filter(e => e.type !== 'token');
    
    // Limit to 50 nodes for safety, but allows seeing the full graph
    if (visibleEvents.length > 50) {
      visibleEvents = visibleEvents.slice(-50);
    }

    // Compute active ID
    const activeId = visibleEvents[visibleEvents.length - 1]?.id || null;
    
    // Compute active parent path (cycle-safe)
    const pathNodeIds: string[] = [];
    let currentId: string | undefined = activeId || undefined;
    const visited = new Set<string>();
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      pathNodeIds.push(currentId);
      const parentEvent = visibleEvents.find(e => e.id === currentId);
      currentId = parentEvent?.parentId;
    }

    // Create Nodes
    const newNodes: Node[] = visibleEvents.map((event, index) => {
      const node = {
        id: event.id,
        type: 'aetherNode',
        data: { ...event, label: event.content, animationIndex: index },
        position: { x: 0, y: 0 },
      };
      dagreGraph.setNode(event.id, { width: 250, height: 100 });
      return node;
    });

    // Create Edges
    const newEdges: Edge[] = [];
    visibleEvents.forEach((event) => {
      if (event.parentId) {
        const isTargetActive = event.id === activeId;
        const isHallucination = event.type === "hallucination";
        
        newEdges.push({
          id: `e-${event.parentId}-${event.id}`,
          source: event.parentId,
          target: event.id,
          type: "aetherEdge",
          data: {
            isActive: isTargetActive,
            isHallucination: isHallucination,
            isDestabilized: isTargetActive && isHallucination,
          },
        });
        dagreGraph.setEdge(event.parentId, event.id);
      }
    });

    // Compute Layout
    dagre.layout(dagreGraph);

    // Pre-parse a dictionary of visible events for fast lookup
    const eventMap = new Map(visibleEvents.map(e => [e.id, e]));

    const layoutedNodes = newNodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      let posX = nodeWithPosition.x;
      let posY = nodeWithPosition.y;

      const event = eventMap.get(node.id);
      if (event) {
        // 1. Root Thought Positioning: Anchor higher and more central
        if (!event.parentId) {
          posY -= 50; // Shift root node slightly higher to act as the head origin
        }

        // 2. Memory nodes orbital placement close to parent thought with clearance
        if (event.type === "memory" && event.parentId) {
          const parentNode = dagreGraph.node(event.parentId);
          if (parentNode) {
            // Orbiting auxiliary memory higher above the parent thought card to prevent overlap
            posX = parentNode.x + 35;
            posY = parentNode.y - 130; 
          }
        }

        // 3. Organic staggering for tool chains and thoughts
        // Creates vertical offsets and staggered branch elegance
        const staggerIndex = event.parentId ? visibleEvents.findIndex(e => e.id === event.id) : 0;
        if (event.type !== "memory" && event.parentId) {
          posY += Math.sin(staggerIndex * 2.5) * 15;
        }

        // 4. Hallucination Branching visually diverges off-path
        if (event.type === "hallucination") {
          posY += 140; // Push visually far off-path (plenty of clearance)
          posX += 55; // Give extra forward push
        }

        // 5. Self Correction branches curve back inward, restoring logical alignment
        if (event.metadata?.selfCorrection) {
          posY -= 80; // Pull back toward center main line
          posX += 30;
        }
      }

      return {
        ...node,
        targetPosition: Position.Left,
        sourcePosition: Position.Right,
        position: {
          x: posX - 125,
          y: posY - 50,
        },
      };
    });

    return { 
      nodes: layoutedNodes, 
      edges: newEdges,
      activeNodeId: activeId,
      activePathNodeIds: pathNodeIds
    };
  }),
  
  loadReplay: (events) => set((state) => {
    if (!events || events.length === 0) return state;
    const targetSession = events[0].sessionId || "loaded-replay";
    
    return {
      events: events,
      activeSession: targetSession,
      timelinePosition: 0, // Starts at 0 for cinematic birth progression!
      sessions: Array.from(new Set([...state.sessions, targetSession])),
    };
  }),

  clearActiveEvents: () => set({ 
    events: [], 
    nodes: [], 
    edges: [], 
    activeSession: null, 
    timelinePosition: 0,
    activeNodeId: null,
    activePathNodeIds: []
  }),
}));
