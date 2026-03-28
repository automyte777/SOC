import React from 'react';

const StatsCard = ({ title, value, icon: Icon, description, trend, trendType }) => {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2.5 bg-slate-50 rounded-xl text-blue-600">
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
            trendType === 'positive' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
          }`}>
            {trend}
          </span>
        )}
      </div>
      <div>
        <h3 className="text-slate-500 text-sm font-medium">{title}</h3>
        <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        <p className="text-xs text-slate-400 mt-2">{description}</p>
      </div>
    </div>
  );
};

export default StatsCard;
