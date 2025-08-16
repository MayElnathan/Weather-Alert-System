import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, AlertTriangle } from 'lucide-react';
import { getAlerts, createAlert, updateAlert, deleteAlert, toggleAlertActive } from '../services/alertService';
import { Alert, CreateAlertData } from '../types/alert';
import AlertForm from '../components/AlertForm';
import AlertCard from '../components/AlertCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast } from 'react-hot-toast';

const AlertsPage = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const queryClient = useQueryClient();

  // Fetch alerts
  const {
    data: alertsResponse,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['alerts', filterActive],
    queryFn: () => getAlerts({ active: filterActive === null ? undefined : filterActive }),
  });

  // Create alert mutation
  const createAlertMutation = useMutation({
    mutationFn: createAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      setIsFormOpen(false);
      toast.success('Alert created successfully!');
    },
    onError: error => {
      toast.error(
        `Failed to create alert: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    },
  });

  // Update alert mutation
  const updateAlertMutation = useMutation({
    mutationFn: updateAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      setEditingAlert(null);
      setIsFormOpen(false); // Close the form after successful update
      toast.success('Alert updated successfully!');
    },
    onError: error => {
      toast.error(
        `Failed to update alert: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    },
  });

  // Delete alert mutation
  const deleteAlertMutation = useMutation({
    mutationFn: deleteAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast.success('Alert deleted successfully!');
    },
    onError: error => {
      toast.error(
        `Failed to delete alert: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    },
  });

  // Toggle alert active state mutation
  const toggleAlertMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => toggleAlertActive(id, isActive),
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast.success(`Alert ${isActive ? 'activated' : 'deactivated'} successfully!`);
    },
    onError: error => {
      toast.error(
        `Failed to toggle alert: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    },
  });

  const alerts = alertsResponse?.data || [];

  const handleCreateAlert = (data: CreateAlertData) => {
    createAlertMutation.mutate(data);
  };

  const handleUpdateAlert = (id: string, data: Partial<CreateAlertData>) => {
    updateAlertMutation.mutate({ id, data });
  };

  const handleDeleteAlert = (id: string) => {
    if (window.confirm('Are you sure you want to delete this alert?')) {
      deleteAlertMutation.mutate(id);
    }
  };

  const handleToggleActive = (alertId: string, isActive: boolean) => {
    toggleAlertMutation.mutate({ id: alertId, isActive });
  };

  const handleEditAlert = (alert: Alert) => {
    setEditingAlert(alert);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingAlert(null);
  };

  const getOperatorSymbol = (operator: string) => {
    const symbols: { [key: string]: string } = {
      gt: '>',
      gte: '≥',
      lt: '<',
      lte: '≤',
      eq: '=',
      ne: '≠',
    };
    return symbols[operator] || operator;
  };

  const getParameterDisplayName = (parameter: string) => {
    const names: { [key: string]: string } = {
      temperature: 'Temperature',
      feelsLike: 'Feels Like',
      humidity: 'Humidity',
      windSpeed: 'Wind Speed',
      windDirection: 'Wind Direction',
      precipitation: 'Precipitation',
      pressure: 'Pressure',
      visibility: 'Visibility',
      uvIndex: 'UV Index',
      cloudCover: 'Cloud Cover',
    };
    return names[parameter] || parameter;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Failed to load alerts</h2>
        <p className="text-gray-600">
          {error instanceof Error ? error.message : 'An unexpected error occurred'}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Weather Alerts</h1>
            <p className="text-gray-600">Create and manage weather monitoring alerts</p>
          </div>
          <button
            onClick={() => setIsFormOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Alert
          </button>
        </div>

        {/* Filter Controls */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Filter by status:</span>
            <div className="flex space-x-2">
              <button
                onClick={() => setFilterActive(null)}
                className={`px-3 py-1 text-sm rounded-md ${
                  filterActive === null
                    ? 'bg-primary-100 text-primary-700 border border-primary-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterActive(true)}
                className={`px-3 py-1 text-sm rounded-md ${
                  filterActive === true
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setFilterActive(false)}
                className={`px-3 py-1 text-sm rounded-md ${
                  filterActive === false
                    ? 'bg-red-100 text-red-700 border border-red-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Inactive
              </button>
            </div>
          </div>
        </div>

        {/* Alerts List */}
        {alerts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No alerts found</h3>
            <p className="text-gray-500 mb-4">
              {filterActive === null
                ? 'Create your first weather alert to get started.'
                : filterActive
                  ? 'No active alerts found.'
                  : 'No inactive alerts found.'}
            </p>
            {filterActive !== false && (
              <button
                onClick={() => setIsFormOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Alert
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {alerts.map(alert => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onEdit={() => handleEditAlert(alert)}
                onDelete={() => handleDeleteAlert(alert.id)}
                onToggleActive={handleToggleActive}
                operatorSymbol={getOperatorSymbol(alert.operator)}
                parameterName={getParameterDisplayName(alert.parameter)}
              />
            ))}
          </div>
        )}
      </div>
      {/* Alert Form Modal */}
      {isFormOpen && (
        <AlertForm
          alert={editingAlert}
          onSubmit={editingAlert 
            ? (data: CreateAlertData) => handleUpdateAlert(editingAlert.id, data)
            : handleCreateAlert
          }
          onClose={handleCloseForm}
          isLoading={createAlertMutation.isPending || updateAlertMutation.isPending}
        />
      )}
    </div>
  );
};

export default AlertsPage;
