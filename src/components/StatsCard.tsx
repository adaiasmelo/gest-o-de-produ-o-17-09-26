
import React from 'react';

interface StatsCardProps {
  label: string;
  value: string | number;
  sublabel: string;
  borderColor: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ label, value, sublabel, borderColor }) => {
  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm border-2 ${borderColor} flex flex-col justify-between h-full`}>
      <div>
        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</h4>
        <p className="text-xl font-bold text-slate-800 mt-1">
          {typeof value === 'number' && isNaN(value) ? 'NaN' : value}
        </p>
      </div>
      <p className="text-[10px] text-blue-500 font-medium mt-1">{sublabel}</p>
    </div>
  );
};

export default StatsCard;
