import React, { useState, useEffect } from 'react';
import { BarChart3, Download, Loader2, ArrowRight } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [maintenanceData, setMaintenanceData] = useState([]);
  const [visitorData, setVisitorData] = useState([]);
  const [complaintData, setComplaintData] = useState([]);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        const [complaintsRes, visitorsRes, maintenanceRes] = await Promise.all([
          axios.get('/api/admin/complaints').catch(() => ({ data: { data: [] } })),
          axios.get('/api/admin/visitors').catch(() => ({ data: { data: [] } })),
          axios.get('/api/admin/maintenance').catch(() => ({ data: { data: [] } }))
        ]);
        
        setComplaintData(Array.isArray(complaintsRes.data.data) ? complaintsRes.data.data : []);
        setVisitorData(Array.isArray(visitorsRes.data.data) ? visitorsRes.data.data : []);
        setMaintenanceData(Array.isArray(maintenanceRes.data.data) ? maintenanceRes.data.data : []);
      } catch (err) {
        setError('Failed to load report data.');
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  // Aggregations
  const complaintsByStatus = complaintData.reduce((acc, curr) => {
    const status = curr.status || 'open';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const complaintsChart = Object.keys(complaintsByStatus).map(key => ({
    name: key.toUpperCase(),
    value: complaintsByStatus[key]
  }));

  const maintenanceTotal = maintenanceData.reduce((acc, curr) => {
    const status = curr.status || 'pending';
    acc[status] = (acc[status] || 0) + parseFloat(curr.amount || 0);
    return acc;
  }, { paid: 0, pending: 0 });

  const exportCSV = (data, filename) => {
    if (!data.length) return alert('No data to export');
    const headers = Object.keys(data[0]).join(',');
    const csv = data.map(row => Object.values(row).map(val => `"${val || ''}"`).join(',')).join('\n');
    const blob = new Blob([`${headers}\n${csv}`], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
  };

  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

  return (
    <PageLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Society Reports</h1>
            <p className="text-slate-500 text-sm">Analytics and data exports</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : error ? (
        <div className="py-20 text-center text-rose-500 font-medium">{error}</div>
      ) : (
        <div className="space-y-6">
          
          {/* Top KPI Cards for quick view */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <div>
                   <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-1">Total Collections</p>
                   <h2 className="text-3xl font-black text-slate-900">₹{maintenanceTotal.paid.toLocaleString()}</h2>
                   <p className="text-sm text-amber-600 mt-2 font-medium">₹{maintenanceTotal.pending.toLocaleString()} Pending</p>
                </div>
             </div>
             <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <div>
                   <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-1">Complaints Open</p>
                   <h2 className="text-3xl font-black text-rose-600">{complaintsByStatus['open'] || 0}</h2>
                   <p className="text-sm text-slate-500 mt-2 font-medium">{complaintsByStatus['resolved'] || 0} Resolved globally</p>
                </div>
             </div>
             <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <div>
                   <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-1">Visitors Tracked</p>
                   <h2 className="text-3xl font-black text-slate-900">{visitorData.length}</h2>
                   <p className="text-sm text-slate-500 mt-2 font-medium">In latest logs</p>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Charts */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-6">Complaints Breakdown</h3>
              <div className="h-64">
                {complaintsChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={complaintsChart} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {complaintsChart.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">No complaints data</div>
                )}
              </div>
            </div>

            {/* Export Actions */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-6">Data Exports</h3>
              <div className="space-y-3">
                
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors group">
                  <div>
                    <h4 className="font-bold text-slate-800">Maintenance Records</h4>
                    <p className="text-xs text-slate-500 mt-1">Export all billing & payment logs</p>
                  </div>
                  <button onClick={() => exportCSV(maintenanceData, 'maintenance_report')} className="p-2.5 bg-white shadow-sm border border-slate-200 rounded-lg text-slate-700 hover:text-blue-600 transition-colors group-hover:scale-105">
                    <Download className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors group">
                  <div>
                    <h4 className="font-bold text-slate-800">Visitor Logs</h4>
                    <p className="text-xs text-slate-500 mt-1">Export all gate entries & exits</p>
                  </div>
                  <button onClick={() => exportCSV(visitorData, 'visitor_report')} className="p-2.5 bg-white shadow-sm border border-slate-200 rounded-lg text-slate-700 hover:text-blue-600 transition-colors group-hover:scale-105">
                    <Download className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors group">
                  <div>
                    <h4 className="font-bold text-slate-800">Complaints Summary</h4>
                    <p className="text-xs text-slate-500 mt-1">Export all ticket history</p>
                  </div>
                  <button onClick={() => exportCSV(complaintData, 'complaints_report')} className="p-2.5 bg-white shadow-sm border border-slate-200 rounded-lg text-slate-700 hover:text-blue-600 transition-colors group-hover:scale-105">
                    <Download className="w-5 h-5" />
                  </button>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}
    </PageLayout>
  );
}
