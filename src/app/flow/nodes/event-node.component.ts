import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { FlowStore } from '../flow-store.service';
import { FlowNode } from '../models';

@Component({
  selector: 'app-event-node',
  standalone: true,
  imports: [CommonModule, FormsModule, DropdownModule],
  template: `
    <div class="row">
      <label>Event Type</label>
      <p-dropdown
        [options]="eventOptions"
        optionLabel="label"
        optionValue="value"
        [ngModel]="eventType"
        (onChange)="commit($event.value)"
        placeholder="Select event"
        styleClass="w-full"
        appendTo="body"
      ></p-dropdown>
    </div>
  `,
  styles: [
    `
      .row {
        display: grid;
        gap: 6px;
      }
      label {
        font-size: 12px;
        opacity: 0.85;
      }
      :host ::ng-deep .w-full {
        width: 100%;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventNodeComponent {
  private readonly store = inject(FlowStore);

  @Input({ required: true }) node!: FlowNode;

  eventOptions = [
    { label: 'clicked', value: 'clicked' },
    { label: 'opened', value: 'opened' }
  ];

  get eventType(): 'clicked' | 'opened' {
    const d = this.node.data as any;
    return d.eventType ?? 'clicked';
  }

  commit(v: 'clicked' | 'opened') {
    this.store.updateNodeData(this.node.id, { eventType: v }, true);
  }
}
