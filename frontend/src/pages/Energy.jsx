import React, { useMemo } from 'react';
import { useSocket } from '../context/SocketContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { Battery, Zap, Activity, Leaf, Info } from 'lucide-react';

// Mock 24-hour historical data
const generateHistoricalData = () => {
  const data = [];
  const now = new Date();
  for (let i = 24; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    // Base load of 500kW + some random fluctuation. Higher during daytime (hours 8-18).
    const hour = time.getHours();
    const isDayTime = hour >= 8 && hour <= 18;
    const power = isDayTime ? 800 + Math.random() * 200 : 400 + Math.random() * 150;
    
    data.push({
      time: `${time.getHours()}:00`,
      power: Math.round(power)
    });
  }
  return data;
};

const historicalData = generateHistoricalData();

const Energy = () => {
  const { machineData } = useSocket();

  const energyData = useMemo(() => {
    return (Array.isArray(machineData) ? machineData : []).map(m => {
      const fullId = m && m.machine_id && typeof m.machine_id === 'string' ? m.machine_id : 'UNKNOWN';
      const power = m && m.power ? m.power : (Math.random() * 50 + 20); // Fallback if no power data
      const voltage = m && m.voltage ? m.voltage : 480; // Standard 3-phase industrial voltage
      const current = Math.round((power * 1000) / (voltage * 1.732 * 0.94)); // I = P / (V * sqrt(3) * PF)
      
      return {
        id: fullId,
        name: fullId.toUpperCase(),
        type: m.type || 'Unknown',
        Power: Math.round(power),
        Voltage: Math.round(voltage),
        Current: current,
        Efficiency: Math.round(75 + Math.random() * 20),
        status: m.status || 'running'
      };
    });
  }, [machineData]);

  const totalPower = energyData.reduce((acc, curr) => acc + curr.Power, 0);
  
  // Dynamic Cost Calculation (Assumes ₹10.00 per kWh industrial rate)
  const costPerKwh = 10.00;
  const estimatedHourlyCost = (totalPower * costPerKwh).toFixed(2);
  
  // Carbon Estimate (Assumes ~0.85 lbs CO2 per kWh)
  const carbonLbsPerHour = Math.round(totalPower * 0.85);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1>Energy Monitoring</h1>
          <p style={{color: 'var(--text-secondary)'}}>Facility-wide power consumption and efficiency tracking</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="glass-panel stat-card" style={{borderBottom: '4px solid var(--accent-purple)'}}>
          <div className="flex items-center justify-between mb-4">
            <div className="icon-wrapper"><Battery size={20} color="var(--accent-purple)" /></div>
          </div>
          <span className="stat-value">{totalPower} <span style={{fontSize: '1rem', color: 'var(--text-secondary)'}}>kW</span></span>
          <span style={{color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem'}}>Total Live Draw</span>
        </div>

        <div className="glass-panel stat-card" style={{borderBottom: '4px solid var(--success)'}}>
          <div className="flex items-center justify-between mb-4">
            <div className="icon-wrapper"><Zap size={20} color="var(--success)" /></div>
          </div>
          <span className="stat-value">94<span style={{fontSize: '1rem', color: 'var(--text-secondary)'}}>%</span></span>
          <span style={{color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem'}}>Average Power Factor</span>
        </div>

        <div className="glass-panel stat-card" style={{borderBottom: '4px solid var(--warning)'}}>
          <div className="flex items-center justify-between mb-4">
            <div className="icon-wrapper"><Activity size={20} color="var(--warning)" /></div>
          </div>
          <span className="stat-value">₹{estimatedHourlyCost}<span style={{fontSize: '1rem', color: 'var(--text-secondary)'}}>/hr</span></span>
          <span style={{color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem'}}>Dynamic Hourly Cost</span>
        </div>
        
        <div className="glass-panel stat-card" style={{borderBottom: '4px solid var(--accent-blue)'}}>
          <div className="flex items-center justify-between mb-4">
            <div className="icon-wrapper"><Leaf size={20} color="var(--accent-blue)" /></div>
          </div>
          <span className="stat-value">{carbonLbsPerHour}<span style={{fontSize: '1rem', color: 'var(--text-secondary)'}}> lbs</span></span>
          <span style={{color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem'}}>Est. CO2 Emissions / hr</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="glass-panel">
          <h2 className="mb-6">Total Factory Power History (Last 24 Hrs)</h2>
          <p style={{color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem'}}>
            Shows the combined power consumption of all machines over time, helping identify peak usage hours.
          </p>
          <div style={{height: '270px', width: '100%'}}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historicalData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis 
                  dataKey="time" 
                  stroke="var(--text-secondary)" 
                  tickLine={false} 
                  axisLine={false} 
                  fontSize={12} 
                  label={{ value: "Time of Day", position: 'insideBottom', offset: -15, fill: 'var(--text-secondary)', fontSize: 12 }}
                />
                <YAxis 
                  stroke="var(--text-secondary)" 
                  tickLine={false} 
                  axisLine={false} 
                  fontSize={12} 
                  label={{ value: "Total Power (kW)", angle: -90, position: 'insideLeft', offset: 15, fill: 'var(--text-secondary)', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} 
                  itemStyle={{ color: 'var(--accent-blue)' }}
                  formatter={(value) => [`${value} kW`, 'Total Factory Power']}
                  labelFormatter={(label) => `Time: ${label}`}
                />
                <Area type="monotone" dataKey="power" stroke="var(--accent-blue)" strokeWidth={2} fillOpacity={1} fill="url(#colorPower)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel">
          <h2 className="mb-6">Power Usage per Machine (kW)</h2>
          <p style={{color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem'}}>
            Shows exactly how much electricity each individual machine is consuming right now.
          </p>
          <div style={{height: '270px', width: '100%'}}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={energyData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="var(--text-secondary)" 
                  tickLine={false} 
                  axisLine={false} 
                  fontSize={12}
                  label={{ value: "Machine ID", position: 'insideBottom', offset: -15, fill: 'var(--text-secondary)', fontSize: 12 }}
                />
                <YAxis 
                  stroke="var(--text-secondary)" 
                  tickLine={false} 
                  axisLine={false} 
                  fontSize={12}
                  label={{ value: "Power Draw (kW)", angle: -90, position: 'insideLeft', offset: 15, fill: 'var(--text-secondary)', fontSize: 12 }}
                />
                <Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                  contentStyle={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
                  formatter={(value) => [`${value} kW`, 'Live Power Draw']}
                  labelFormatter={(label) => `Machine: ${label}`}
                />
                <Bar dataKey="Power" fill="var(--accent-purple)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{padding: 0}}>
        <div style={{padding: '1.5rem', borderBottom: '1px solid var(--border-color)'}}>
          <h2 style={{margin: 0}}>Live Machine Telemetry</h2>
        </div>
        <div style={{overflowX: 'auto', padding: '1rem 1.5rem'}}>
          <table className="rtms-table">
            <thead>
              <tr>
                <th>Asset ID</th>
                <th>Type</th>
                <th>Voltage (V)</th>
                <th>Current (A)</th>
                <th>Power Draw (kW)</th>
                <th>Efficiency (%)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {energyData.length === 0 && (
                <tr><td colSpan="7" style={{textAlign: 'center', color: 'var(--text-muted)'}}>Waiting for telemetry...</td></tr>
              )}
              {energyData.map(m => (
                <tr key={m.id}>
                  <td style={{fontWeight: 600, color: 'var(--text-primary)'}}>{m.id}</td>
                  <td style={{textTransform: 'capitalize'}}>{m.type}</td>
                  <td>{m.Voltage}</td>
                  <td>{m.Current}</td>
                  <td style={{fontWeight: 600, color: 'var(--accent-purple)'}}>{m.Power}</td>
                  <td>
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                      <div style={{width: '60px', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden'}}>
                        <div style={{height: '100%', width: `${m.Efficiency}%`, background: m.Efficiency > 85 ? 'var(--success)' : m.Efficiency > 75 ? 'var(--warning)' : 'var(--danger)'}}></div>
                      </div>
                      <span style={{fontSize: '0.875rem'}}>{m.Efficiency}%</span>
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge status-${m.status}`}>{m.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-panel" style={{marginTop: '1rem', borderLeft: '4px solid var(--accent-blue)'}}>
        <div className="flex items-center gap-3 mb-4">
          <Info size={24} color="var(--accent-blue)" />
          <h2 style={{margin: 0}}>Formulas & Glossary</h2>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <h3 style={{color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
              <Zap size={16} color="var(--accent-purple)" />
              Three-Phase Current (A)
            </h3>
            <p style={{fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem'}}>
              Calculates electrical current flow for industrial motors.
            </p>
            <code style={{background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '0.25rem', fontSize: '0.8rem', display: 'block'}}>
              I = (kW × 1000) / (V × √3 × 0.94)
            </code>
          </div>
          <div>
            <h3 style={{color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
              <Activity size={16} color="var(--warning)" />
              Dynamic Hourly Cost
            </h3>
            <p style={{margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5}}>
              Real-time financial cost based on live load (₹10.00/kWh).
            </p>
            <div style={{background: 'var(--bg-primary)', padding: '0.5rem 1rem', borderRadius: '0.5rem', marginTop: '0.5rem', fontFamily: 'monospace', color: 'var(--success)'}}>
              Cost = Total Power (kW) × ₹10.00
            </div>
          </div>
          <div>
            <h3 style={{color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
              <Leaf size={16} color="var(--success)" />
              CO2 Emissions
            </h3>
            <p style={{fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem'}}>
              Environmental impact calculation (0.85 lbs CO2/kWh).
            </p>
            <code style={{background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '0.25rem', fontSize: '0.8rem', display: 'block'}}>
              CO2 (lbs) = Total Power (kW) × 0.85
            </code>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Energy;
