import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, ReferenceArea 
} from 'recharts';
import { AlertTriangle, CheckCircle, Activity } from 'lucide-react';

// --- DATA GENERATION ENGINE ---
const generateHistoricalData = () => {
  const data = [];
  const now = new Date();
  
  for (let i = 60; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60000);
    
    // The Anomaly: Between 40 mins and 10 mins ago, Conekta in MX crashes.
    const isDegraded = i <= 40 && i >= 10; 

    data.push({
      timestamp: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      rawTime: time.getTime(),
      
      // PayU (Colombia) - Healthy
      'PayU_Auth': 80 + Math.random() * 5,
      'PayU_Latency': 800 + Math.random() * 200,
      
      // dLocal (Chile) - Healthy
      'dLocal_Auth': 78 + Math.random() * 6,
      'dLocal_Latency': 900 + Math.random() * 250,
      
      // Conekta (Mexico) - Experiences the Meltdown
      'Conekta_Auth': isDegraded ? 55 + Math.random() * 10 : 82 + Math.random() * 4,
      'Conekta_Latency': isDegraded ? 4500 + Math.random() * 1000 : 850 + Math.random() * 150,
    });
  }
  return data;
};

// --- DASHBOARD COMPONENT ---
export default function App() {
  const [data, setData] = useState([]);
  const [filter, setFilter] = useState('All');

  // Initialize data and set up a simulated live polling interval
  useEffect(() => {
    setData(generateHistoricalData());
    
    const interval = setInterval(() => {
      setData(prevData => {
        const newData = [...prevData.slice(1)]; // Remove oldest minute
        const now = new Date();
        newData.push({
          timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          rawTime: now.getTime(),
          'PayU_Auth': 80 + Math.random() * 5,
          'PayU_Latency': 800 + Math.random() * 200,
          'dLocal_Auth': 78 + Math.random() * 6,
          'dLocal_Latency': 900 + Math.random() * 250,
          'Conekta_Auth': 82 + Math.random() * 4, // Recovered in the present
          'Conekta_Latency': 850 + Math.random() * 150,
        });
        return newData;
      });
    }, 60000); // Updates every minute in real life (set to 2000 for fast demo if needed)

    return () => clearInterval(interval);
  }, []);

  const latestData = data[data.length - 1] || {};

  const processors = [
    { name: 'Conekta', country: 'MX', authKey: 'Conekta_Auth', latKey: 'Conekta_Latency' },
    { name: 'PayU', country: 'CO', authKey: 'PayU_Auth', latKey: 'PayU_Latency' },
    { name: 'dLocal', country: 'CL', authKey: 'dLocal_Auth', latKey: 'dLocal_Latency' }
  ];

  const filteredProcessors = filter === 'All' 
    ? processors 
    : processors.filter(p => p.country === filter);

  // Helper to determine health status colors
  const getHealthStatus = (auth, latency) => {
    if (auth < 65 || latency > 3000) return 'bg-red-900 border-red-500 text-red-100';
    if (auth < 75 || latency > 1500) return 'bg-yellow-900 border-yellow-500 text-yellow-100';
    return 'bg-emerald-900 border-emerald-500 text-emerald-100';
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 font-sans">
      {/* HEADER */}
      <header className="flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Activity className="text-blue-400" size={32} />
            Mercato OpsCenter: Checkout Health
          </h1>
          <p className="text-slate-400 mt-1">Real-time payment orchestration monitoring</p>
        </div>
        
        {/* COUNTRY FILTER */}
        <div className="flex gap-2 bg-slate-800 p-1 rounded-lg">
          {['All', 'MX', 'CO', 'CL'].map(region => (
            <button
              key={region}
              onClick={() => setFilter(region)}
              className={`px-4 py-2 rounded-md font-bold transition-colors ${
                filter === region ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700'
              }`}
            >
              {region}
            </button>
          ))}
        </div>
      </header>

      {/* PROCESSOR HEALTH CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {filteredProcessors.map(proc => {
          const auth = latestData[proc.authKey];
          const lat = latestData[proc.latKey];
          const healthClass = getHealthStatus(auth, lat);
          const isCritical = auth < 65 || lat > 3000;

          return (
            <div key={proc.name} className={`p-6 rounded-xl border-2 ${healthClass} flex flex-col justify-between shadow-lg`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold">{proc.name}</h2>
                  <span className="inline-block px-2 py-1 bg-black/30 rounded text-sm mt-1 font-mono">Region: {proc.country}</span>
                </div>
                {isCritical ? <AlertTriangle size={32} className="text-red-400 animate-pulse" /> : <CheckCircle size={32} className="text-emerald-400" />}
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-black/20 p-3 rounded-lg">
                  <p className="text-sm opacity-80 uppercase tracking-wider">Auth Rate</p>
                  <p className="text-3xl font-mono font-bold">{auth?.toFixed(1)}%</p>
                </div>
                <div className="bg-black/20 p-3 rounded-lg">
                  <p className="text-sm opacity-80 uppercase tracking-wider">Latency</p>
                  <p className="text-3xl font-mono font-bold">{lat?.toFixed(0)}ms</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* TIME SERIES CHART */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
        <h3 className="text-xl font-bold mb-6 text-slate-200">System Telemetry (Last 60 Minutes)</h3>
        <div className="h-[400px] w-full">
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="timestamp" stroke="#94a3b8" tick={{fill: '#94a3b8'}} minTickGap={30} />
              
              {/* Left Y-Axis: Authorization Rate (%) */}
              <YAxis yAxisId="left" domain={[0, 100]} stroke="#94a3b8" tickFormatter={(val) => `${val}%`} />
              
              {/* Right Y-Axis: Latency (ms) */}
              <YAxis yAxisId="right" orientation="right" domain={[0, 6000]} stroke="#94a3b8" tickFormatter={(val) => `${val}ms`} />
              
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f1f5f9' }}
                itemStyle={{ fontWeight: 'bold' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }}/>

              {/* Highlight the Anomaly Region visually */}
              <ReferenceArea yAxisId="left" x1={data[20]?.timestamp} x2={data[50]?.timestamp} fill="#ef4444" fillOpacity={0.1} />

              {/* Render lines based on active filters */}
              {filteredProcessors.map((proc, index) => {
                const colors = ['#3b82f6', '#10b981', '#f59e0b']; // Blue, Green, Amber
                return (
                  <React.Fragment key={proc.name}>
                    <Line yAxisId="left" type="monotone" dataKey={proc.authKey} name={`${proc.name} Auth %`} stroke={colors[index]} strokeWidth={3} dot={false} />
                    <Line yAxisId="right" type="stepAfter" dataKey={proc.latKey} name={`${proc.name} Latency`} stroke={colors[index]} strokeWidth={2} strokeDasharray="5 5" dot={false} opacity={0.6} />
                  </React.Fragment>
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
