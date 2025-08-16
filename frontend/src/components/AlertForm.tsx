import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Save } from 'lucide-react';
import { Alert, CreateAlertData } from '../types/alert';
import { LocationInfo } from '../services/geolocationService';
import LocationAutocomplete from './LocationAutocomplete';
import CustomSelect from './CustomSelect';

const alertSchema = z.object({
  name: z.string().min(1, 'Alert name is required').max(100, 'Alert name too long'),
  location: z.string().min(1, 'Location is required'),
  locationName: z.string().optional(), // Optional human-readable location name
  parameter: z.string().min(1, 'Parameter is required'),
  operator: z.enum(['gt', 'gte', 'lt', 'lte', 'eq', 'ne'], {
    errorMap: () => ({ message: 'Invalid operator' }),
  }),
  threshold: z.number().finite('Threshold must be a valid number'),
  unit: z.string().min(1, 'Unit is required'),
  description: z.string().optional(),
});

type AlertFormData = z.infer<typeof alertSchema>;

interface AlertFormProps {
  alert?: Alert | null;
  onSubmit: (data: CreateAlertData) => void;
  onClose: () => void;
  isLoading?: boolean;
}

const AlertForm = ({ alert, onSubmit, onClose, isLoading = false }: AlertFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLocationCoordinates, setSelectedLocationCoordinates] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<AlertFormData>({
    resolver: zodResolver(alertSchema),
    defaultValues: {
      name: '',
      location: '',
      parameter: 'temperature',
      operator: 'gt',
      threshold: 0,
      unit: 'celsius',
      description: '',
    },
  });

  useEffect(() => {
    if (alert) {
      setValue('name', alert.name);
      setValue('location', alert.locationName || alert.location); // Use locationName if available, fallback to location
      setValue('parameter', alert.parameter);
      setValue('operator', alert.operator as 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne');
      setValue('threshold', alert.threshold);
      setValue('unit', alert.unit);
      setValue('description', alert.description || '');
      
      // Check if the alert location is coordinates and set them
      const coordMatch = alert.location.match(/^(-?\d+\.?\d*),(-?\d+\.?\d*)$/);
      if (coordMatch) {
        setSelectedLocationCoordinates(alert.location);
      }
    } else {
      // Reset form when alert becomes null (after successful update)
      reset();
      setSelectedLocationCoordinates('');
    }
  }, [alert, setValue, reset]);

  const handleFormSubmit = async (data: AlertFormData) => {
    setIsSubmitting(true);
    try {
      // Use coordinates if available, otherwise use the location name
      const locationData = selectedLocationCoordinates || data.location;
      const alertData = {
        ...data,
        location: locationData,
        locationName: data.location, // Store the human-readable location name
      };
      
      await onSubmit(alertData);
      reset();
      setSelectedLocationCoordinates('');
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLocationSelect = (location: LocationInfo) => {
    setSelectedLocationCoordinates(location.coordinates);
  };

  const parameterOptions = [
    { value: 'temperature', label: 'Temperature' },
    { value: 'feelsLike', label: 'Feels Like' },
    { value: 'humidity', label: 'Humidity' },
    { value: 'windSpeed', label: 'Wind Speed' },
    { value: 'windDirection', label: 'Wind Direction' },
    { value: 'precipitation', label: 'Precipitation' },
    { value: 'pressure', label: 'Pressure' },
    { value: 'visibility', label: 'Visibility' },
    { value: 'uvIndex', label: 'UV Index' },
    { value: 'cloudCover', label: 'Cloud Cover' },
  ];

  const operatorOptions = [
    { value: 'gt', label: 'Greater than (>)' },
    { value: 'gte', label: 'Greater than or equal (≥)' },
    { value: 'lt', label: 'Less than (<)' },
    { value: 'lte', label: 'Less than or equal (≤)' },
    { value: 'eq', label: 'Equal (=)' },
    { value: 'ne', label: 'Not equal (≠)' },
  ];

  const getUnitForParameter = (parameter: string) => {
    const unitMap: { [key: string]: string } = {
      'temperature': 'celsius',
      'feelsLike': 'celsius',
      'humidity': '%',
      'windSpeed': 'm/s',
      'windDirection': 'degrees',
      'precipitation': 'mm/h',
      'pressure': 'hPa',
      'visibility': 'km',
      'uvIndex': 'index',
      'cloudCover': '%',
    };
    
    return unitMap[parameter] || '';
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative top-0 mx-auto p-4 md:p-6 border w-[90%] max-w-2xl shadow-lg rounded-lg bg-white">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">
            {alert ? 'Edit Alert' : 'Create New Alert'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-2 flex-1 overflow-y-auto">
          {/* Alert Name */}
          <div className="form-section">
            <label htmlFor="name" className="form-label">
              Alert Name *
            </label>
            <input
              {...register('name')}
              type="text"
              id="name"
              className={`input-field ${errors.name ? 'border-red-300' : ''}`}
              placeholder="e.g., High Temperature Alert"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          {/* Location */}
          <div className="form-section">
            <label htmlFor="location" className="form-label">
              Location *
            </label>
            <LocationAutocomplete
              value={watch('location')}
              onChange={(value) => setValue('location', value)}
              onLocationSelect={handleLocationSelect}
              placeholder="Start typing to search for a location..."
              error={!!errors.location}
            />
            {errors.location && (
              <p className="mt-1 text-sm text-red-600">{errors.location.message}</p>
            )}
            {selectedLocationCoordinates && (
              <p className="mt-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                ✓ Location coordinates captured: {selectedLocationCoordinates}
              </p>
            )}
          </div>

          {/* Parameter */}
          <div className="form-row">
          <div className="form-section">
            <label htmlFor="parameter" className="form-label">
              Weather Parameter *
            </label>
            <CustomSelect
              options={parameterOptions}
              value={watch('parameter')}
              onChange={(value) => {
                setValue('parameter', value);
                setValue('unit', getUnitForParameter(value));
                setValue('operator', value as 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne');
              }}
              placeholder="Select a parameter"
              error={!!errors.parameter}
            />
            {errors.parameter && (
              <p className="mt-1 text-sm text-red-600">{errors.parameter.message}</p>
            )}
          </div>
          
          {/* Unit */}
          <div className="form-section">
            <label htmlFor="unit" className="form-label">
              Unit *
            </label>
            <input
              {...register('unit')}
              type="text"
              id="unit"
              className={`input-field ${errors.unit ? 'border-red-300' : ''}`}
              placeholder="e.g., celsius, m/s, %"
              disabled={true}
            />
            {errors.unit && (
              <p className="mt-1 text-sm text-red-600">{errors.unit.message}</p>
            )}
          </div>
          </div>

          {/* Operator and Threshold */}
          <div className="form-row">
            <div className="form-section">
              <label htmlFor="operator" className="form-label">
                Operator *
              </label>
              <CustomSelect
                options={operatorOptions}
                value={watch('operator')}
                onChange={(value) => setValue('operator', value as 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne')}
                placeholder="Select an operator"
                error={!!errors.operator}
              />
              {errors.operator && (
                <p className="mt-1 text-sm text-red-600">{errors.operator.message}</p>
              )}
            </div>

            <div className="form-section">
              <label htmlFor="threshold" className="form-label">
                Threshold *
              </label>
              <input
                {...register('threshold', { valueAsNumber: true })}
                type="number"
                id="threshold"
                step="0.1"
                className={`input-field ${errors.threshold ? 'border-red-300' : ''}`}
                placeholder="0"
              />
              {errors.threshold && (
                <p className="mt-1 text-sm text-red-600">{errors.threshold.message}</p>
              )}
            </div>
          </div>

          {/* Unit */}

          {/* Description */}
          <div className="form-section">
            <label htmlFor="description" className="form-label">
              Description
            </label>
            <textarea
              {...register('description')}
              id="description"
              rows={3}
              className="input-field resize-none"
              placeholder="Optional description of the alert"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-6 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </div>
              ) : (
                <div className="flex items-center">
                  <Save className="h-4 w-4 mr-2" />
                  {alert ? 'Update Alert' : 'Create Alert'}
                </div>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AlertForm;
