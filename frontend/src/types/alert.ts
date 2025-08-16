export interface Alert {
  id: string;
  name: string;
  location: string; // Coordinates (e.g., "40.7128,-74.0060")
  locationName: string; // Human-readable location name (e.g., "New York, NY")
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
  location: string; // Coordinates
  locationName?: string; // Optional human-readable name
  parameter: string;
  operator: string;
  threshold: number;
  unit: string;
  description?: string;
  isActive?: boolean
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

// export interface AlertWithHistory extends Alert {
//   alertHistory: AlertHistory[];
// }

export interface AlertStatus {
  id: string;
  name: string;
  location: string;
  locationName?: string; // Add locationName for consistency
  parameter: string;
  operator: string; // Add operator field
  threshold: number;
  unit: string;
  description?: string; // Add description field
  isActive: boolean;
  alertHistory: AlertHistory[];
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
