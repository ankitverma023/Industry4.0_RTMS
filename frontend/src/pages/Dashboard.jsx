import React, { useMemo, useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend, ComposedChart, Line } from 'recharts';
import { Activity, AlertTriangle, Zap, Server, TrendingUp, TrendingDown, Target, IndianRupee, Map, Grid, CheckCircle, ShieldCheck, X } from 'lucide-react';
import { calculateHealthScore } from '../utils/healthUtils';

const Dashboard = () => {
  const { machineData, productionData } = useSocket();

  // --- Live Events Feed State ---
  const [liveEvents, setLiveEvents] = useState([]);

  useEffect(() => {
    if (!machineData || !Array.isArray(machineData)) return;
    machineData.forEach(m => {
      if (!m || !m.machine_id) return;
      const health = calculateHealthScore(m);
      if (health < 50 || m.status === 'Fault') {
        setLiveEvents(prev => {
          const newEvent = { id: Date.now() + '_' + m.machine_id + '_' + Math.random().toString(36).substr(2, 9), machine_id: m.machine_id, msg: `Critical fault. Temp: ${Math.round(m.temperature)}°C`, type: 'danger', time: new Date().toLocaleTimeString() };
          if (prev.length > 0 && prev[0].machine_id === m.machine_id && prev[0].type === 'danger') return prev;
          return [newEvent, ...prev].slice(0, 50);
        });
      } else if (health < 80 || m.status === 'Warning') {
        setLiveEvents(prev => {
          const newEvent = { id: Date.now() + '_' + m.machine_id + '_' + Math.random().toString(36).substr(2, 9), machine_id: m.machine_id, msg: `Degradation Warning. Vib: ${Number(m.vibration || 0).toFixed(1)}G`, type: 'warning', time: new Date().toLocaleTimeString() };
          if (prev.length > 0 && prev[0].machine_id === m.machine_id && prev[0].type === 'warning') return prev;
          return [newEvent, ...prev].slice(0, 50);
        });
      }
    });
  }, [machineData]);

  // --- Production Stats from Real Backend ---
  const productionArray = useMemo(() => {
    if (!productionData || !Array.isArray(productionData)) return [];
    
    // Group all work orders by machine_id to show on the dashboard chart
    const stats = {};
    productionData.forEach(order => {
      const mId = order.machine_id;
      if (!stats[mId]) {
        stats[mId] = { 
          name: mId.toUpperCase(), 
          Input: 0, 
          Output: 0, 
          Defects: 0,
          Target: 0
        };
      }
      // Input is the total amount of raw material processed so far
      stats[mId].Input += (order.completed + order.defects);
      // Output is the actual good yield
      stats[mId].Output += order.completed;
      // Defects are scrapped parts
      stats[mId].Defects += order.defects;
      // Target is the goal
      stats[mId].Target += order.target_quantity;
    });
    
    return Object.values(stats);
  }, [productionData]);


  // --- System Stats for KPIs ---
  const stats = useMemo(() => {
    if (!machineData || !Array.isArray(machineData) || machineData.length === 0) return { total: 0, fault: 0, health: 0 };
    let fault = 0, totalHealth = 0;
    machineData.forEach(m => {
      const health = calculateHealthScore(m);
      if (health <= 50 || m.status === 'Fault') fault++;
      totalHealth += health;
    });
    return {
      total: machineData.length,
      fault,
      health: Math.round(totalHealth / machineData.length)
    };
  }, [machineData]);

  // --- Mini Map Positions ---
  const floorPositions = useMemo(() => {
    const saved = localStorage.getItem('rtms_floor_positions');
    return saved ? JSON.parse(saved) : {};
  }, []);

  const getMachinePosition = (id, index) => {
    if (floorPositions[id]) return floorPositions[id];
    return { x: 15 + ((index % 3) * 35), y: 20 + (Math.floor(index / 3) * 35) };
  };

  // --- Chart Data ---
  const telemetryData = useMemo(() => {
    return (Array.isArray(machineData) ? machineData : []).map(m => ({
      name: m && m.machine_id ? String(m.machine_id).toUpperCase() : 'UNK',
      Temperature: m && m.temperature ? Math.round(m.temperature) : 0,
      Vibration: m && m.vibration ? parseFloat(Number(m.vibration).toFixed(1)) : 0
    }));
  }, [machineData]);



  // --- Matrix Selection State ---
  const [selectedMatrixId, setSelectedMatrixId] = useState(null);
  const selectedMatrixMachine = Array.isArray(machineData) ? machineData.find(m => m.machine_id === selectedMatrixId) : null;

  // --- KPI Card Component ---
  const KPICard = ({ title, value, icon: Icon, color, trendDir, trendVal }) => (
    <div className="glass-panel stat-card" style={{padding: '1rem', borderTop: `3px solid ${color}`}}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} color={color} opacity={0.8} />
        <span style={{fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600}}>{title}</span>
      </div>
      <div className="flex items-end justify-between">
        <span style={{fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1}}>{value}</span>
        <div style={{display: 'flex', alignItems: 'center', gap: '0.25rem', color: trendDir === 'up' ? 'var(--success)' : trendDir === 'down_bad' ? 'var(--danger)' : 'var(--success)', fontSize: '0.75rem', fontWeight: 700}}>
           {trendDir === 'up' || trendDir === 'up_good' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
           {trendVal}
        </div>
      </div>
      <div style={{fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'right'}}>vs Last Week</div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      
      {/* MATRIX INSPECTION MODAL */}
      {selectedMatrixMachine && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000, 
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={() => setSelectedMatrixId(null)}>
          <div className="glass-panel" style={{width: '400px', animation: 'fadeIn 0.2s ease-out'}} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 style={{margin: 0, textTransform: 'uppercase'}}>{selectedMatrixMachine.machine_id}</h2>
              <button onClick={() => setSelectedMatrixId(null)} style={{background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0}}>
                <X size={24} />
              </button>
            </div>
            
            <div style={{display: 'inline-flex', padding: '0.35rem 1rem', background: selectedMatrixMachine.status === 'Fault' ? 'rgba(239, 68, 68, 0.15)' : selectedMatrixMachine.status === 'Warning' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: selectedMatrixMachine.status === 'Fault' ? 'var(--danger)' : selectedMatrixMachine.status === 'Warning' ? 'var(--warning)' : 'var(--success)', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '2rem', border: `1px solid ${selectedMatrixMachine.status === 'Fault' ? 'var(--danger)' : selectedMatrixMachine.status === 'Warning' ? 'var(--warning)' : 'var(--success)'}`}}>
              {selectedMatrixMachine.status || 'Active'}
            </div>

            <div style={{display: 'flex', flexDirection: 'column', gap: '1.25rem'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)'}}>
                 <span style={{color: 'var(--text-secondary)', fontWeight: 600}}>Health Score</span>
                 <span style={{fontSize: '1.25rem', fontWeight: 800, color: calculateHealthScore(selectedMatrixMachine) < 50 ? 'var(--danger)' : calculateHealthScore(selectedMatrixMachine) < 80 ? 'var(--warning)' : 'var(--success)'}}>{calculateHealthScore(selectedMatrixMachine)}%</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)'}}>
                 <span style={{color: 'var(--text-secondary)', fontWeight: 600}}>Temperature</span>
                 <span style={{fontSize: '1.25rem', fontWeight: 800}}>{Math.round(selectedMatrixMachine.temperature || 0)}°C</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)'}}>
                 <span style={{color: 'var(--text-secondary)', fontWeight: 600}}>Vibration</span>
                 <span style={{fontSize: '1.25rem', fontWeight: 800}}>{Number(selectedMatrixMachine.vibration || 0).toFixed(1)} G</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                 <span style={{color: 'var(--text-secondary)', fontWeight: 600}}>Pressure</span>
                 <span style={{fontSize: '1.25rem', fontWeight: 800}}>{Math.round(selectedMatrixMachine.pressure || 0)} PSI</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{margin: '0 0 0.25rem 0'}}>Plant Command Center</h1>
          <p style={{margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem'}}>Enterprise telemetry, operational intelligence, and spatial analytics</p>
        </div>
        <div className="glass-panel" style={{padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '2rem'}}>
          {stats.fault === 0 ? (
            <><ShieldCheck size={18} color="var(--success)" /><span style={{fontWeight: 600, fontSize: '0.875rem'}}>Plant Secure</span></>
          ) : (
            <><AlertTriangle size={18} color="var(--danger)" /><span style={{fontWeight: 600, color: 'var(--danger)', fontSize: '0.875rem'}}>{stats.fault} Critical Faults</span></>
          )}
        </div>
      </div>

      {/* TOP ROW: DENSE KPI GRID (6 cols) */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem'}}>
        <KPICard title="OEE Score" value="87.4%" icon={Target} color="var(--accent-purple)" trendDir="up_good" trendVal="+2.1%" />
        <KPICard title="Plant Uptime" value="98.2%" icon={Activity} color="var(--success)" trendDir="up_good" trendVal="+0.5%" />
        <KPICard title="Yield Quality" value="99.1%" icon={CheckCircle} color="var(--success)" trendDir="up_good" trendVal="+0.2%" />
        <KPICard title="Asset Health" value={`${stats.health}%`} icon={Server} color={stats.health < 80 ? 'var(--warning)' : 'var(--success)'} trendDir="down_bad" trendVal="-1.2%" />
        <KPICard title="Power Draw" value="4.2 MW" icon={Zap} color="var(--warning)" trendDir="down_good" trendVal="-3.4%" />
        <KPICard title="Op. Cost" value="₹12.4k" icon={IndianRupee} color="var(--danger)" trendDir="down_good" trendVal="-4.2%" />
      </div>

      {/* MIDDLE ROW: SPATIAL & STATUS (3 cols) */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', height: '280px'}}>
        
        {/* Col 1: Mini Factory Floor Map */}
        <div className="glass-panel" style={{padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
          <div style={{padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <Map size={16} color="var(--accent-purple)" />
            <span style={{fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Mini Floor Map</span>
          </div>
          <div style={{flex: 1, position: 'relative', background: 'radial-gradient(circle at center, var(--bg-secondary), var(--bg-primary))', overflow: 'hidden'}}>
             <div style={{position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
             {(Array.isArray(machineData) ? machineData : []).map((m, i) => {
                if (!m || !m.machine_id) return null;
                const health = calculateHealthScore(m);
                const pos = getMachinePosition(m.machine_id, i);
                let color = 'var(--success)';
                if (health < 50) color = 'var(--danger)';
                else if (health < 80) color = 'var(--warning)';

                return (
                  <div key={m.machine_id} style={{
                    position: 'absolute', top: `${pos.y}%`, left: `${pos.x}%`, transform: 'translate(-50%, -50%)',
                    width: '12px', height: '12px', borderRadius: '50%', background: color,
                    boxShadow: `0 0 10px ${color}`, border: '2px solid var(--bg-primary)'
                  }}>
                    {health < 50 && <div style={{position: 'absolute', inset: -4, border: `1px solid ${color}`, borderRadius: '50%', animation: 'pulse-danger 2s infinite'}}></div>}
                  </div>
                );
             })}
          </div>
        </div>

        {/* Col 2: Machine Status Matrix */}
        <div className="glass-panel" style={{padding: 0, display: 'flex', flexDirection: 'column'}}>
          <div style={{padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <Grid size={16} color="var(--accent-blue)" />
            <span style={{fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Asset Status Matrix</span>
          </div>
          <div style={{flex: 1, padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(35px, 1fr))', gap: '0.5rem', alignContent: 'start', overflowY: 'auto'}}>
            {(Array.isArray(machineData) ? machineData : []).map(m => {
              if (!m || !m.machine_id) return null;
              const health = calculateHealthScore(m);
              let color = 'var(--success)';
              if (health < 50) color = 'var(--danger)';
              else if (health < 80) color = 'var(--warning)';

              return (
                <div key={m.machine_id} title={`${m.machine_id} - Click for details`} style={{
                  aspectRatio: '1', background: color, opacity: 0.8, borderRadius: '4px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.55rem', fontWeight: 800, color: '#fff', border: '1px solid rgba(255,255,255,0.2)',
                  boxShadow: health < 50 ? `0 0 8px ${color}` : 'none', cursor: 'pointer', transition: 'transform 0.1s ease'
                }}
                onClick={() => setSelectedMatrixId(m.machine_id)}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {String(m.machine_id).split('-')[1] || String(m.machine_id).substring(0,2)}
                </div>
              );
            })}
          </div>
        </div>

        {/* Col 3: Live System Events */}
        <div className="glass-panel" style={{padding: 0, display: 'flex', flexDirection: 'column'}}>
          <div style={{padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
              <Activity size={16} color="var(--warning)" />
              <span style={{fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Live Events</span>
            </div>
            <div className="pulse-dot" style={{width: '6px', height: '6px', background: 'var(--danger)', boxShadow: '0 0 5px var(--danger)'}}></div>
          </div>
          <div style={{flex: 1, padding: '0.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
            {liveEvents.length === 0 ? (
              <div style={{color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', marginTop: '2rem'}}>
                <ShieldCheck size={20} style={{margin: '0 auto 0.5rem auto', opacity: 0.5}} />
                No anomalies detected.
              </div>
            ) : (
              liveEvents.map(ev => (
                <div key={ev.id} style={{display: 'flex', gap: '0.5rem', animation: 'fadeIn 0.3s ease-out', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', borderLeft: `3px solid ${ev.type === 'danger' ? 'var(--danger)' : 'var(--warning)'}`}}>
                  <div style={{flex: 1}}>
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem'}}>
                      <span style={{fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-primary)'}}>{ev.machine_id}</span>
                      <span style={{fontSize: '0.65rem', color: 'var(--text-muted)'}}>{ev.time}</span>
                    </div>
                    <div style={{fontSize: '0.75rem', color: ev.type === 'danger' ? 'var(--danger)' : 'var(--warning)'}}>{ev.msg}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* BOTTOM ROW: DEEP ANALYTICS (2 cols) */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', height: '350px'}}>
        
        {/* Analytics 1: Telemetry Trends */}
        <div className="glass-panel" style={{display: 'flex', flexDirection: 'column'}}>
          <div className="flex justify-between items-center mb-4">
            <h3 style={{margin: 0, textTransform: 'none', fontSize: '1.1rem'}}>Multi-Metric Telemetry</h3>
            <div className="flex gap-2">
              <span style={{fontSize: '0.7rem', padding: '0.15rem 0.5rem', background: 'var(--accent-purple-glow)', color: 'var(--accent-purple)', borderRadius: '4px', fontWeight: 600}}>Temperature (°C)</span>
              <span style={{fontSize: '0.7rem', padding: '0.15rem 0.5rem', background: 'var(--accent-blue-glow)', color: 'var(--accent-blue)', borderRadius: '4px', fontWeight: 600}}>Vibration (G)</span>
            </div>
          </div>
          <div style={{flex: 1, width: '100%', minHeight: 0}}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={telemetryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-purple)" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="var(--accent-purple)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorVib" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" stroke="var(--accent-purple)" tick={{fontSize: 10}} tickLine={false} axisLine={false} domain={[0, 150]} />
                <YAxis yAxisId="right" orientation="right" stroke="var(--accent-blue)" tick={{fontSize: 10}} tickLine={false} axisLine={false} domain={[0, 30]} />
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} />
                <Area yAxisId="left" type="monotone" dataKey="Temperature" stroke="var(--accent-purple)" strokeWidth={2} fillOpacity={1} fill="url(#colorTemp)" />
                <Area yAxisId="right" type="monotone" dataKey="Vibration" stroke="var(--accent-blue)" strokeWidth={2} fillOpacity={1} fill="url(#colorVib)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Analytics 2: Live Production Tracking */}
        <div className="glass-panel" style={{display: 'flex', flexDirection: 'column'}}>
          <div className="flex items-center justify-between mb-4">
            <h3 style={{margin: 0, textTransform: 'none', fontSize: '1.1rem'}}>Live Production (Input vs Output)</h3>
            <span className="status-badge" style={{background: 'var(--accent-blue-glow)', color: 'var(--accent-blue)', border: 'none'}}>Yield Tracking Active</span>
          </div>
          <div style={{flex: 1, width: '100%', minHeight: 0}}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={productionArray} margin={{ top: 20, right: 0, left: -20, bottom: 0 }} barGap={4} barSize={24}>
                <defs>
                  <linearGradient id="colorInput" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-purple)" stopOpacity={1}/>
                    <stop offset="100%" stopColor="var(--accent-purple)" stopOpacity={0.6}/>
                  </linearGradient>
                  <linearGradient id="colorOutput" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity={1}/>
                    <stop offset="100%" stopColor="var(--accent-blue)" stopOpacity={0.6}/>
                  </linearGradient>
                  <linearGradient id="colorDefect" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--danger)" stopOpacity={1}/>
                    <stop offset="100%" stopColor="var(--danger)" stopOpacity={0.6}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-secondary)" tick={{fontSize: 10}} tickLine={false} axisLine={false} domain={[0, 'auto']} />
                <RechartsTooltip 
                  cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                  formatter={(value, name) => [value, name]}
                />
                <Legend iconType="circle" wrapperStyle={{fontSize: '0.75rem', paddingTop: '0.5rem'}} />
                <Bar dataKey="Input" name="Raw Input" fill="url(#colorInput)" radius={[4, 4, 0, 0]} animationDuration={1000} />
                <Bar dataKey="Output" name="Good Yield" stackId="yield" fill="url(#colorOutput)" animationDuration={1000} />
                <Bar dataKey="Defects" name="Scrap/Defects" stackId="yield" fill="url(#colorDefect)" radius={[4, 4, 0, 0]} animationDuration={1000} />
                <Line type="monotone" dataKey="Target" name="Production Target" stroke="var(--success)" strokeWidth={3} dot={{r: 5, fill: 'var(--bg-primary)', strokeWidth: 2}} activeDot={{r: 7}} animationDuration={1000} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
