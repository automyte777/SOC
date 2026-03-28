import React from 'react';

const ActivityTable = ({ activities }) => {
  const formatTime = (timeStr) => {
    const date = new Date(timeStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-50">
        <h3 className="text-lg font-semibold text-slate-800">Recent Activity</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Time</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Event</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {activities.length > 0 ? (
              activities.map((activity, index) => (
                <tr key={index} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                    {formatTime(activity.time)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-800">
                    {activity.event}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      {activity.user}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" className="px-6 py-8 text-center text-slate-400 text-sm">
                  No recent activity found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ActivityTable;
