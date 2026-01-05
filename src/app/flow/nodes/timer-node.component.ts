import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { FlowStore } from '../flow-store.service';
import { FlowNode, TimerUnit } from '../models';

@Component({
  selector: 'app-timer-node',
  standalone: true,
  imports: [CommonModule, FormsModule, DropdownModule, InputNumberModule],
  template: `
    <div class="grid">
      <div class="row">
        <label>Value</label>
        <p-inputNumber
          [ngModel]="value"
          (onBlur)="commitValue(pendingValue ?? value)"
          (ngModelChange)="pendingValue = $event"
          [min]="1"
          [useGrouping]="false"
          inputStyleClass="w-full"
          appendTo="body"
        ></p-inputNumber>
      </div>

      <div class="row">
        <label>Unit</label>
        <p-dropdown
          [options]="unitOptions"
          optionLabel="label"
          optionValue="value"
          [ngModel]="unit"
          (onChange)="commitUnit($event.value)"
          styleClass="w-full"
          appendTo="body"
        ></p-dropdown>
      </div>
    </div>

    <div class="label">
      <span class="pill">-></span>
      <span>{{ displayLabel }}</span>
    </div>
  `,
  styles: [
    `
      .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      .row {
        display: grid;
        gap: 6px;
      }
      label {
        font-size: 12px;
        opacity: 0.85;
      }
      .label {
        margin-top: 10px;
        padding: 8px 10px;
        border-radius: 12px;
        background: var(--label-bg);
        border: 1px solid var(--label-border);
        font-size: 12px;
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .pill {
        font-size: 11px;
        padding: 2px 8px;
        border-radius: 999px;
        background: var(--pill-bg);
        border: 1px solid var(--pill-border);
        opacity: 0.9;
      }
      :host ::ng-deep .w-full {
        width: 100%;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimerNodeComponent {
  private readonly store = inject(FlowStore);

  @Input({ required: true }) node!: FlowNode;

  pendingValue: number | null = null;

  unitOptions: Array<{ label: string; value: TimerUnit }> = [
    { label: 'minutes', value: 'minutes' },
    { label: 'hours', value: 'hours' },
    { label: 'days', value: 'days' },
    { label: 'months', value: 'months' }
  ];

  get value(): number {
    const d = this.node.data as any;
    return typeof d.value === 'number' ? d.value : 1;
  }

  get unit(): TimerUnit {
    const d = this.node.data as any;
    return d.unit ?? 'days';
  }

  get displayLabel(): string {
    const v = this.pendingValue ?? this.value;
    const u = this.unit;
    const plural = v === 1 ? u.slice(0, -1) : u;
    return `After ${v} ${plural}`;
  }

  commitValue(val: number) {
    const v = Math.max(1, Math.round(Number(val) || 1));
    this.pendingValue = null;
    this.store.updateNodeData(this.node.id, { value: v }, true);
  }

  commitUnit(u: TimerUnit) {
    this.store.updateNodeData(this.node.id, { unit: u }, true);
  }
}

