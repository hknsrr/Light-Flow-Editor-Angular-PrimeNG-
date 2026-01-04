export type Orientation = 'LR' | 'TB';
export type NodeType = 'DELIVERY' | 'TIMER' | 'EVENT';

export const NODE_W = 240;
export const NODE_H = 150;

export type PortName = 'in' | 'out';

export interface Viewport {
  panX: number;
  panY: number;
  zoom: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface DeliveryNodeData {
  campaignId: string | null;
  deliveryId: string | null;
}

export type TimerUnit = 'minutes' | 'hours' | 'days' | 'months';

export interface TimerNodeData {
  value: number;
  unit: TimerUnit;
}

export interface EventNodeData {
  eventType: 'clicked' | 'opened';
}

export type NodeData = DeliveryNodeData | TimerNodeData | EventNodeData;

export interface FlowNode {
  id: string;
  type: NodeType;
  position: Position;
  data: NodeData;
}

export interface FlowEdge {
  id: string;
  from: { nodeId: string; port: 'out' };
  to: { nodeId: string; port: 'in' };
}

export type Selection = {
  nodeIds: string[];
  edgeIds: string[];
};

export interface WorkflowJson {
  version: 1;
  orientation: Orientation;
  viewport: Viewport;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface ValidationError {
  id: string;
  message: string;
}

export interface CatalogCampaign {
  id: string;
  name: string;
}

export interface CatalogDelivery {
  id: string;
  name: string;
}

export const MOCK_CAMPAIGNS: CatalogCampaign[] = [
  { id: 'C1', name: 'Winter Campaign' },
  { id: 'C2', name: 'Spring Campaign' }
];

export const MOCK_DELIVERIES_BY_CAMPAIGN: Record<string, CatalogDelivery[]> = {
  C1: [
    { id: 'D1', name: 'Email Delivery' },
    { id: 'D2', name: 'SMS Delivery' }
  ],
  C2: [
    { id: 'D3', name: 'Push Delivery' },
    { id: 'D4', name: 'In-App Delivery' },
    { id: 'D5', name: 'Email Delivery' }
  ]
};




