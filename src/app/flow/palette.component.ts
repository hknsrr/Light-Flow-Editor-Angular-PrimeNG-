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

      <div class="item delivery" draggable="true" (dragstart)="onDragStart($event, 'DELIVERY')" (dragend)="onDragEnd()">
        <div class="icon"><i class="pi pi-send" aria-hidden="true"></i></div>
        <div>
          <div class="name">Delivery</div>
          <div class="desc">Campaign + delivery</div>
        </div>
      </div>

      <div class="item timer" draggable="true" (dragstart)="onDragStart($event, 'TIMER')" (dragend)="onDragEnd()">
        <div class="icon"><i class="pi pi-clock" aria-hidden="true"></i></div>
        <div>
          <div class="name">Timer</div>
          <div class="desc">After X units</div>
        </div>
      </div>

      <div class="item event" draggable="true" (dragstart)="onDragStart($event, 'EVENT')" (dragend)="onDragEnd()">
        <div class="icon"><i class="pi pi-bolt" aria-hidden="true"></i></div>
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
        background: var(--palette-item-bg);
        border: 1px solid var(--palette-item-border);
        cursor: grab;
        user-select: none;
      }
      .item:active {
        cursor: grabbing;
      }
      .item.delivery {
        border-color: var(--accent-delivery-border);
      }
      .item.timer {
        border-color: var(--accent-timer-border);
      }
      .item.event {
        border-color: var(--accent-event-border);
      }
      .icon {
        width: 34px;
        height: 34px;
        display: grid;
        place-items: center;
        border-radius: 10px;
        background: var(--palette-icon-bg);
        border: 1px solid var(--palette-icon-border);
        font-size: 16px;
        color: var(--text);
      }
      .item.delivery .icon {
        background: var(--accent-delivery-soft);
        border-color: var(--accent-delivery-border);
        color: var(--accent-delivery);
      }
      .item.timer .icon {
        background: var(--accent-timer-soft);
        border-color: var(--accent-timer-border);
        color: var(--accent-timer);
      }
      .item.event .icon {
        background: var(--accent-event-soft);
        border-color: var(--accent-event-border);
        color: var(--accent-event);
      }
      .name {
        font-weight: 700;
        font-size: 13px;
      }
      .item.delivery .name {
        color: var(--accent-delivery);
      }
      .item.timer .name {
        color: var(--accent-timer);
      }
      .item.event .name {
        color: var(--accent-event);
      }
      .desc {
        font-size: 12px;
        opacity: 0.75;
      }
      .footer {
        margin-top: auto;
        padding-top: 8px;
        border-top: 1px solid var(--palette-footer-border);
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
