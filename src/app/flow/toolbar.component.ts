import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { FlowStore } from './flow-store.service';
import { Orientation } from './models';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, SelectButtonModule],
  template: `
    <div class="bar">
      <div class="group">
        <button pButton type="button" icon="pi pi-search-minus" (click)="zoomOut()" class="p-button-sm"></button>
        <button pButton type="button" icon="pi pi-search-plus" (click)="zoomIn()" class="p-button-sm"></button>
        <button
          pButton
          type="button"
          label="Reset View"
          (click)="resetView()"
          class="p-button-sm p-button-secondary"
        ></button>
      </div>

      <div class="group">
        <button
          pButton
          type="button"
          icon="pi pi-undo"
          (click)="store.undo()"
          [disabled]="!canUndo()"
          class="p-button-sm p-button-secondary"
        ></button>
        <button
          pButton
          type="button"
          icon="pi pi-refresh"
          (click)="store.redo()"
          [disabled]="!canRedo()"
          class="p-button-sm p-button-secondary"
        ></button>
      </div>

      <div class="group">
        <p-selectButton
          [options]="orientationOptions"
          [ngModel]="orientation()"
          (ngModelChange)="setOrientation($event)"
          optionLabel="label"
          optionValue="value"
        ></p-selectButton>

        <button
          pButton
          type="button"
          label="Auto Arrange"
          icon="pi pi-sitemap"
          (click)="store.autoArrange()"
          class="p-button-sm p-button-secondary"
        ></button>
      </div>

      <div class="hint">
        <span class="kbd">Space</span> + drag to pan | Middle mouse drag to pan | Wheel to zoom | Del to delete | Drag to box-select and delete
      </div>
    </div>
  `,
  styles: [
    `
      .bar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 10px;
        padding: 8px;
        border-radius: 12px;
        background: rgba(0, 0, 0, 0.35);
        border: 1px solid rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(6px);
      }
      .group {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
      }
      .hint {
        margin-left: 0;
        font-size: 12px;
        opacity: 0.85;
        white-space: normal;
        min-width: 0;
        max-width: 100%;
        line-height: 1.35;
        text-align: left;
        flex: 1 1 100%;
      }
      .kbd {
        display: inline-block;
        padding: 1px 6px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-bottom-color: rgba(255, 255, 255, 0.25);
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.06);
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
          monospace;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToolbarComponent {
  readonly store = inject(FlowStore);

  readonly orientation = this.store.orientation;
  readonly canUndo = this.store.canUndo;
  readonly canRedo = this.store.canRedo;

  orientationOptions: Array<{ label: string; value: Orientation }> = [
    { label: 'LR', value: 'LR' },
    { label: 'TB', value: 'TB' }
  ];

  zoomIn() {
    const vp = this.store.viewport();
    this.store.setViewport({ zoom: Math.min(2.5, +(vp.zoom * 1.12).toFixed(3)) }, true);
  }

  zoomOut() {
    const vp = this.store.viewport();
    this.store.setViewport({ zoom: Math.max(0.25, +(vp.zoom / 1.12).toFixed(3)) }, true);
  }

  resetView() {
    this.store.setViewport({ panX: 40, panY: 40, zoom: 1 }, true);
  }

  setOrientation(o: Orientation) {
    this.store.setOrientation(o);
  }
}



