import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  iconBgColor: string;
  iconColor: string;
  valueColor: string;
}

export function StatsCard({ title, value, icon: Icon, iconBgColor, iconColor, valueColor }: StatsCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-2 sm:mb-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">{title}</p>
          <p className={`text-xl sm:text-2xl font-bold ${valueColor} truncate`}>{value}</p>
        </div>
        <div className={`p-2 sm:p-3 ${iconBgColor} rounded-lg ml-2 flex-shrink-0`}>
          <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}