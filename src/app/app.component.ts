import { ChangeDetectionStrategy, Component, HostListener, inject } from '@angular/core';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { FlowStore } from './flow/flow-store.service';
import { PaletteComponent } from './flow/palette.component';
import { ToolbarComponent } from './flow/toolbar.component';
import { FlowCanvasComponent } from './flow/flow-canvas.component';
import { DebugPanelComponent } from './flow/debug-panel.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ToastModule, ConfirmDialogModule, PaletteComponent, ToolbarComponent, FlowCanvasComponent, DebugPanelComponent],
  template: `
    <p-toast></p-toast>
    <p-confirmDialog></p-confirmDialog>

    <div class="app">
      <div class="left">
        <app-palette />
      </div>

      <div class="center">
        <div class="centerHeader">
          <app-toolbar />
        </div>
        <div class="centerBody">
          <app-flow-canvas />
        </div>
      </div>

      <div class="right">
        <app-debug-panel />
      </div>
    </div>
  `,
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  private readonly store = inject(FlowStore);

  @HostListener('window:keydown', ['$event'])
  onKeyDown(ev: KeyboardEvent) {
    const isMac = navigator.platform.toLowerCase().includes('mac');
    const mod = isMac ? ev.metaKey : ev.ctrlKey;

    if (mod && (ev.key === 'z' || ev.key === 'Z')) {
      ev.preventDefault();
      if (ev.shiftKey) this.store.redo();
      else this.store.undo();
      return;
    }

    if (mod && (ev.key === 'y' || ev.key === 'Y')) {
      ev.preventDefault();
      this.store.redo();
      return;
    }

    if (ev.key === 'Delete' || ev.key === 'Backspace') {
      const tag = (ev.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (ev.target as HTMLElement | null)?.isContentEditable) return;
      this.store.deleteSelection();
    }
  }
}

