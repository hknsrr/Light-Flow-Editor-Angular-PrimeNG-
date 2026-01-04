import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FlowStore } from './flow-store.service';
import { NodeType } from './models';

@Component({
  selector: 'app-palette',
  standalone: true,
  template: `
    <div class="wrap">
      <div class="title">Palette</div>
      <div class="sub">Drag onto canvas</div>

      <div class="item" draggable="true" (dragstart)="onDragStart($event, 'DELIVERY')" (dragend)="onDragEnd()">
        <div class="icon">📦</div>
        <div>
          <div class="name">Delivery</div>
          <div class="desc">Campaign + delivery</div>
        </div>
      </div>

      <div class="item" draggable="true" (dragstart)="onDragStart($event, 'TIMER')" (dragend)="onDragEnd()">
        <div class="icon">⏱️</div>
        <div>
          <div class="name">Timer</div>
          <div class="desc">After X units</div>
        </div>
      </div>

      <div class="item" draggable="true" (dragstart)="onDragStart($event, 'EVENT')" (dragend)="onDragEnd()">
        <div class="icon">🟣</div>
        <div>
          <div class="name">Event</div>
          <div class="desc">clicked/opened</div>
        </div>
      </div>

      <div class="footer">
        <div class="tip">Tip: click nodes/edges to select</div>
      </div>
    </div>
  `,
  styles: [
    `
      .wrap {
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .title {
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 0.2px;
      }
      .sub {
        font-size: 12px;
        opacity: 0.75;
        margin-top: -6px;
      }
      .item {
        display: flex;
        gap: 10px;
        align-items: center;
        padding: 10px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.08);
        cursor: grab;
        user-select: none;
      }
      .item:active {
        cursor: grabbing;
      }
      .icon {
        width: 34px;
        height: 34px;
        display: grid;
        place-items: center;
        border-radius: 10px;
        background: rgba(0, 0, 0, 0.25);
        border: 1px solid rgba(255, 255, 255, 0.08);
        font-size: 16px;
      }
      .name {
        font-weight: 700;
        font-size: 13px;
      }
      .desc {
        font-size: 12px;
        opacity: 0.75;
      }
      .footer {
        margin-top: auto;
        padding-top: 8px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
      }
      .tip {
        font-size: 12px;
        opacity: 0.75;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaletteComponent {
  private readonly store = inject(FlowStore);
  onDragStart(ev: DragEvent, type: NodeType) {
    ev.dataTransfer?.setData('application/x-flow-node-type', type);
    ev.dataTransfer?.setData('text/plain', type);
    ev.dataTransfer?.setDragImage?.(new Image(), 0, 0);
    if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'copy';
    this.store.setDraggingType(type);
  }

  onDragEnd() {
    this.store.setDraggingType(null);
  }
}


