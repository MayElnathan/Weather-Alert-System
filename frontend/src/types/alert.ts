export interface Alert {
  id: string;
  name: string;
  location: string;
  parameter: string;
  operator: string;
  threshold: number;
  unit: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAlertData {
  name: string;
  location: string;
  parameter: string;
  operator: string;
  threshold: number;
  unit: string;
  description?: string;
}

export interface UpdateAlertData {
  id: string;
  data: Partial<CreateAlertData>;
}

export interface AlertHistory {
  id: string;
  alertId: string;
  isTriggered: boolean;
  currentValue?: number;
  thresholdValue: number;
  timestamp: string;
}

export interface AlertWithHistory extends Alert {
  alertHistory: AlertHistory[];
}

export interface AlertStatus {
  id: string;
  name: string;
  location: string;
  parameter: string;
  threshold: number;
  unit: string;
  isActive: boolean;
  lastEvaluation: AlertHistory | null;
  isCurrentlyTriggered: boolean;
}

export interface AlertStatusResponse {
  success: boolean;
  data: AlertStatus[];
  count: number;
  triggeredCount: number;
}

export interface AlertsResponse {
  success: boolean;
  data: Alert[];
  count: number;
}

export interface AlertResponse {
  success: boolean;
  data: Alert;
  message?: string;
}
