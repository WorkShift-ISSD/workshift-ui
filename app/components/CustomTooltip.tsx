import React from 'react';

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  labelColor?: string;
}

export const CustomTooltip: React.FC<CustomTooltipProps> = ({ 
  active, 
  payload, 
  label, 
  labelColor = '#10B981' 
}) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
      {label && (
        <p className="text-gray-900 dark:text-gray-100 font-bold mb-1">
          {label}
        </p>
      )}
      {payload.map((entry: any, index: number) => (
        <p key={index} className="text-gray-900 dark:text-gray-100 text-sm">
          <span style={{ color: entry.color || labelColor }}>
            {entry.name}
          </span>
          {': '}
          <span className="font-bold">
            {entry.value}
          </span>
        </p>
      ))}
    </div>
  );
};