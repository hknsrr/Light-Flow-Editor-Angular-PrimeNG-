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
      [class.delivery]="node.type === 'DELIVERY'"
      [class.timer]="node.type === 'TIMER'"
      [class.event]="node.type === 'EVENT'"
      [style.transform]="'translate(' + node.position.x + 'px,' + node.position.y + 'px)'"
      (pointerdown)="onNodePointerDown($event)"
    >
      <div class="header node-drag-handle">
        <div class="left">
          <span class="emoji"><i [class]="icon" aria-hidden="true"></i></span>
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
        background: var(--node-bg);
        border: 1px solid var(--node-border);
        box-shadow: var(--node-shadow);
        overflow: visible;
        user-select: none;
        z-index: 1;
        --node-accent: var(--accent-delivery);
        --node-accent-soft: var(--accent-delivery-soft);
        --node-accent-border: var(--accent-delivery-border);
      }

      .node.delivery {
        --node-accent: var(--accent-delivery);
        --node-accent-soft: var(--accent-delivery-soft);
        --node-accent-border: var(--accent-delivery-border);
      }

      .node.timer {
        --node-accent: var(--accent-timer);
        --node-accent-soft: var(--accent-timer-soft);
        --node-accent-border: var(--accent-timer-border);
      }

      .node.event {
        --node-accent: var(--accent-event);
        --node-accent-soft: var(--accent-event-soft);
        --node-accent-border: var(--accent-event-border);
      }

      .node.sel {
        border-color: var(--node-selected-border);
        box-shadow: var(--node-selected-shadow);
        z-index: 5;
      }

      .header {
        height: 38px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 10px;
        background: linear-gradient(135deg, var(--node-accent-soft), var(--node-header-bg));
        border-bottom: 1px solid var(--node-accent-border);
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
        background: var(--node-accent-soft);
        border: 1px solid var(--node-accent-border);
        color: var(--node-accent);
      }

      .emoji i {
        font-size: 13px;
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
        background: var(--port-bg);
        border: 2px solid var(--port-border);
        box-shadow: var(--port-shadow);
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
        box-shadow: var(--port-hover-ok-shadow);
      }

      .port.in.hover-bad {
        background: var(--port-hover-bad-bg);
        box-shadow: var(--port-hover-bad-shadow);
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
        return 'pi pi-send';
      case 'TIMER':
        return 'pi pi-clock';
      case 'EVENT':
        return 'pi pi-bolt';
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
