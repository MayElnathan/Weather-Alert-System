import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Save, AlertTriangle } from 'lucide-react';
import { Alert, CreateAlertData } from '../types/alert';

const alertSchema = z.object({
  name: z.string().min(1, 'Alert name is required').max(100, 'Alert name too long'),
  location: z.string().min(1, 'Location is required'),
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

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
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
      setValue('location', alert.location);
      setValue('parameter', alert.parameter);
      setValue('operator', alert.operator);
      setValue('threshold', alert.threshold);
      setValue('unit', alert.unit);
      setValue('description', alert.description || '');
    }
  }, [alert, setValue]);

  const handleFormSubmit = async (data: AlertFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      reset();
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const parameterOptions = [
    { value: 'temperature', label: 'Temperature', unit: 'celsius' },
    { value: 'feelsLike', label: 'Feels Like', unit: 'celsius' },
    { value: 'humidity', label: 'Humidity', unit: '%' },
    { value: 'windSpeed', label: 'Wind Speed', unit: 'm/s' },
    { value: 'windDirection', label: 'Wind Direction', unit: 'degrees' },
    { value: 'precipitation', label: 'Precipitation', unit: 'mm/h' },
    { value: 'pressure', label: 'Pressure', unit: 'hPa' },
    { value: 'visibility', label: 'Visibility', unit: 'km' },
    { value: 'uvIndex', label: 'UV Index', unit: 'index' },
    { value: 'cloudCover', label: 'Cloud Cover', unit: '%' },
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
    const param = parameterOptions.find(p => p.value === parameter);
    return param?.unit || '';
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {alert ? 'Edit Alert' : 'Create New Alert'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isSubmitting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Alert Name */}
          <div>
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
          <div>
            <label htmlFor="location" className="form-label">
              Location *
            </label>
            <input
              {...register('location')}
              type="text"
              id="location"
              className={`input-field ${errors.location ? 'border-red-300' : ''}`}
              placeholder="e.g., New York, NY or 40.7128,-74.0060"
            />
            {errors.location && (
              <p className="mt-1 text-sm text-red-600">{errors.location.message}</p>
            )}
          </div>

          {/* Parameter */}
          <div>
            <label htmlFor="parameter" className="form-label">
              Weather Parameter *
            </label>
            <select
              {...register('parameter')}
              id="parameter"
              className={`input-field ${errors.parameter ? 'border-red-300' : ''}`}
              onChange={(e) => {
                setValue('parameter', e.target.value);
                setValue('unit', getUnitForParameter(e.target.value));
              }}
            >
              {parameterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.parameter && (
              <p className="mt-1 text-sm text-red-600">{errors.parameter.message}</p>
            )}
          </div>

          {/* Operator and Threshold */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="operator" className="form-label">
                Operator *
              </label>
              <select
                {...register('operator')}
                id="operator"
                className={`input-field ${errors.operator ? 'border-red-300' : ''}`}
              >
                {operatorOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.operator && (
                <p className="mt-1 text-sm text-red-600">{errors.operator.message}</p>
              )}
            </div>

            <div>
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
          <div>
            <label htmlFor="unit" className="form-label">
              Unit *
            </label>
            <input
              {...register('unit')}
              type="text"
              id="unit"
              className={`input-field ${errors.unit ? 'border-red-300' : ''}`}
              placeholder="e.g., celsius, m/s, %"
            />
            {errors.unit && (
              <p className="mt-1 text-sm text-red-600">{errors.unit.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="form-label">
              Description
            </label>
            <textarea
              {...register('description')}
              id="description"
              rows={3}
              className="input-field"
              placeholder="Optional description of the alert"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-4">
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
