import { Injectable, computed, signal } from '@angular/core';
import {
  FlowEdge,
  FlowNode,
  NODE_H,
  NodeType,
  Orientation,
  Selection,
  TimerNodeData,
  Viewport,
  WorkflowJson,
  ValidationError,
  MOCK_CAMPAIGNS,
  MOCK_DELIVERIES_BY_CAMPAIGN
} from './models';

type DomainState = {
  orientation: Orientation;
  viewport: Viewport;
  nodes: FlowNode[];
  edges: FlowEdge[];
};

type UiState = {
  selection: Selection;
  connecting:
    | null
    | {
        fromNodeId: string;
        toPoint: { x: number; y: number };
      };
};

type State = DomainState & UiState;

function deepClone<T>(v: T): T {
  return structuredClone(v);
}

@Injectable({ providedIn: 'root' })
export class FlowStore {
  private _idSeq = 10;

  private readonly _state = signal<State>({
    orientation: 'LR',
    viewport: { panX: 40, panY: 40, zoom: 1 },
    nodes: [
      {
        id: 'n1',
        type: 'DELIVERY',
        position: { x: 80, y: 140 },
        data: { campaignId: 'C1', deliveryId: 'D2' }
      },
      {
        id: 'n2',
        type: 'EVENT',
        position: { x: 400, y: 140 },
        data: { eventType: 'clicked' }
      },
      {
        id: 'n3',
        type: 'TIMER',
        position: { x: 720, y: 140 },
        data: { value: 1, unit: 'days' }
      },
      {
        id: 'n4',
        type: 'DELIVERY',
        position: { x: 1040, y: 140 },
        data: { campaignId: 'C2', deliveryId: 'D5' }
      }
    ],
    edges: [
      { id: 'e1', from: { nodeId: 'n1', port: 'out' }, to: { nodeId: 'n2', port: 'in' } },
      { id: 'e2', from: { nodeId: 'n2', port: 'out' }, to: { nodeId: 'n3', port: 'in' } },
      { id: 'e3', from: { nodeId: 'n3', port: 'out' }, to: { nodeId: 'n4', port: 'in' } }
    ],
    selection: { nodeIds: [], edgeIds: [] },
    connecting: null
  });

  private readonly _undo = signal<DomainState[]>([]);
  private readonly _redo = signal<DomainState[]>([]);
  private _dragOrPanCaptured = false;
  private readonly _draggingType = signal<NodeType | null>(null);
  private readonly _fitViewTick = signal(0);

  readonly state = computed(() => this._state());

  readonly nodes = computed(() => this._state().nodes);
  readonly edges = computed(() => this._state().edges);
  readonly orientation = computed(() => this._state().orientation);
  readonly viewport = computed(() => this._state().viewport);
  readonly selection = computed(() => this._state().selection);
  readonly connecting = computed(() => this._state().connecting);
  readonly draggingType = computed(() => this._draggingType());
  readonly fitViewTick = computed(() => this._fitViewTick());

  readonly campaigns = computed(() => MOCK_CAMPAIGNS);
  readonly deliveriesByCampaign = computed(() => MOCK_DELIVERIES_BY_CAMPAIGN);

  readonly workflowObject = computed<WorkflowJson>(() => ({
    version: 1,
    orientation: this._state().orientation,
    viewport: this._state().viewport,
    nodes: this._state().nodes,
    edges: this._state().edges
  }));

  readonly workflowJson = computed(() => JSON.stringify(this.workflowObject(), null, 2));

  readonly validationErrors = computed<ValidationError[]>(() => this.computeValidation(this.workflowObject()));

  canUndo = computed(() => this._undo().length > 0);
  canRedo = computed(() => this._redo().length > 0);

  private snapshotDomain(): DomainState {
    const s = this._state();
    return deepClone({
      orientation: s.orientation,
      viewport: s.viewport,
      nodes: s.nodes,
      edges: s.edges
    });
  }

  captureHistory(): void {
    const domain = this.snapshotDomain();
    this._undo.update((u) => [...u, domain]);
    this._redo.set([]);
  }

  undo(): void {
    const u = this._undo();
    if (u.length === 0) return;

    const cur = this.snapshotDomain();
    const prev = u[u.length - 1];
    this._undo.set(u.slice(0, -1));
    this._redo.update((r) => [...r, cur]);

    this.applyDomain(prev);
  }

  redo(): void {
    const r = this._redo();
    if (r.length === 0) return;

    const cur = this.snapshotDomain();
    const next = r[r.length - 1];
    this._redo.set(r.slice(0, -1));
    this._undo.update((u) => [...u, cur]);

    this.applyDomain(next);
  }

  private applyDomain(d: DomainState) {
    this._state.update((s) => ({
      ...s,
      ...deepClone(d),
      selection: { nodeIds: [], edgeIds: [] },
      connecting: null
    }));
  }

  beginDragOrPanCaptureOnce() {
    if (this._dragOrPanCaptured) return;
    this.captureHistory();
    this._dragOrPanCaptured = true;
  }

  endDragOrPanCapture() {
    this._dragOrPanCaptured = false;
  }

  setDraggingType(type: NodeType | null) {
    this._draggingType.set(type);
  }

  requestFitView() {
    this._fitViewTick.update((v) => v + 1);
  }

  setSelection(sel: Selection) {
    this._state.update((s) => ({ ...s, selection: sel }));
  }
  clearSelection() {
    this.setSelection({ nodeIds: [], edgeIds: [] });
  }

  selectSingleNode(nodeId: string) {
    this.setSelection({ nodeIds: [nodeId], edgeIds: [] });
  }

  selectSingleEdge(edgeId: string) {
    this.setSelection({ nodeIds: [], edgeIds: [edgeId] });
  }

  clearFlow() {
    const s = this._state();
    if (s.nodes.length === 0 && s.edges.length === 0) return;
    this.captureHistory();
    this._state.update((st) => ({ ...st, nodes: [], edges: [], selection: { nodeIds: [], edgeIds: [] }, connecting: null }));
  }
  addNode(type: NodeType, position: { x: number; y: number }) {
    this.captureHistory();
    const id = `n${this._idSeq++}`;

    const node: FlowNode = {
      id,
      type,
      position: { x: Math.round(position.x), y: Math.round(position.y) },
      data:
        type === 'DELIVERY'
          ? { campaignId: null, deliveryId: null }
          : type === 'TIMER'
            ? ({ value: 1, unit: 'days' } satisfies TimerNodeData)
            : { eventType: 'clicked' }
    };

    this._state.update((s) => ({ ...s, nodes: [...s.nodes, node], selection: { nodeIds: [id], edgeIds: [] } }));
  }

  updateNodePosition(nodeId: string, position: { x: number; y: number }, recordHistory = false) {
    if (recordHistory) this.captureHistory();
    this._state.update((s) => ({
      ...s,
      nodes: s.nodes.map((n) => (n.id === nodeId ? { ...n, position: { x: Math.max(0, position.x), y: Math.max(0, position.y) } } : n))
    }));
  }

  updateNodeData(nodeId: string, patch: Partial<FlowNode['data']>, recordHistory = true) {
    if (recordHistory) this.captureHistory();

    this._state.update((s) => ({
      ...s,
      nodes: s.nodes.map((n) => (n.id === nodeId ? { ...n, data: { ...(n.data as any), ...(patch as any) } } : n))
    }));
  }

  deleteSelection() {
    const sel = this._state().selection;
    if (!sel.nodeIds.length && !sel.edgeIds.length) return;

    this.captureHistory();

    const nodeIds = new Set(sel.nodeIds);
    const edgeIds = new Set(sel.edgeIds);

    this._state.update((s) => {
      const nodes = s.nodes.filter((n) => !nodeIds.has(n.id));
      const edges = s.edges.filter((e) => !edgeIds.has(e.id) && !nodeIds.has(e.from.nodeId) && !nodeIds.has(e.to.nodeId));
      return { ...s, nodes, edges, selection: { nodeIds: [], edgeIds: [] }, connecting: null };
    });
  }

  deleteNode(nodeId: string) {
    this.captureHistory();

    this._state.update((s) => {
      const nodes = s.nodes.filter((n) => n.id !== nodeId);
      const edges = s.edges.filter((e) => e.from.nodeId !== nodeId && e.to.nodeId !== nodeId);
      return { ...s, nodes, edges, selection: { nodeIds: [], edgeIds: [] }, connecting: null };
    });
  }

  removeEdge(edgeId: string) {
    this.captureHistory();
    this._state.update((s) => ({ ...s, edges: s.edges.filter((e) => e.id !== edgeId), selection: { nodeIds: [], edgeIds: [] } }));
  }

  setOrientation(orientation: Orientation) {
    if (orientation === this._state().orientation) return;

    // tek undo adımı olsun diye: önce history al, sonra orientation+auto arrange uygula
    this.captureHistory();

    this._state.update((s) => ({ ...s, orientation }));

    // Orientation değişince otomatik arrange
    this.autoArrangeInternal();
  }


  setViewport(vp: Partial<Viewport>, recordHistory = false) {
    if (recordHistory) this.captureHistory();
    this._state.update((s) => ({ ...s, viewport: { ...s.viewport, ...vp } }));
  }

  startConnecting(fromNodeId: string, toPointWorld: { x: number; y: number }) {
    this._state.update((s) => ({
      ...s,
      selection: { nodeIds: [], edgeIds: [] },
      connecting: { fromNodeId, toPoint: { ...toPointWorld } }
    }));
  }

  updateConnectingPoint(toPointWorld: { x: number; y: number }) {
    this._state.update((s) => {
      if (!s.connecting) return s;
      return { ...s, connecting: { ...s.connecting, toPoint: { ...toPointWorld } } };
    });
  }

  cancelConnecting() {
    this._state.update((s) => ({ ...s, connecting: null }));
  }

  tryCompleteConnection(toNodeId: string) {
    const s = this._state();
    const c = s.connecting;
    if (!c) return;
    const fromNodeId = c.fromNodeId;
    const to = toNodeId;

    if (fromNodeId === to) {
      this.cancelConnecting();
      return;
    }

    if (s.edges.some((e) => e.to.nodeId === to)) {
      this.cancelConnecting();
      return;
    }

    if (this.wouldCreateCycle(fromNodeId, to)) {
      this.cancelConnecting();
      return;
    }

    this.captureHistory();
    const edgeId = `e${this._idSeq++}`;
    const edge: FlowEdge = {
      id: edgeId,
      from: { nodeId: fromNodeId, port: 'out' },
      to: { nodeId: to, port: 'in' }
    };

    this._state.update((st) => ({
      ...st,
      edges: [...st.edges, edge],
      connecting: null,
      selection: { nodeIds: [], edgeIds: [edgeId] }
    }));
  }

  canConnect(fromNodeId: string, toNodeId: string): { ok: boolean; reason?: string } {
    const s = this._state();

    if (fromNodeId === toNodeId) return { ok: false, reason: 'Self connection' };

    // only one incoming edge per node
    if (s.edges.some((e) => e.to.nodeId === toNodeId)) return { ok: false, reason: 'Target already has incoming edge' };

    // prevent cycles
    if (this.wouldCreateCycle(fromNodeId, toNodeId)) return { ok: false, reason: 'Cycle' };

    return { ok: true };
  }



  private wouldCreateCycle(fromNodeId: string, toNodeId: string): boolean {
    const edges = this._state().edges;

    const adj = new Map<string, string[]>();
    for (const e of edges) {
      const a = e.from.nodeId;
      const b = e.to.nodeId;
      const list = adj.get(a) ?? [];
      list.push(b);
      adj.set(a, list);
    }

    const stack: string[] = [toNodeId];
    const seen = new Set<string>();

    while (stack.length) {
      const cur = stack.pop()!;
      if (cur === fromNodeId) return true;
      if (seen.has(cur)) continue;
      seen.add(cur);
      const nexts = adj.get(cur) ?? [];
      for (const n of nexts) stack.push(n);
    }
    return false;
  }

  autoArrange() {
    this.captureHistory();
    this.autoArrangeInternal();
  }

  private autoArrangeInternal() {
    const s = this._state();
    const nodes = s.nodes;
    const edges = s.edges;

    const indeg = new Map<string, number>();
    const out = new Map<string, string[]>();
    for (const n of nodes) indeg.set(n.id, 0);

    for (const e of edges) {
      indeg.set(e.to.nodeId, (indeg.get(e.to.nodeId) ?? 0) + 1);
      const list = out.get(e.from.nodeId) ?? [];
      list.push(e.to.nodeId);
      out.set(e.from.nodeId, list);
    }

    const queue: string[] = nodes.filter((n) => (indeg.get(n.id) ?? 0) === 0).map((n) => n.id);
    const depth = new Map<string, number>();
    for (const id of queue) depth.set(id, 0);

    while (queue.length) {
      const cur = queue.shift()!;
      const d = depth.get(cur) ?? 0;
      for (const nxt of out.get(cur) ?? []) {
        const nd = Math.max(depth.get(nxt) ?? 0, d + 1);
        depth.set(nxt, nd);
        indeg.set(nxt, (indeg.get(nxt) ?? 0) - 1);
        if ((indeg.get(nxt) ?? 0) === 0) queue.push(nxt);
      }
    }

    const groups = new Map<number, string[]>();
    for (const n of nodes) {
      const d = depth.get(n.id) ?? 0;
      const g = groups.get(d) ?? [];
      g.push(n.id);
      groups.set(d, g);
    }

    const layerGapX = 320;
    const rowGapY = 70;
    const withinGapX = 280;
    const withinGapY = 190;

    const nodeById = new Map(nodes.map((n) => [n.id, n]));

    const estimateNodeHeight = (n: FlowNode) => {
      if (n.type === 'DELIVERY') return 190;
      if (n.type === 'TIMER') return 170;
      return 150;
    };

    // Keep TB row gaps even across node types.
    const rowOffsets = new Map<number, number>();
    if (s.orientation === 'TB') {
      const depths = Array.from(groups.keys()).sort((a, b) => a - b);
      let yCursor = 80;
      for (const d of depths) {
        const ids = groups.get(d) ?? [];
        let rowHeight = 0;
        for (const id of ids) {
          const node = nodeById.get(id);
          if (!node) continue;
          rowHeight = Math.max(rowHeight, estimateNodeHeight(node));
        }
        rowOffsets.set(d, yCursor);
        yCursor += (rowHeight || NODE_H) + rowGapY;
      }
    }

    const arranged = nodes.map((n) => {
      const d = depth.get(n.id) ?? 0;
      const ids = groups.get(d) ?? [];
      const idx = ids.indexOf(n.id);

      if (s.orientation === 'LR') {
        return { ...n, position: { x: 80 + d * layerGapX, y: 80 + idx * withinGapY } };
      }
      const y = rowOffsets.get(d) ?? 80 + d * (NODE_H + rowGapY);
      return { ...n, position: { x: 80 + idx * withinGapX, y } };
    });

    this._state.update((st) => ({ ...st, nodes: arranged }));
  }


  validateNow(): ValidationError[] {
    return this.computeValidation(this.workflowObject());
  }

  private computeValidation(w: WorkflowJson): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const n of w.nodes) {
      if (n.type === 'DELIVERY') {
        const d = n.data as any;
        if (!d.campaignId) errors.push({ id: n.id, message: 'DELIVERY: campaignId is required' });
        if (!d.deliveryId) errors.push({ id: n.id, message: 'DELIVERY: deliveryId is required' });
      }
      if (n.type === 'TIMER') {
        const d = n.data as any;
        if (!(typeof d.value === 'number') || d.value <= 0)
          errors.push({ id: n.id, message: 'TIMER: value must be > 0' });
        if (!d.unit) errors.push({ id: n.id, message: 'TIMER: unit is required' });
      }
      if (n.type === 'EVENT') {
        const d = n.data as any;
        if (!d.eventType) errors.push({ id: n.id, message: 'EVENT: eventType is required' });
      }
    }

    const ids = new Set(w.nodes.map((n) => n.id));
    for (const e of w.edges) {
      if (!ids.has(e.from.nodeId)) errors.push({ id: e.from.nodeId, message: `Edge ${e.id}: from node missing` });
      if (!ids.has(e.to.nodeId)) errors.push({ id: e.to.nodeId, message: `Edge ${e.id}: to node missing` });
    }

    return errors;
  }
}

function max(a: number, b: number) {
  return a > b ? a : b;
}









