import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { InputSwitchModule } from 'primeng/inputswitch';
import { FlowStore } from './flow-store.service';
import { ConfirmationService } from 'primeng/api';
import { Orientation } from './models';
import { ThemeService } from '../theme.service';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, SelectButtonModule, InputSwitchModule],
  template: `
    <div class="bar" (click)="onToolbarClick($event)">
      <div class="group">
        <button pButton type="button" icon="pi pi-search-minus" (click)="zoomOut()" class="p-button-sm"></button>
        <button pButton type="button" icon="pi pi-search-plus" (click)="zoomIn()" class="p-button-sm"></button>
        <button
          pButton
          type="button"
          label="Fit View"
          icon="pi pi-arrows-alt"
          (click)="fitView()"
          class="p-button-sm p-button-secondary"
        ></button>

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

        <button
          pButton
          type="button"
          label="Clear"
          icon="pi pi-trash"
          (click)="confirmClear()"
          class="p-button-sm p-button-danger"
        ></button>
      </div>

      <div class="group theme-toggle">
        <span>Light mode</span>
        <p-inputSwitch [ngModel]="isLight()" (ngModelChange)="setLight($event)"></p-inputSwitch>
      </div>

      <div class="hint">
        <span class="kbd">Space</span> + drag to pan | Middle mouse drag to pan | Wheel to zoom | Del to delete | Drag to box-select | Drag selected nodes to move together
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
        background: var(--toolbar-bg);
        border: 1px solid var(--toolbar-border);
        backdrop-filter: blur(6px);
      }
      .group {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
      }
      .theme-toggle {
        font-size: 12px;
        opacity: 0.9;
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
        border: 1px solid var(--kbd-border);
        border-bottom-color: var(--kbd-border-strong);
        border-radius: 6px;
        background: var(--kbd-bg);
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
          monospace;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToolbarComponent {
  private readonly confirm = inject(ConfirmationService);
  readonly store = inject(FlowStore);
  readonly theme = inject(ThemeService);

  readonly orientation = this.store.orientation;
  readonly canUndo = this.store.canUndo;
  readonly canRedo = this.store.canRedo;
  readonly isLight = this.theme.isLight;

  private blurTimer: ReturnType<typeof setTimeout> | null = null;

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

  fitView() {
    this.store.requestFitView();
  }

  setOrientation(o: Orientation) {
    this.store.setOrientation(o);
  }

  confirmClear() {
    this.confirm.confirm({
      header: 'Confirm',
      message: 'Clear the canvas? This will remove all nodes and edges.',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Clear',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.clearFlow()
    });
  }

  setLight(isLight: boolean) {
    this.theme.setLight(!!isLight);
  }

  onToolbarClick(ev: MouseEvent) {
    const target = ev.target as HTMLElement | null;
    if (!target) return;
    const focusEl = target.closest('button, input, [tabindex]') as HTMLElement | null;
    if (!focusEl) return;

    if (this.blurTimer) {
      clearTimeout(this.blurTimer);
    }

    this.blurTimer = setTimeout(() => {
      if (document.activeElement === focusEl) {
        focusEl.blur();
      }
      this.blurTimer = null;
    }, 300);
  }
}

