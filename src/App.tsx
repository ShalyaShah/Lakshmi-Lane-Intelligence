import React, { useState, useEffect, useRef } from 'react';
import { Upload, Activity, AlertTriangle, CheckCircle, Database, Truck, Map, RefreshCw, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function App() {
  const [metrics, setMetrics] = useState<any>(null);
  const [lanes, setLanes] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [recentShipments, setRecentShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      setMetrics(data.metrics);
      setLanes(data.lanes);
      setAnomalies(data.anomalies);
      setRecentShipments(data.recentShipments);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      // After upload, trigger processing
      setProcessing(true);
      await fetch('/api/process', { method: 'POST' });
      await fetchDashboard();
    } catch (err) {
      console.error(err);
      alert('Error processing file');
    } finally {
      setLoading(false);
      setProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset all data?')) {
      await fetch('/api/reset');
      fetchDashboard();
    }
  };

  const downloadDemoData = () => {
    const csvContent = `origin_city,destination_city,truck_type,shipment_weight,price,timestamp,carrier_name
Mumbai,Bangalore,32ft,15000,45000,2023-10-01T10:00:00Z,FastTrack Logistics
Bombay,Bengaluru,32 ft,15000,45000,2023-10-01T10:05:00Z,FastTrack Logistics
MUMBAI,BANGLORE,32-feet,14500,46000,2023-10-01T11:00:00Z,Speedy Cargo
Delhi,Mumbai,24ft,10000,35000,2023-10-02T09:00:00Z,NorthStar Movers
New Delhi,Bombay,24 ft truck,10000,35500,2023-10-02T09:30:00Z,NorthStar Movers
Chennai,Hyderabad,19ft,8000,25000,2023-10-03T14:00:00Z,South Express
Chennai,Hyderabad,19ft,8000,25000,2023-10-03T14:00:00Z,South Express
Kolkata,Delhi,32ft,16000,55000,2023-10-04T08:00:00Z,EastWest Freight
Kolkata,Delhi,32ft,16000,-5000,2023-10-04T08:00:00Z,Error Carrier
Mumbai,Bangalore,32ft,15000,45500,2023-10-05T10:00:00Z,Reliable Trans`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'demo_shipments.csv';
    a.click();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Lakshmi Lane Intelligence</h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={downloadDemoData}
              className="text-sm font-medium text-slate-600 hover:text-indigo-600 flex items-center gap-1"
            >
              <Download className="w-4 h-4" /> Demo CSV
            </button>
            <button 
              onClick={handleReset}
              className="text-sm font-medium text-slate-600 hover:text-red-600 flex items-center gap-1"
            >
              <RefreshCw className="w-4 h-4" /> Reset
            </button>
            <div className="relative">
              <input 
                type="file" 
                accept=".csv" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || processing}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {loading || processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {loading ? 'Uploading...' : processing ? 'AI Processing...' : 'Upload Data'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Metrics Overview */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard 
            title="Total Processed" 
            value={metrics?.total_processed || 0} 
            icon={<Database className="w-5 h-5 text-blue-500" />}
            trend="Shipments"
          />
          <MetricCard 
            title="Duplicates Removed" 
            value={metrics?.duplicates_removed || 0} 
            icon={<CheckCircle className="w-5 h-5 text-emerald-500" />}
            trend={`${metrics?.total_processed ? Math.round((metrics.duplicates_removed / metrics.total_processed) * 100) : 0}% reduction`}
          />
          <MetricCard 
            title="Anomalies Detected" 
            value={metrics?.anomalies_detected || 0} 
            icon={<AlertTriangle className="w-5 h-5 text-amber-500" />}
            trend="Flagged for review"
          />
          <MetricCard 
            title="Processing Time" 
            value={`${metrics?.processing_time_ms || 0}ms`} 
            icon={<Activity className="w-5 h-5 text-indigo-500" />}
            trend="AI Pipeline Speed"
          />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chart Area */}
          <section className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Map className="w-5 h-5 text-slate-400" />
              Top Logistics Lanes by Volume
            </h2>
            <div className="h-80">
              {lanes.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={lanes} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                    <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis dataKey="lane_id" type="category" width={120} fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip 
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="shipment_count" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={24} name="Shipments" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  Upload data to generate lane analytics
                </div>
              )}
            </div>
          </section>

          {/* Anomalies List */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-5 h-5" />
              Recent Anomalies
            </h2>
            <div className="flex-1 overflow-auto">
              {anomalies.length > 0 ? (
                <div className="space-y-3">
                  {anomalies.map((a, i) => (
                    <div key={i} className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-sm">
                      <div className="font-medium text-amber-900 mb-1">
                        {a.raw_origin} → {a.raw_destination}
                      </div>
                      <div className="text-amber-700 flex justify-between">
                        <span>Price: ₹{a.raw_price}</span>
                        <span>Weight: {a.raw_weight}kg</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  No anomalies detected
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Data Table */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold">Processed Shipments (AI Cleaned)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-3">Raw Input</th>
                  <th className="px-6 py-3">Cleaned Lane</th>
                  <th className="px-6 py-3">Truck Type</th>
                  <th className="px-6 py-3">Price</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {recentShipments.length > 0 ? (
                  recentShipments.map((s, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="text-slate-900">{s.raw_origin} → {s.raw_destination}</div>
                        <div className="text-slate-500 text-xs">{s.raw_truck_type}</div>
                      </td>
                      <td className="px-6 py-4 font-medium text-indigo-600">
                        {s.lane_id}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {s.clean_truck_type}
                      </td>
                      <td className="px-6 py-4 text-slate-900 font-medium">
                        ₹{s.raw_price.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        {s.is_duplicate ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                            Duplicate
                          </span>
                        ) : s.is_anomaly ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            Anomaly
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                            Clean
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                      No data available. Upload a CSV to begin.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </div>
  );
}

function MetricCard({ title, value, icon, trend }: { title: string, value: string | number, icon: React.ReactNode, trend: string }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-500">{title}</h3>
        <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
      </div>
      <div className="text-3xl font-bold text-slate-900 mb-1">{value}</div>
      <div className="text-sm text-slate-500">{trend}</div>
    </div>
  );
}

