import { ReactNode } from 'react';

interface WeatherCardProps {
  title: string;
  children: ReactNode;
  className?: string;
}

const WeatherCard = ({ title, children, className = '' }: WeatherCardProps) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );
};

export default WeatherCard;
