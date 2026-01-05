import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FlowEdge, FlowNode, NODE_H, NODE_W, Orientation, Selection } from './models';

type Pt = { x: number; y: number };

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

@Component({
  selector: 'app-edge-layer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg class="svg" width="100%" height="100%">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <!-- Apply the same pan/zoom transform as nodes -->
      <g [attr.transform]="worldTransform">
        <ng-container *ngFor="let e of edges">
          <path class="hit" [attr.d]="pathForEdge(e)" (pointerdown)="onEdgeDown($event, e.id)"></path>
          <path class="edge" [attr.d]="pathForEdge(e)" [attr.stroke]="edgeStroke(e)" [attr.filter]="edgeFilter(e)"></path>
          <path class="edge flow" [attr.d]="pathForEdge(e)"></path>
        </ng-container>

        <ng-container *ngIf="connecting">
          <path
            class="edge preview"
            [class.ok]="previewState === 'ok'"
            [class.bad]="previewState === 'bad'"
            [attr.d]="previewPath()"
          />
        </ng-container>
      </g>
    </svg>
  `,
  styles: [
    `
      .svg {
        position: absolute;
        inset: 0;
        overflow: visible;
        pointer-events: auto; /* allow edge click */
      }

      .edge {
        pointer-events: none;
        fill: none;
        stroke-width: 2.2;
        filter: none;
      }

      .edge.flow {
        stroke: rgb(255 255 255);
        stroke-dasharray: 3 9;
        stroke-dashoffset: 0;
        stroke-width: 4px;
        stroke-linecap: round;
        opacity: 0.85;
        animation: edge-flow 2s linear infinite;
        will-change: stroke-dashoffset;
      }

      @keyframes edge-flow {
        from {
          stroke-dashoffset: 0;
        }
        to {
          stroke-dashoffset: -36;
        }
      }


      .edge.preview {
        stroke-dasharray: 6 5;
        stroke-width: 2.2;
        stroke: var(--edge-preview, var(--edge));
        opacity: 0.95;
      }

      .edge.preview.ok {
        stroke: var(--edge-preview-ok);
      }

      .edge.preview.bad {
        stroke: var(--edge-preview-bad);
      }

      .hit {
        pointer-events: stroke;
        fill: none;
        stroke: transparent;
        stroke-width: 22;
        cursor: pointer;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EdgeLayerComponent {
  @Input({ required: true }) nodes: FlowNode[] = [];
  @Input({ required: true }) edges: FlowEdge[] = [];
  @Input({ required: true }) orientation: Orientation = 'LR';
  @Input({ required: true }) selection: Selection = { nodeIds: [], edgeIds: [] };
  @Input({ required: true }) nodeSizes: Record<string, { w: number; h: number }> = {};

  @Input({ required: true }) worldTransform = 'translate(0 0) scale(1)';

  @Input() connecting:
    | null
    | {
      fromNodeId: string;
      toPoint: Pt;
    } = null;

  @Input() previewState: 'none' | 'ok' | 'bad' = 'none';

  @Output() selectEdge = new EventEmitter<string>();

  private nodeById(): Map<string, FlowNode> {
    return new Map(this.nodes.map((n) => [n.id, n]));
  }

  private nodeSize(node: FlowNode): { w: number; h: number } {
    return this.nodeSizes[node.id] ?? { w: NODE_W, h: NODE_H };
  }

  private portPos(node: FlowNode, port: 'in' | 'out'): Pt {
    const x = node.position.x;
    const y = node.position.y;
    const size = this.nodeSize(node);

    if (this.orientation === 'LR') {
      const px = port === 'in' ? x : x + size.w;
      const py = y + size.h / 2;
      return { x: px, y: py };
    } else {
      const px = x + size.w / 2;
      const py = port === 'in' ? y : y + size.h;
      return { x: px, y: py };
    }
  }

  private bezier(a: Pt, b: Pt): string {
    if (this.orientation === 'LR') {
      const dx = clamp(Math.abs(b.x - a.x) * 0.45, 70, 220);
      const c1 = { x: a.x + dx, y: a.y };
      const c2 = { x: b.x - dx, y: b.y };
      return `M ${a.x} ${a.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${b.x} ${b.y}`;
    } else {
      const dy = clamp(Math.abs(b.y - a.y) * 0.45, 70, 220);
      const c1 = { x: a.x, y: a.y + dy };
      const c2 = { x: b.x, y: b.y - dy };
      return `M ${a.x} ${a.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${b.x} ${b.y}`;
    }
  }

  pathForEdge(e: FlowEdge): string {
    const map = this.nodeById();
    const from = map.get(e.from.nodeId);
    const to = map.get(e.to.nodeId);
    if (!from || !to) return '';
    return this.bezier(this.portPos(from, 'out'), this.portPos(to, 'in'));
  }

  previewPath(): string {
    const c = this.connecting;
    if (!c) return '';
    const map = this.nodeById();
    const from = map.get(c.fromNodeId);
    if (!from) return '';
    return this.bezier(this.portPos(from, 'out'), c.toPoint);
  }

  isSelectedEdge(edge: FlowEdge): boolean {
    if (this.selection.edgeIds.includes(edge.id)) return true;
    return this.selection.nodeIds.includes(edge.from.nodeId) && this.selection.nodeIds.includes(edge.to.nodeId);
  }

  edgeStroke(edge: FlowEdge): string {
    return this.isSelectedEdge(edge) ? 'var(--edge-selected)' : 'var(--edge)';
  }

  edgeFilter(edge: FlowEdge): string | null {
    return this.isSelectedEdge(edge) ? 'url(#glow)' : null;
  }

  onEdgeDown(ev: PointerEvent, edgeId: string) {
    ev.stopPropagation();
    ev.preventDefault();
    this.selectEdge.emit(edgeId);
  }
}










