import React, { useState, useEffect, useRef } from 'react';
import { Upload, Activity, AlertTriangle, CheckCircle, Database, Truck, Map as MapIcon, RefreshCw, Download, Settings, X, Lock, BarChart2, Globe } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import LaneMap from './components/LaneMap';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [metrics, setMetrics] = useState<any>(null);
  const [lanes, setLanes] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [recentShipments, setRecentShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [showCityModal, setShowCityModal] = useState(false);
  const [cities, setCities] = useState<string[]>([]);
  const [newCity, setNewCity] = useState('');
  const [viewMode, setViewMode] = useState<'chart' | 'map'>('map');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin') {
      setIsLoggedIn(true);
    } else {
      alert('Invalid credentials. Use admin/admin for demo.');
    }
  };

  const fetchCities = async () => {
    try {
      const res = await fetch('/api/cities');
      const data = await res.json();
      setCities(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCity) return;
    try {
      await fetch('/api/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: newCity })
      });
      setNewCity('');
      fetchCities();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCity = async (city: string) => {
    try {
      await fetch(`/api/cities/${city}`, { method: 'DELETE' });
      fetchCities();
    } catch (err) {
      console.error(err);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch('/api/export');
      const data = await res.json();
      
      if (data.length === 0) {
        alert('No data to export');
        return;
      }
      
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map((row: any) => Object.values(row).map(val => `"${val}"`).join(','));
      const csvContent = [headers, ...rows].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cleaned_shipments.csv';
      a.click();
    } catch (err) {
      console.error(err);
    }
  };

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
    if (isLoggedIn) {
      fetchDashboard();
      fetchCities();
    }
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 w-full max-w-md">
          <div className="flex justify-center mb-6">
            <div className="bg-indigo-600 p-3 rounded-xl">
              <Truck className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center text-slate-900 mb-2">Lakshmi Lane Intelligence</h1>
          <p className="text-center text-slate-500 mb-8">Enterprise Logistics AI Platform</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="admin"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="admin"
              />
            </div>
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors">
              <Lock className="w-4 h-4" /> Sign In
            </button>
          </form>
          <div className="mt-6 text-center text-xs text-slate-400">
            Demo Credentials: admin / admin
          </div>
        </div>
      </div>
    );
  }

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
    const cities = [
      ['Mumbai', 'Bombay', 'MUMBAI'],
      ['Bangalore', 'Bengaluru', 'BANGLORE'],
      ['Delhi', 'New Delhi', 'DELHI'],
      ['Chennai', 'Madras', 'CHENNAI'],
      ['Hyderabad', 'HYDERABAD'],
      ['Kolkata', 'Calcutta', 'KOLKATA'],
      ['Pune', 'Poona', 'PUNE'],
      ['Ahmedabad', 'Ahmadabad', 'AHMEDABAD'],
      ['Jaipur', 'JAIPUR'],
      ['Surat', 'SURAT'],
      ['Lucknow', 'LUCKNOW'],
      ['Kanpur', 'Cawnpore', 'KANPUR'],
      ['Nagpur', 'NAGPUR'],
      ['Indore', 'INDORE'],
      ['Thane', 'THANE']
    ];

    const truckTypes = ['32ft', '32 ft', '32-feet', '24ft', '24 ft truck', '19ft', '19 ft', '14ft', '14 ft'];
    const carriers = ['FastTrack Logistics', 'Speedy Cargo', 'NorthStar Movers', 'South Express', 'EastWest Freight', 'Reliable Trans', 'BlueDart', 'Delhivery', 'Gati', 'VRL Logistics'];

    let csvContent = `origin_city,destination_city,truck_type,shipment_weight,price,timestamp,carrier_name\n`;
    
    // Add some specific edge cases and anomalies
    csvContent += `Mumbai,Bangalore,32ft,15000,45000,2023-10-01T10:00:00Z,FastTrack Logistics\n`;
    csvContent += `Bombay,Bengaluru,32 ft,15000,45000,2023-10-01T10:05:00Z,FastTrack Logistics\n`;
    csvContent += `MUMBAI,BANGLORE,32-feet,14500,46000,2023-10-01T11:00:00Z,Speedy Cargo\n`;
    csvContent += `Delhi,Mumbai,24ft,10000,35000,2023-10-02T09:00:00Z,NorthStar Movers\n`;
    csvContent += `New Delhi,Bombay,24 ft truck,10000,35500,2023-10-02T09:30:00Z,NorthStar Movers\n`;
    csvContent += `Chennai,Hyderabad,19ft,8000,25000,2023-10-03T14:00:00Z,South Express\n`;
    csvContent += `Chennai,Hyderabad,19ft,8000,25000,2023-10-03T14:00:00Z,South Express\n`; // duplicate
    csvContent += `Kolkata,Delhi,32ft,16000,55000,2023-10-04T08:00:00Z,EastWest Freight\n`;
    csvContent += `Kolkata,Delhi,32ft,16000,-5000,2023-10-04T08:00:00Z,Error Carrier\n`; // negative price anomaly
    csvContent += `Mumbai,Bangalore,32ft,15000,45500,2023-10-05T10:00:00Z,Reliable Trans\n`;
    csvContent += `Pune,Surat,14ft,5000,1200000,2023-10-05T12:00:00Z,Scam Logistics\n`; // extremely high price anomaly

    // Generate 1000 more random rows
    for (let i = 0; i < 1000; i++) {
      const originCityGroup = cities[Math.floor(Math.random() * cities.length)];
      let destCityGroup = cities[Math.floor(Math.random() * cities.length)];
      while (destCityGroup === originCityGroup) {
        destCityGroup = cities[Math.floor(Math.random() * cities.length)];
      }

      const origin = originCityGroup[Math.floor(Math.random() * originCityGroup.length)];
      const dest = destCityGroup[Math.floor(Math.random() * destCityGroup.length)];
      const truck = truckTypes[Math.floor(Math.random() * truckTypes.length)];
      const carrier = carriers[Math.floor(Math.random() * carriers.length)];
      
      // Base price and weight on truck type roughly
      let weight = 0;
      let basePrice = 0;
      if (truck.includes('32')) { weight = 15000 + Math.random() * 2000; basePrice = 40000 + Math.random() * 15000; }
      else if (truck.includes('24')) { weight = 9000 + Math.random() * 2000; basePrice = 25000 + Math.random() * 10000; }
      else if (truck.includes('19')) { weight = 7000 + Math.random() * 1500; basePrice = 18000 + Math.random() * 8000; }
      else { weight = 4000 + Math.random() * 1000; basePrice = 10000 + Math.random() * 5000; }

      // Introduce occasional anomalies (1% chance)
      let price = basePrice;
      if (Math.random() < 0.01) {
        price = basePrice * (Math.random() > 0.5 ? 10 : 0.1); // 10x or 0.1x price
      }

      // Introduce occasional duplicates (2% chance)
      const timestamp = new Date(Date.now() - Math.random() * 10000000000).toISOString();
      
      const row = `${origin},${dest},${truck},${Math.round(weight)},${Math.round(price)},${timestamp},${carrier}\n`;
      csvContent += row;
      
      if (Math.random() < 0.02) {
        csvContent += row; // Duplicate
      }
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'demo_shipments_large.csv';
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
              onClick={() => setShowCityModal(true)}
              className="text-sm font-medium text-slate-600 hover:text-indigo-600 flex items-center gap-1"
            >
              <Settings className="w-4 h-4" /> Dictionaries
            </button>
            <button 
              onClick={handleExport}
              className="text-sm font-medium text-slate-600 hover:text-emerald-600 flex items-center gap-1"
            >
              <Download className="w-4 h-4" /> Export Data
            </button>
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
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <MapIcon className="w-5 h-5 text-slate-400" />
                Top Logistics Lanes by Volume
              </h2>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setViewMode('map')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-colors ${viewMode === 'map' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Globe className="w-4 h-4" /> Map
                </button>
                <button
                  onClick={() => setViewMode('chart')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-colors ${viewMode === 'chart' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <BarChart2 className="w-4 h-4" /> Chart
                </button>
              </div>
            </div>
            <div className="h-80">
              {lanes.length > 0 ? (
                viewMode === 'chart' ? (
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
                  <LaneMap lanes={lanes} />
                )
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  Upload data to generate lane analytics
                </div>
              )}
            </div>
          </section>

          {/* Anomalies List */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col h-[414px]">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-amber-700 shrink-0">
              <AlertTriangle className="w-5 h-5" />
              Recent Anomalies
            </h2>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
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
                      {a.anomaly_reason && (
                        <div className="mt-1 text-xs text-amber-800 font-medium bg-amber-100 px-2 py-1 rounded inline-block">
                          {a.anomaly_reason}
                        </div>
                      )}
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

        {/* Optimized Lanes Table */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold">Lane Optimization Intelligence</h2>
            <p className="text-sm text-slate-500 mt-1">AI-recommended carriers and pricing based on historical data.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-3">Lane</th>
                  <th className="px-6 py-3">Shipments</th>
                  <th className="px-6 py-3">Avg Price</th>
                  <th className="px-6 py-3">Best Carrier</th>
                  <th className="px-6 py-3">Optimization Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {lanes.length > 0 ? (
                  lanes.map((l, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {l.lane_id}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {l.shipment_count}
                      </td>
                      <td className="px-6 py-4 text-slate-900 font-medium">
                        ₹{Math.round(l.avg_price).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-indigo-600 font-medium">{l.best_carrier}</div>
                        <div className="text-xs text-slate-500">Best rate: ₹{Math.round(l.best_price).toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-slate-200 rounded-full h-2.5">
                            <div className={`h-2.5 rounded-full ${l.optimization_score > 80 ? 'bg-emerald-500' : l.optimization_score > 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${l.optimization_score}%` }}></div>
                          </div>
                          <span className="text-xs font-medium text-slate-600">{l.optimization_score}/100</span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                      No lane data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

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

        {/* City Dictionary Modal */}
        {showCityModal && (
          <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Database className="w-4 h-4" /> Standard Cities Dictionary
                </h2>
                <button onClick={() => setShowCityModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 border-b border-slate-200">
                <form onSubmit={handleAddCity} className="flex gap-2">
                  <input 
                    type="text" 
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    placeholder="Add new standard city..."
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500"
                  />
                  <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                    Add
                  </button>
                </form>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-2 gap-2">
                  {cities.map(city => (
                    <div key={city} className="flex items-center justify-between bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-sm">
                      <span className="font-medium text-slate-700 truncate">{city}</span>
                      <button onClick={() => handleDeleteCity(city)} className="text-slate-400 hover:text-red-500 ml-2">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

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

