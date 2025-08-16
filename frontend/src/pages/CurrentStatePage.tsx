import { useQuery } from '@tanstack/react-query';
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Thermometer,
  Wind,
  Droplets,
  Eye,
  Cloud,
  Sun,
  Activity
} from 'lucide-react';
import { getCurrentAlertStatus } from '../services/alertService';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';

const CurrentStatePage = () => {
  const {
    data: alertStatusResponse,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ['alertStatus'],
    queryFn: getCurrentAlertStatus,
    refetchInterval: 30 * 1000, // Refresh every 30 seconds
  });

  const alertStatus = alertStatusResponse?.data || [];
  const triggeredCount = alertStatus.filter(alert => alert.alertHistory?.[0]?.isTriggered).length || 0;
  const totalCount = alertStatusResponse?.count || 0;

  const getParameterIcon = (parameter: string) => {
    const icons: { [key: string]: React.ReactNode } = {
      temperature: <Thermometer className="h-4 w-4 text-red-500" />,
      feelsLike: <Thermometer className="h-4 w-4 text-orange-500" />,
      humidity: <Droplets className="h-4 w-4 text-blue-500" />,
      windSpeed: <Wind className="h-4 w-4 text-gray-500" />,
      windDirection: <Wind className="h-4 w-4 text-gray-500" />,
      precipitation: <Droplets className="h-4 w-4 text-blue-500" />,
      pressure: <Cloud className="h-4 w-4 text-gray-500" />,
      visibility: <Eye className="h-4 w-4 text-blue-500" />,
      uvIndex: <Sun className="h-4 w-4 text-yellow-500" />,
      cloudCover: <Cloud className="h-4 w-4 text-gray-500" />,
    };
    return icons[parameter] || <Activity className="h-4 w-4 text-gray-500" />;
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Failed to load alert status</h2>
        <p className="text-gray-600 mb-4">
          {error instanceof Error ? error.message : 'An unexpected error occurred'}
        </p>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Current Alert Status</h1>
        <p className="text-gray-600">Real-time overview of all weather alerts</p>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="text-3xl font-bold text-gray-900 mb-2">{totalCount}</div>
          <div className="text-gray-600">Total Alerts</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="text-3xl font-bold text-green-600 mb-2">{totalCount - triggeredCount}</div>
          <div className="text-gray-600">Alerts OK</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="text-3xl font-bold text-red-600 mb-2">{triggeredCount}</div>
          <div className="text-gray-600">Alerts Triggered</div>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Activity className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          {isRefetching ? 'Refreshing...' : 'Refresh Status'}
        </button>
      </div>

      {/* All Clear Status */}
      {triggeredCount === 0 && totalCount > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-800 mb-2">All Clear!</h2>
          <p className="text-green-700">
            All {totalCount} weather alerts are currently within normal ranges.
          </p>
        </div>
      )}

      {/* Triggered Alerts */}
      {triggeredCount > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
            Triggered Alerts ({triggeredCount})
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {alertStatus
              .filter(alert => alert.alertHistory?.[0]?.isTriggered)
              .map((alert) => (
                <div
                  key={alert.id}
                  className="bg-red-50 border border-red-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-red-800 mb-2">{alert.name}</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center text-red-700">
                          <MapPin className="h-4 w-4 mr-2" />
                          {alert.locationName || alert.location}
                        </div>
                        <div className="flex items-center text-red-700">
                          {getParameterIcon(alert.parameter)}
                          <span className="ml-2">
                            {getParameterDisplayName(alert.parameter)} {getOperatorSymbol(alert.operator)} {alert.threshold} {alert.unit}
                          </span>
                        </div>
                        {alert.alertHistory.length > 0 && (
                          <div className="flex items-center text-red-600">
                            <Clock className="h-4 w-4 mr-2" />
                            <span>
                              Last evaluated {formatDistanceToNow(new Date(alert.alertHistory[0].timestamp), { addSuffix: true })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        TRIGGERED
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* All Active Alerts Status */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">All Active Alerts Status</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Alert
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Condition
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Evaluation
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {alertStatus.map((alert) => (
                  <tr key={alert.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          {getParameterIcon(alert.parameter)}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{alert.name}</div>
                          <div className="text-sm text-gray-500">{alert.description || 'No description'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{alert.locationName || alert.location}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {getParameterDisplayName(alert.parameter)} {getOperatorSymbol(alert.operator)} {alert.threshold} {alert.unit}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {alert.alertHistory?.[0]?.isTriggered ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Triggered
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          OK
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {alert.alertHistory.length > 0 ? (
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {formatDistanceToNow(new Date(alert.alertHistory[0].timestamp), { addSuffix: true })}
                        </div>
                      ) : (
                        'Never'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* No Alerts Message */}
      {totalCount === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No alerts configured</h3>
          <p className="text-gray-500">
            Create your first weather alert to start monitoring weather conditions.
          </p>
        </div>
      )}
    </div>
  );
};

export default CurrentStatePage;
