import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PanelModule } from 'primeng/panel';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { FlowStore } from './flow-store.service';

@Component({
  selector: 'app-debug-panel',
  standalone: true,
  imports: [CommonModule, PanelModule, ButtonModule],
  template: `
    <p-panel header="Workflow JSON (Live)" [toggleable]="false" styleClass="panel">
      <div class="actions">
        <button pButton type="button" label="Copy JSON" icon="pi pi-copy" (click)="copy()" class="p-button-sm"></button>
        <button
          pButton
          type="button"
          label="Validate"
          icon="pi pi-check-circle"
          (click)="validate()"
          class="p-button-sm p-button-secondary"
        ></button>
      </div>

      <div class="content">
        <pre class="json">{{ store.workflowJson() }}</pre>
      </div>

      <div class="errors" *ngIf="store.validationErrors().length > 0">
        <div class="errorsTitle">Validation Errors</div>
        <ul>
          <li *ngFor="let e of store.validationErrors()">
            <span class="nid">{{ e.id }}</span> — {{ e.message }}
          </li>
        </ul>
      </div>

      <div class="ok" *ngIf="store.validationErrors().length === 0">
        <span class="dot"></span> Valid ✅
      </div>
    </p-panel>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
      :host ::ng-deep .panel {
        height: 100%;
        background: transparent;
      }
      .actions {
        display: flex;
        gap: 8px;
        margin-bottom: 10px;
      }
      .content {
        height: calc(100% - 110px);
        min-height: 0;
        overflow: auto;
        border-radius: 12px;
        background: rgba(0, 0, 0, 0.25);
        border: 1px solid rgba(255, 255, 255, 0.08);
        padding: 10px;
      }
      .json {
        font-size: 12px;
        line-height: 1.35;
        color: #e5e7eb;
      }
      .errors {
        margin-top: 10px;
        padding: 10px;
        border-radius: 12px;
        background: rgba(239, 68, 68, 0.12);
        border: 1px solid rgba(239, 68, 68, 0.25);
      }
      .errorsTitle {
        font-weight: 700;
        font-size: 13px;
        margin-bottom: 6px;
      }
      ul {
        margin: 0;
        padding-left: 18px;
        font-size: 12px;
      }
      li {
        margin: 4px 0;
      }
      .nid {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New",
          monospace;
        opacity: 0.9;
      }
      .ok {
        margin-top: 10px;
        padding: 10px;
        border-radius: 12px;
        background: rgba(52, 211, 153, 0.12);
        border: 1px solid rgba(52, 211, 153, 0.25);
        font-size: 12px;
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .dot {
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: rgba(52, 211, 153, 1);
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DebugPanelComponent {
  readonly store = inject(FlowStore);
  private readonly toast = inject(MessageService);

  async copy() {
    try {
      await navigator.clipboard.writeText(this.store.workflowJson());
      this.toast.add({ severity: 'success', summary: 'Copied', detail: 'Workflow JSON copied to clipboard', life: 1800 });
    } catch {
      this.toast.add({ severity: 'warn', summary: 'Copy failed', detail: 'Clipboard not available', life: 2200 });
    }
  }

  validate() {
    const errs = this.store.validateNow();
    if (errs.length === 0) {
      this.toast.add({ severity: 'success', summary: 'Valid', detail: 'No validation errors', life: 1600 });
    } else {
      this.toast.add({
        severity: 'error',
        summary: 'Validation errors',
        detail: `${errs.length} issue(s) found`,
        life: 2200
      });
    }
  }
}
