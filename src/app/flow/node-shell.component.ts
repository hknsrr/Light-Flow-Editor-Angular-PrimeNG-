import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FlowNode, Orientation } from './models';

@Component({
  selector: 'app-node-shell',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="node"
      [class.sel]="selected"
      [style.transform]="'translate(' + node.position.x + 'px,' + node.position.y + 'px)'"
      (pointerdown)="onNodePointerDown($event)"
    >
      <div class="header node-drag-handle">
        <div class="left">
          <span class="emoji">{{ icon }}</span>
          <span class="title">{{ title }}</span>
        </div>

        <div class="right">
          <span class="id">{{ node.id }}</span>
        </div>
      </div>

      <div
        class="port in"
        [class.lr]="orientation === 'LR'"
        [class.tb]="orientation === 'TB'"
        [class.hover-ok]="connectHover === 'ok'"
        [class.hover-bad]="connectHover === 'bad'"
        title="Input"
        [attr.data-flow-port]="'in'"
        [attr.data-flow-node-id]="node.id"
        (pointerdown)="onInputPortDown($event)"
      ></div>

      <div
        class="port out"
        [class.lr]="orientation === 'LR'"
        [class.tb]="orientation === 'TB'"
        title="Output"
        [attr.data-flow-port]="'out'"
        [attr.data-flow-node-id]="node.id"
        (pointerdown)="onOutputPortDown($event)"
      ></div>

  <div class="body flow-node-content">
  <ng-content></ng-content>
</div>
    </div>
  `,
  styles: [
    `
      .node {
        position: absolute;
        width: 240px;
        min-height: 150px;
        border-radius: 14px;
        background: rgba(15, 23, 42, 0.88);
        border: 1px solid rgba(255, 255, 255, 0.12);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
        overflow: visible;
        user-select: none;
        z-index: 1;
      }

      .node.sel {
        border-color: rgba(52, 211, 153, 0.9);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
        z-index: 5;
      }

      .header {
        height: 38px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 10px;
        background: rgba(255, 255, 255, 0.06);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        cursor: grab;
      }

      .header:active {
        cursor: grabbing;
      }

      .left {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 700;
      }

      .emoji {
        width: 24px;
        height: 24px;
        display: grid;
        place-items: center;
        border-radius: 8px;
        background: rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .title {
        font-size: 13px;
      }

      .id {
        font-size: 11px;
        opacity: 0.7;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
          monospace;
      }

      .body {
        padding: 10px;
        user-select: text;
      }

      .port {
        position: absolute;
        width: 14px;
        height: 14px;
        border-radius: 999px;
        background: rgba(52, 211, 153, 0.95);
        border: 2px solid rgba(0, 0, 0, 0.35);
        box-shadow: 0 6px 14px rgba(0, 0, 0, 0.35);
        cursor: crosshair;
      }

      /* Big hit area */
      .port::after {
        content: '';
        position: absolute;
        inset: -16px;
        border-radius: 999px;
        background: transparent;
      }

      .port.in.lr {
        left: -7px;
        top: calc(50% - 7px);
      }

      .port.out.lr {
        right: -7px;
        top: calc(50% - 7px);
      }

      .port.in.tb {
        top: -7px;
        left: calc(50% - 7px);
      }

      .port.out.tb {
        bottom: -7px;
        left: calc(50% - 7px);
      }

      .port.in.hover-ok {
        box-shadow: 0 0 0 4px rgba(52, 211, 153, 0.35), 0 0 18px rgba(52, 211, 153, 0.65);
      }

      .port.in.hover-bad {
        background: rgba(248, 113, 113, 0.95);
        box-shadow: 0 0 0 4px rgba(248, 113, 113, 0.28), 0 0 18px rgba(248, 113, 113, 0.6);
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NodeShellComponent {
  @Input({ required: true }) node!: FlowNode;
  @Input({ required: true }) orientation: Orientation = 'LR';
  @Input() selected = false;
  @Input() connectHover: 'none' | 'ok' | 'bad' = 'none';

  @Output() selectNode = new EventEmitter<string>();
  @Output() startDrag = new EventEmitter<PointerEvent>();
  @Output() startConnect = new EventEmitter<PointerEvent>();

  get title(): string {
    switch (this.node.type) {
      case 'DELIVERY':
        return 'Delivery';
      case 'TIMER':
        return 'Timer';
      case 'EVENT':
        return 'Event';
    }
  }

  get icon(): string {
    switch (this.node.type) {
      case 'DELIVERY':
        return '📦';
      case 'TIMER':
        return '⏱️';
      case 'EVENT':
        return '🟣';
    }
  }

  onNodePointerDown(ev: PointerEvent) {
    this.selectNode.emit(this.node.id);

    const el = ev.target as HTMLElement;
    if (el.closest('.node-drag-handle')) {
      this.startDrag.emit(ev);
    }
  }

  onOutputPortDown(ev: PointerEvent) {
    ev.stopPropagation();
    ev.preventDefault();
    this.startConnect.emit(ev);
  }

  onInputPortDown(ev: PointerEvent) {
    ev.stopPropagation();
  }
}
