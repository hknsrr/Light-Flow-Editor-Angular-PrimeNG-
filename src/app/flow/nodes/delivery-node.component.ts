import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { FlowStore } from '../flow-store.service';
import { FlowNode, MOCK_DELIVERIES_BY_CAMPAIGN } from '../models';

@Component({
  selector: 'app-delivery-node',
  standalone: true,
  imports: [CommonModule, FormsModule, DropdownModule],
  template: `
    <div class="row">
      <label>Campaign</label>
      <p-dropdown
        [options]="campaignOptions"
        optionLabel="name"
        optionValue="id"
        [ngModel]="campaignId"
        (onChange)="onCampaignChange($event.value)"
        placeholder="Select campaign"
        [showClear]="true"
        styleClass="w-full"
        appendTo="body"
      ></p-dropdown>
    </div>

    <div class="row">
      <label>Delivery</label>
      <p-dropdown
        [options]="deliveryOptions"
        optionLabel="name"
        optionValue="id"
        [ngModel]="deliveryId"
        (onChange)="onDeliveryChange($event.value)"
        placeholder="Select delivery"
        [showClear]="true"
        [disabled]="!campaignId"
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
        margin-bottom: 10px;
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
export class DeliveryNodeComponent {
  private readonly store = inject(FlowStore);

  @Input({ required: true }) node!: FlowNode;

  get campaignOptions() {
    return this.store.campaigns();
  }

  get campaignId(): string | null {
    const d = this.node.data as any;
    return d.campaignId ?? null;
  }

  get deliveryId(): string | null {
    const d = this.node.data as any;
    return d.deliveryId ?? null;
  }

  get deliveryOptions() {
    const id = this.campaignId;
    if (!id) return [];
    return MOCK_DELIVERIES_BY_CAMPAIGN[id] ?? [];
  }

  onCampaignChange(campaignId: string | null) {
    this.store.updateNodeData(this.node.id, { campaignId, deliveryId: null }, true);
  }

  onDeliveryChange(deliveryId: string | null) {
    this.store.updateNodeData(this.node.id, { deliveryId }, true);
  }
}
