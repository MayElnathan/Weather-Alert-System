import React from 'react';
import { Edit, Trash2, AlertTriangle, CheckCircle, Power, PowerOff } from 'lucide-react';
import { Alert } from '../types/alert';

interface AlertCardProps {
  alert: Alert;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: (alertId: string, isActive: boolean) => void;
  operatorSymbol: string;
  parameterName: string;
}

/**
 * AlertCard component with toggle functionality for active state
 * 
 * Usage in parent component:
 * ```tsx
 * const handleToggleActive = async (alertId: string, isActive: boolean) => {
 *   try {
 *     await toggleAlertActive(alertId, isActive);
 *     // Refresh alerts or update local state
 *     await fetchAlerts();
 *   } catch (error) {
 *     console.error('Failed to toggle alert:', error);
 *     // Handle error (show toast, etc.)
 *   }
 * };
 * 
 * <AlertCard
 *   alert={alert}
 *   onEdit={() => handleEdit(alert)}
 *   onDelete={() => handleDelete(alert.id)}
 *   onToggleActive={handleToggleActive}
 *   operatorSymbol={getOperatorSymbol(alert.operator)}
 *   parameterName={getParameterName(alert.parameter)}
 * />
 * ```
 */
const AlertCard = ({ alert, onEdit, onDelete, onToggleActive, operatorSymbol, parameterName }: AlertCardProps) => {
  const getParameterIcon = (parameter: string) => {
    const icons: { [key: string]: React.ReactNode } = {
      temperature: <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">🌡️</div>,
      feelsLike: <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">🌡️</div>,
      humidity: <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">💧</div>,
      windSpeed: <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">💨</div>,
      windDirection: <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">🧭</div>,
      precipitation: <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">🌧️</div>,
      pressure: <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">📊</div>,
      visibility: <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">👁️</div>,
      uvIndex: <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">☀️</div>,
      cloudCover: <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">☁️</div>,
    };
    return icons[parameter] || <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">📊</div>;
  };

  const handleToggleActive = () => {
    onToggleActive(alert.id, !alert.isActive);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          {getParameterIcon(alert.parameter)}
          <div className="ml-3">
            <h3 className="text-lg font-semibold text-gray-900">{alert.name}</h3>
            <p className="text-sm text-gray-500">{alert.description || 'No description'}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          {/* Toggle Active Button */}
          <button
            onClick={handleToggleActive}
            className={`p-2 rounded-md transition-colors ${
              alert.isActive
                ? 'text-green-600 hover:text-green-700 hover:bg-green-50'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
            title={alert.isActive ? 'Deactivate alert' : 'Activate alert'}
          >
            {alert.isActive ? (
              <Power className="h-4 w-4" />
            ) : (
              <PowerOff className="h-4 w-4" />
            )}
          </button>
          
          {/* Edit Button */}
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            title="Edit alert"
          >
            <Edit className="h-4 w-4" />
          </button>
          
          {/* Delete Button */}
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            title="Delete alert"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Location</span>
          <span className="text-sm font-medium text-gray-900">{alert.locationName || alert.location}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Parameter</span>
          <span className="text-sm font-medium text-gray-900">{parameterName}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Condition</span>
          <span className="text-sm font-medium text-gray-900">
            {parameterName} {operatorSymbol} {alert.threshold} {alert.unit}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Status</span>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            alert.isActive
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {alert.isActive ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Active
              </>
            ) : (
              <>
                <AlertTriangle className="h-3 w-3 mr-1" />
                Inactive
              </>
            )}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Created</span>
          <span className="text-sm text-gray-500">
            {new Date(alert.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AlertCard;
