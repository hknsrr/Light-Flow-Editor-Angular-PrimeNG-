import { ChangeDetectionStrategy, AfterViewInit, Component, ElementRef, HostListener, NgZone, ViewChild, computed, effect, inject, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FlowStore } from './flow-store.service';
import { EdgeLayerComponent } from './edge-layer.component';
import { NodeShellComponent } from './node-shell.component';
import { DeliveryNodeComponent } from './nodes/delivery-node.component';
import { TimerNodeComponent } from './nodes/timer-node.component';
import { EventNodeComponent } from './nodes/event-node.component';
import { FlowEdge, FlowNode, NODE_H, NODE_W, NodeType } from './models';

type Pt = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };

type DragPreview = {
  type: NodeType;
  x: number;
  y: number;
};

@Component({
  selector: 'app-flow-canvas',
  standalone: true,
  imports: [CommonModule, EdgeLayerComponent, NodeShellComponent, DeliveryNodeComponent, TimerNodeComponent, EventNodeComponent],
  template: `
    <div
      #root
      class="root"
      [class.connecting]="isConnecting()"
      [class.connect-ok]="isConnecting() && hoverInNodeId() && hoverOk()"
      [class.connect-bad]="isConnecting() && hoverInNodeId() && !hoverOk()"
      (wheel)="onWheel($event)"
      (pointerdown)="onRootPointerDown($event)"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
    >
      <div class="grid"></div>

      <!-- EDGES: full overlay, transformed in SVG <g> -->
      <app-edge-layer
        class="edges"
        [nodes]="nodes()"
        [edges]="edges()"
        [orientation]="orientation()"
        [selection]="selection()"
        [nodeSizes]="nodeSizes()"
        [connecting]="connecting()"
        [previewState]="previewState()"
        [worldTransform]="worldTransform()"
        (selectEdge)="selectEdge($event)"
      ></app-edge-layer>

      <!-- NODES: transformed with same worldTransform -->
      <div class="scene" [style.transform]="sceneTransform()">
        <ng-container *ngFor="let n of nodes()">
          <app-node-shell
            [node]="n"
            [orientation]="orientation()"
            [selected]="isSelectedNode(n.id)"
            [connectHover]="connectHoverFor(n.id)"
            (selectNode)="selectNode($event)"
            (startDrag)="startNodeDrag($event, n)"
            (startConnect)="startConnect($event, n)"
          >
            <ng-container [ngSwitch]="n.type">
              <app-delivery-node *ngSwitchCase="'DELIVERY'" [node]="n" />
              <app-timer-node *ngSwitchCase="'TIMER'" [node]="n" />
              <app-event-node *ngSwitchCase="'EVENT'" [node]="n" />
            </ng-container>
          </app-node-shell>
        </ng-container>

        <ng-container *ngIf="dragPreview() as preview">
          <div
            class="drag-preview"
            [style.left.px]="preview.x"
            [style.top.px]="preview.y"
            [attr.data-type]="preview.type"
          >
            {{ preview.type }}
          </div>
        </ng-container>
      </div>

      <ng-container *ngIf="marqueeRect() as m">
        <div
          class="marquee"
          [style.left.px]="m.x"
          [style.top.px]="m.y"
          [style.width.px]="m.w"
          [style.height.px]="m.h"
        ></div>
      </ng-container>

      <div class="watermark">
        <div class="line">Light Flow Editor</div>
        <div class="line small">Angular 18 - PrimeNG 17 - SVG edges</div>
      </div>
    </div>
  `,
  styles: [
    `
      .root {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
        outline: none;
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
      }

      .grid {
        position: absolute;
        inset: 0;
        background-image: linear-gradient(var(--grid-line) 1px, transparent 1px),
          linear-gradient(90deg, var(--grid-line) 1px, transparent 1px);
        background-size: 28px 28px;
        opacity: var(--grid-opacity);
        transform: translateZ(0);
        pointer-events: none;
      }

      .edges {
        position: absolute;
        inset: 0;
        z-index: 1;
      }

      .scene {
        position: absolute;
        inset: 0;
        transform-origin: 0 0;
        will-change: transform;
        z-index: 2;
      }

      .drag-preview {
        position: absolute;
        width: ${NODE_W}px;
        height: ${NODE_H}px;
        border-radius: 14px;
        border: 1px dashed var(--drag-preview-border);
        background: var(--drag-preview-bg);
        color: var(--drag-preview-text);
        font-size: 11px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        display: grid;
        place-items: center;
        pointer-events: none;
        opacity: 0.6;
        box-shadow: var(--drag-preview-shadow);
      }

      .drag-preview[data-type='DELIVERY'] {
        border-color: var(--drag-delivery-border);
        color: var(--drag-delivery-text);
        background: var(--drag-delivery-bg);
      }

      .drag-preview[data-type='TIMER'] {
        border-color: var(--drag-timer-border);
        color: var(--drag-timer-text);
        background: var(--drag-timer-bg);
      }

      .drag-preview[data-type='EVENT'] {
        border-color: var(--drag-event-border);
        color: var(--drag-event-text);
        background: var(--drag-event-bg);
      }

      .marquee {
        position: absolute;
        border: 1px solid var(--marquee-border);
        background: var(--marquee-bg);
        box-shadow: var(--marquee-shadow);
        pointer-events: none;
        z-index: 4;
      }

      .watermark {
        position: absolute;
        left: 12px;
        bottom: 12px;
        padding: 8px 10px;
        border-radius: 12px;
        background: var(--watermark-bg);
        border: 1px solid var(--watermark-border);
        color: var(--text);
        font-size: 12px;
        opacity: 0.85;
        pointer-events: none;
        z-index: 3;
      }

      .line.small {
        font-size: 11px;
        opacity: 0.75;
      }

      /* Cursor feedback while connecting */
      .root.connecting {
        cursor: crosshair;
      }
      .root.connect-ok {
        cursor: copy;
      }
      .root.connect-bad {
        cursor: not-allowed;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FlowCanvasComponent implements AfterViewInit {
  private readonly store = inject(FlowStore);
  private readonly zone = inject(NgZone);

  private readonly fitViewEffect = effect(() => {
    this.store.fitViewTick();
    if (!this.viewReady) return;
    untracked(() => this.fitToView());
  }, { allowSignalWrites: true });

  @ViewChild('root', { static: true }) rootRef!: ElementRef<HTMLDivElement>;

  readonly nodes = this.store.nodes;
  readonly edges = this.store.edges;
  readonly orientation = this.store.orientation;
  readonly selection = this.store.selection;
  readonly nodeSizes = this.store.nodeSizes;
readonly connecting = this.store.connecting;
  readonly viewport = this.store.viewport;

  readonly sceneTransform = computed(() => {
    const vp = this.viewport();
    return `translate(${vp.panX}px, ${vp.panY}px) scale(${vp.zoom})`;
  });

  readonly worldTransform = computed(() => {
    const vp = this.viewport();
    // SVG transform syntax uses spaces
    return `translate(${vp.panX} ${vp.panY}) scale(${vp.zoom})`;
  });

  private spaceDown = false;

  private panActive = false;
  private panStart: { x: number; y: number; panX: number; panY: number } | null = null;

  private nodeDragActive: { nodeId: string; start: Pt; nodePos: Pt } | null = null;

  private connectPointerId: number | null = null;
  private didInitialFit = false;
  private viewReady = false;

  private marqueeActive = false;
  private marqueeStart: Pt | null = null;
  private marqueeCurrent: Pt | null = null;

  readonly marqueeRect = signal<Rect | null>(null);
  readonly dragPreview = signal<DragPreview | null>(null);
  private dragPreviewClearId: ReturnType<typeof setTimeout> | null = null;

  readonly isConnecting = computed(() => !!this.connecting());

  readonly hoverInNodeId = signal<string | null>(null);
  readonly hoverOk = signal<boolean>(false);

  readonly previewState = computed<'none' | 'ok' | 'bad'>(() => {
    if (!this.isConnecting()) return 'none';
    const hid = this.hoverInNodeId();
    if (!hid) return 'none';
    return this.hoverOk() ? 'ok' : 'bad';
  });

  connectHoverFor(nodeId: string): 'none' | 'ok' | 'bad' {
    const hid = this.hoverInNodeId();
    if (!hid || hid !== nodeId) return 'none';
    return this.hoverOk() ? 'ok' : 'bad';
  }

  isSelectedNode(nodeId: string): boolean {
    const s = this.selection();
    return s.nodeIds.includes(nodeId);
  }

  private screenFromClient(clientX: number, clientY: number): Pt {
    const root = this.rootRef.nativeElement.getBoundingClientRect();
    return { x: clientX - root.left, y: clientY - root.top };
  }

  private worldFromScreen(sx: number, sy: number): Pt {
    const vp = this.viewport();
    return {
      x: (sx - vp.panX) / vp.zoom,
      y: (sy - vp.panY) / vp.zoom
    };
  }

  worldFromClient(clientX: number, clientY: number): Pt {
    const screen = this.screenFromClient(clientX, clientY);
    return this.worldFromScreen(screen.x, screen.y);
  }

  ngAfterViewInit() {
    this.viewReady = true;
    if (this.didInitialFit) return;
    this.didInitialFit = true;
    untracked(() => this.fitToView());
  }

  private fitToView() {
    const nodes = this.nodes();
    if (!nodes.length) return;

    const root = this.rootRef.nativeElement.getBoundingClientRect();
    if (root.width <= 0 || root.height <= 0) return;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const n of nodes) {
      minX = Math.min(minX, n.position.x);
      minY = Math.min(minY, n.position.y);
      maxX = Math.max(maxX, n.position.x + NODE_W);
      maxY = Math.max(maxY, n.position.y + NODE_H);
    }

    const contentW = maxX - minX;
    const contentH = maxY - minY;
    if (contentW <= 0 || contentH <= 0) return;

    const padding = 60;
    const scaleX = (root.width - padding * 2) / contentW;
    const scaleY = (root.height - padding * 2) / contentH;
    let zoom = Math.min(scaleX, scaleY, 1);
    zoom = Math.max(0.4, Math.min(zoom, 1));

    const panX = (root.width - contentW * zoom) / 2 - minX * zoom;
    const panY = (root.height - contentH * zoom) / 2 - minY * zoom;

    this.store.setViewport({ panX, panY, zoom }, false);
  }

  private dragTypeFromEvent(ev: DragEvent): NodeType | null {
    const type = (ev.dataTransfer?.getData('application/x-flow-node-type') ||
      ev.dataTransfer?.getData('text/plain')) as NodeType;

    if (type === 'DELIVERY' || type === 'TIMER' || type === 'EVENT') return type;

    const fallback = this.store.draggingType();
    if (fallback) return fallback;

    return null;
  }

  onDragOver(ev: DragEvent) {
    ev.preventDefault();
    if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'copy';
    const type = this.dragTypeFromEvent(ev);
    if (!type) {
      this.clearDragPreviewSoon(0);
      return;
    }

    this.cancelDragPreviewClear();
    const w = this.worldFromClient(ev.clientX, ev.clientY);
    this.dragPreview.set({ type, x: w.x - NODE_W / 2, y: w.y - 20 });
  }

  onDragLeave(ev: DragEvent) {
    const next = ev.relatedTarget as Node | null;
    if (next && this.rootRef.nativeElement.contains(next)) return;
    this.clearDragPreviewSoon(80);
  }

  onDrop(ev: DragEvent) {
    ev.preventDefault();
    const type = this.dragTypeFromEvent(ev);
    if (!type) {
      this.clearDragPreviewSoon(0);
      return;
    }

    const w = this.worldFromClient(ev.clientX, ev.clientY);
    this.store.addNode(type, { x: w.x - NODE_W / 2, y: w.y - 20 });
    this.clearDragPreviewSoon(0);
  }
  private cancelDragPreviewClear() {
    if (this.dragPreviewClearId) {
      clearTimeout(this.dragPreviewClearId);
      this.dragPreviewClearId = null;
    }
  }

  private clearDragPreviewSoon(delayMs: number) {
    this.cancelDragPreviewClear();
    if (delayMs <= 0) {
      this.dragPreview.set(null);
      return;
    }
    this.dragPreviewClearId = setTimeout(() => {
      this.dragPreview.set(null);
      this.dragPreviewClearId = null;
    }, delayMs);
  }

  onWheel(ev: WheelEvent) {
    ev.preventDefault();
    if (this.panActive || this.nodeDragActive || this.marqueeActive || this.connectPointerId != null) return;

    const vp = this.viewport();
    const root = this.rootRef.nativeElement.getBoundingClientRect();
    const cursor = { x: ev.clientX - root.left, y: ev.clientY - root.top };

    const zoomFactor = ev.deltaY < 0 ? 1.08 : 1 / 1.08;
    const nextZoom = Math.max(0.25, Math.min(2.5, vp.zoom * zoomFactor));

    const world = {
      x: (cursor.x - vp.panX) / vp.zoom,
      y: (cursor.y - vp.panY) / vp.zoom
    };

    const nextPanX = cursor.x - world.x * nextZoom;
    const nextPanY = cursor.y - world.y * nextZoom;

    this.store.setViewport({ zoom: nextZoom, panX: nextPanX, panY: nextPanY }, false);
  }

  onRootPointerDown(ev: PointerEvent) {
    const el = ev.target as HTMLElement;
    if (el.closest('.node') || el.closest('path')) return;

    const isMiddle = ev.button === 1;
    if (isMiddle || this.spaceDown) {
      ev.preventDefault();
      this.store.clearSelection();
      this.startPan(ev);
      return;
    }

    if (ev.button !== 0) return;

    ev.preventDefault();
    this.store.clearSelection();
    this.startMarquee(ev);
  }

  private startMarquee(ev: PointerEvent) {
    this.marqueeActive = true;
    const start = this.screenFromClient(ev.clientX, ev.clientY);
    this.marqueeStart = start;
    this.marqueeCurrent = start;
    this.marqueeRect.set(this.rectFromPoints(start, start));
    this.applyMarqueeSelection();

    this.rootRef.nativeElement.setPointerCapture(ev.pointerId);

    const move = (e: PointerEvent) => this.onMarqueeMove(e);
    const up = (e: PointerEvent) => {
      this.rootRef.nativeElement.releasePointerCapture(e.pointerId);
      this.marqueeActive = false;
      this.marqueeStart = null;
      this.marqueeCurrent = null;
      this.marqueeRect.set(null);
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', up, true);
    };

    window.addEventListener('pointermove', move, true);
    window.addEventListener('pointerup', up, true);
  }

  private onMarqueeMove(ev: PointerEvent) {
    if (!this.marqueeActive || !this.marqueeStart) return;
    const cur = this.screenFromClient(ev.clientX, ev.clientY);
    this.marqueeCurrent = cur;
    this.marqueeRect.set(this.rectFromPoints(this.marqueeStart, cur));
    this.applyMarqueeSelection();
  }

  private rectFromPoints(a: Pt, b: Pt): Rect {
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    const w = Math.abs(a.x - b.x);
    const h = Math.abs(a.y - b.y);
    return { x, y, w, h };
  }

  private rectsIntersect(a: Rect, b: Rect): boolean {
    return a.x <= b.x + b.w && a.x + a.w >= b.x && a.y <= b.y + b.h && a.y + a.h >= b.y;
  }

  private worldRectFromScreenRect(r: Rect): Rect {
    const a = this.worldFromScreen(r.x, r.y);
    const b = this.worldFromScreen(r.x + r.w, r.y + r.h);
    return this.rectFromPoints(a, b);
  }

  private portPos(node: FlowNode, port: 'in' | 'out'): Pt {
    const x = node.position.x;
    const y = node.position.y;

    if (this.orientation() === 'LR') {
      const px = port === 'in' ? x : x + NODE_W;
      const py = y + NODE_H / 2;
      return { x: px, y: py };
    }

    const px = x + NODE_W / 2;
    const py = port === 'in' ? y : y + NODE_H;
    return { x: px, y: py };
  }

  private edgeMidpoint(edge: FlowEdge, nodeById: Map<string, FlowNode>): Pt | null {
    const from = nodeById.get(edge.from.nodeId);
    const to = nodeById.get(edge.to.nodeId);
    if (!from || !to) return null;
    const a = this.portPos(from, 'out');
    const b = this.portPos(to, 'in');
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  private applyMarqueeSelection() {
    const rect = this.marqueeRect();
    if (!rect) return;
    const worldRect = this.worldRectFromScreenRect(rect);

    const nodeIds: string[] = [];
    const nodeById = new Map<string, FlowNode>();
    for (const n of this.nodes()) {
      nodeById.set(n.id, n);
      const nodeRect: Rect = { x: n.position.x, y: n.position.y, w: NODE_W, h: NODE_H };
      if (this.rectsIntersect(worldRect, nodeRect)) nodeIds.push(n.id);
    }

    const nodeIdSet = new Set(nodeIds);
    const edgeIds: string[] = [];
    for (const e of this.edges()) {
      if (nodeIdSet.has(e.from.nodeId) && nodeIdSet.has(e.to.nodeId)) {
        edgeIds.push(e.id);
        continue;
      }
      const mid = this.edgeMidpoint(e, nodeById);
      if (mid && mid.x >= worldRect.x && mid.x <= worldRect.x + worldRect.w && mid.y >= worldRect.y && mid.y <= worldRect.y + worldRect.h) {
        edgeIds.push(e.id);
      }
    }

    this.store.setSelection({ nodeIds, edgeIds });
  }

  private startPan(ev: PointerEvent) {
    this.panActive = true;
    this.store.beginDragOrPanCaptureOnce();

    const vp = this.viewport();
    this.panStart = { x: ev.clientX, y: ev.clientY, panX: vp.panX, panY: vp.panY };

    this.rootRef.nativeElement.setPointerCapture(ev.pointerId);

    const move = (e: PointerEvent) => this.onPanMove(e);
    const up = (e: PointerEvent) => {
      this.rootRef.nativeElement.releasePointerCapture(e.pointerId);
      this.panActive = false;
      this.panStart = null;
      this.store.endDragOrPanCapture();
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', up, true);
    };

    window.addEventListener('pointermove', move, true);
    window.addEventListener('pointerup', up, true);
  }

  private onPanMove(ev: PointerEvent) {
    if (!this.panActive || !this.panStart) return;
    const dx = ev.clientX - this.panStart.x;
    const dy = ev.clientY - this.panStart.y;

    this.store.setViewport({ panX: this.panStart.panX + dx, panY: this.panStart.panY + dy }, false);
  }

  startNodeDrag(ev: PointerEvent, node: FlowNode) {
    if (this.spaceDown || ev.button === 1) return;

    ev.preventDefault();
    ev.stopPropagation();

    this.store.selectSingleNode(node.id);
    this.store.beginDragOrPanCaptureOnce();

    const startWorld = this.worldFromClient(ev.clientX, ev.clientY);

    this.nodeDragActive = {
      nodeId: node.id,
      start: startWorld,
      nodePos: { x: node.position.x, y: node.position.y }
    };

    this.rootRef.nativeElement.setPointerCapture(ev.pointerId);

    const move = (e: PointerEvent) => this.onNodeDragMove(e);
    const up = (e: PointerEvent) => {
      this.rootRef.nativeElement.releasePointerCapture(e.pointerId);
      this.nodeDragActive = null;
      this.store.endDragOrPanCapture();
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', up, true);
    };

    window.addEventListener('pointermove', move, true);
    window.addEventListener('pointerup', up, true);
  }

  private rafPending = false;
  private lastDragEvent: PointerEvent | null = null;

  private onNodeDragMove(ev: PointerEvent) {
    this.lastDragEvent = ev;
    if (this.rafPending) return;
    this.rafPending = true;

    this.zone.runOutsideAngular(() => {
      requestAnimationFrame(() => {
        this.rafPending = false;
        const e = this.lastDragEvent;
        this.lastDragEvent = null;
        if (!e) return;
        this.zone.run(() => this.applyNodeDrag(e));
      });
    });
  }

  private applyNodeDrag(ev: PointerEvent) {
    const d = this.nodeDragActive;
    if (!d) return;

    const cur = this.worldFromClient(ev.clientX, ev.clientY);
    const dx = cur.x - d.start.x;
    const dy = cur.y - d.start.y;

    this.store.updateNodePosition(d.nodeId, { x: d.nodePos.x + dx, y: d.nodePos.y + dy }, false);
  }

  startConnect(ev: PointerEvent, node: FlowNode) {
    ev.preventDefault();
    ev.stopPropagation();

    this.hoverInNodeId.set(null);
    this.hoverOk.set(false);

    const start = this.worldFromClient(ev.clientX, ev.clientY);
    this.store.startConnecting(node.id, start);
    this.connectPointerId = ev.pointerId;

    this.rootRef.nativeElement.setPointerCapture(ev.pointerId);

    const move = (e: PointerEvent) => this.onConnectMove(e);
    const up = (e: PointerEvent) => {
      this.rootRef.nativeElement.releasePointerCapture(e.pointerId);
      this.connectPointerId = null;

      const c = this.connecting();
      const hit = this.findClosestInputPort(e.clientX, e.clientY);

      if (c && hit) {
        const verdict = this.store.canConnect(c.fromNodeId, hit.nodeId);
        if (verdict.ok) this.store.tryCompleteConnection(hit.nodeId);
        else this.store.cancelConnecting();
      } else {
        this.store.cancelConnecting();
      }

      this.hoverInNodeId.set(null);
      this.hoverOk.set(false);

      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', up, true);
    };

    window.addEventListener('pointermove', move, true);
    window.addEventListener('pointerup', up, true);
  }

  private onConnectMove(ev: PointerEvent) {
    if (this.connectPointerId == null) return;

    const c = this.connecting();
    if (!c) return;

    const hit = this.findClosestInputPort(ev.clientX, ev.clientY);

    // Snap preview to port center when hovering over a target.
    if (hit) {
      this.store.updateConnectingPoint(hit.world);

      this.hoverInNodeId.set(hit.nodeId);
      const verdict = this.store.canConnect(c.fromNodeId, hit.nodeId);
      this.hoverOk.set(verdict.ok);
      return;
    }

    // No snap: follow cursor.
    const w = this.worldFromClient(ev.clientX, ev.clientY);
    this.store.updateConnectingPoint(w);

    this.hoverInNodeId.set(null);
    this.hoverOk.set(false);
  }

  private findClosestInputPort(
    clientX: number,
    clientY: number
  ): { nodeId: string; dist: number; world: { x: number; y: number } } | null {
    const ports = Array.from(document.querySelectorAll<HTMLElement>('[data-flow-port="in"][data-flow-node-id]'));
    let best: { nodeId: string; dist: number; world: { x: number; y: number } } | null = null;

    for (const el of ports) {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const dx = clientX - cx;
      const dy = clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const world = this.worldFromClient(cx, cy); // port center -> world coords

      if (!best || dist < best.dist) best = { nodeId: el.dataset['flowNodeId']!, dist, world };
    }

    // Snap threshold
    if (best && best.dist <= 70) return best;
    return null;
  }

  selectNode(nodeId: string) {
    this.store.selectSingleNode(nodeId);
  }

  selectEdge(edgeId: string) {
    this.store.selectSingleEdge(edgeId);
  }

  private isTypingTarget(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null;
    if (!el) return false;
    return !!el.closest('input, textarea, [contenteditable="true"]');
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(ev: KeyboardEvent) {
    if (ev.code === 'Space') {
      ev.preventDefault();
      this.spaceDown = true;
    }

    if ((ev.code === 'Delete' || ev.code === 'Backspace') && !this.isTypingTarget(ev.target)) {
      ev.preventDefault();
      this.store.deleteSelection();
    }
  }

  @HostListener('window:keyup', ['$event'])
  onKeyUp(ev: KeyboardEvent) {
    if (ev.code === 'Space') {
      ev.preventDefault();
      this.spaceDown = false;
    }
  }
}




