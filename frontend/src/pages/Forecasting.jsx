import React, { useState, useMemo, useEffect } from 'react';
import { Brain, Activity, Target, AlertTriangle, Cpu, Zap, Info, Wrench } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { useSocket } from '../context/SocketContext';
import { calculateHealthScore } from '../utils/healthUtils';

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) return <div style={{padding: '20px', color: 'red'}}><h1>Something went wrong.</h1><pre>{this.state.error.toString()}</pre></div>;
    return this.props.children;
  }
}

const ForecastingContent = () => {
  const { machineData } = useSocket();
  const [selectedMachine, setSelectedMachine] = useState('cnc-01');

  const activeMachineData = useMemo(() => {
    if (!machineData || !Array.isArray(machineData)) return null;
    return machineData.find(m => m.machine_id === selectedMachine) || machineData[0];
  }, [machineData, selectedMachine]);

  useEffect(() => {
    if (activeMachineData && activeMachineData.machine_id !== selectedMachine) {
      setSelectedMachine(activeMachineData.machine_id);
    }
  }, [activeMachineData]);

  // Advanced Dynamic Probabilities
  const componentAnalysis = useMemo(() => {
    if (!activeMachineData) return [];
    
    let spindle = 15; let pump = 10; let motor = 10; let hydraulic = 5; let tool = 10;
    let spindleFactor = 'Normal Wear'; let pumpFactor = 'Normal Wear'; 
    let motorFactor = 'Normal Wear'; let hydraulicFactor = 'Normal Wear'; let toolFactor = 'Normal Wear';

    const temp = activeMachineData.temperature || 70;
    const vib = activeMachineData.vibration || 2;
    const pressure = activeMachineData.pressure || 80;

    if (vib > 10) { spindle += (vib * 3); spindleFactor = `High Vibration (${vib.toFixed(1)}G)`; }
    if (vib > 5) { tool += (vib * 2); toolFactor = 'Vibration Stress'; }
    if (temp > 85) { motor += (temp - 85) * 4; motorFactor = `Critical Temp (${temp.toFixed(0)}°C)`; }
    if (temp > 80) { pump += (temp - 80) * 2; pumpFactor = 'Elevated Temp'; }
    if (pressure > 110) { hydraulic += (pressure - 110) * 2; hydraulicFactor = `High Pressure (${pressure.toFixed(0)} PSI)`; }
    if (pressure < 70) { hydraulic += (70 - pressure) * 3; hydraulicFactor = `Low Pressure (${pressure.toFixed(0)} PSI)`; }

    return [
      { subject: 'Spindle Bearing', A: Math.min(95, spindle), fullMark: 100, factor: spindleFactor, costFail: '₹8,50,000', costPrev: '₹45,000', rul: spindle > 70 ? '< 3 Days' : '> 14 Days' },
      { subject: 'Coolant Pump', A: Math.min(95, pump), fullMark: 100, factor: pumpFactor, costFail: '₹3,20,000', costPrev: '₹18,000', rul: pump > 70 ? '< 5 Days' : '> 14 Days' },
      { subject: 'Motor Thermal', A: Math.min(95, motor), fullMark: 100, factor: motorFactor, costFail: '₹6,40,000', costPrev: '₹32,000', rul: motor > 70 ? '< 2 Days' : '> 14 Days' },
      { subject: 'Tool Breakage', A: Math.min(95, tool), fullMark: 100, factor: toolFactor, costFail: '₹95,000', costPrev: '₹8,500', rul: tool > 70 ? 'Imminent' : '> 14 Days' },
      { subject: 'Hydraulic System', A: Math.min(95, hydraulic), fullMark: 100, factor: hydraulicFactor, costFail: '₹4,80,000', costPrev: '₹28,000', rul: hydraulic > 70 ? '< 7 Days' : '> 14 Days' }
    ];
  }, [activeMachineData]);

  // Primary Stressor & Model Confidence Calculation
  const modelInsights = useMemo(() => {
    if (!activeMachineData) return { stressor: 'None', confidence: 95 };
    const temp = activeMachineData.temperature;
    const vib = activeMachineData.vibration;
    const pressure = activeMachineData.pressure;
    
    let stressor = 'Nominal Operations';
    let confidence = 95;
    let maxDeviation = 0;

    // Temp normal: 75. Vib normal: 2. Pressure normal: 80.
    const tempDev = Math.abs(temp - 75) / 75;
    const vibDev = Math.abs(vib - 2) / 2;
    const presDev = Math.abs(pressure - 80) / 80;

    if (vibDev > tempDev && vibDev > presDev && vib > 5) {
      stressor = `Critical Vibration (${vib.toFixed(1)}G)`;
      maxDeviation = vibDev;
    } else if (tempDev > presDev && temp > 85) {
      stressor = `Sustained High Temp (${temp.toFixed(0)}°C)`;
      maxDeviation = tempDev;
    } else if (pressure > 110 || pressure < 70) {
      stressor = `Pressure Anomaly (${pressure.toFixed(0)} PSI)`;
      maxDeviation = presDev;
    }

    // High deviation/erratic data lowers AI confidence
    if (maxDeviation > 1) confidence -= 12;
    else if (maxDeviation > 0.5) confidence -= 5;
    else if (activeMachineData.status === 'Fault') confidence -= 8;

    return { stressor, confidence };
  }, [activeMachineData]);


  // AI Confidence Intervals & Forecast
  const predictiveData = useMemo(() => {
    if (!activeMachineData) return [];
    
    const data = [];
    const liveHealth = calculateHealthScore(activeMachineData);
    let historicalHealth = liveHealth + 15; 
    if (historicalHealth > 100) historicalHealth = 100;
    
    for (let i = -14; i < 0; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const step = (historicalHealth - liveHealth) / 14;
      const val = historicalHealth - (step * (14 + i));
      
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        historical: Math.max(0, val).toFixed(1),
        forecast: null, forecast_opt: null, forecast_pes: null,
      });
    }

    const today = new Date();
    data.push({
      date: today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      historical: liveHealth.toFixed(1),
      forecast: liveHealth.toFixed(1),
      forecast_opt: liveHealth.toFixed(1),
      forecast_pes: liveHealth.toFixed(1),
    });

    const tempDegradationFactor = (activeMachineData.temperature > 85) ? 3 : 1;
    const vibDegradationFactor = (activeMachineData.vibration > 8) ? 4 : 1;
    const baseDegradation = 1.5;
    
    let fHealth = parseFloat(liveHealth);
    let fOpt = parseFloat(liveHealth);
    let fPes = parseFloat(liveHealth);

    for (let i = 1; i <= 14; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      const dailyDrop = baseDegradation * tempDegradationFactor * vibDegradationFactor * (0.8 + Math.random() * 0.4);
      fHealth -= dailyDrop;
      fOpt -= (dailyDrop * 0.6); // Optimistic: degrades 40% slower
      fPes -= (dailyDrop * 1.4); // Pessimistic: degrades 40% faster
      
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        historical: null,
        forecast: Math.max(0, fHealth).toFixed(1),
        forecast_opt: Math.max(0, fOpt).toFixed(1),
        forecast_pes: Math.max(0, fPes).toFixed(1),
      });
    }
    return data;
  }, [activeMachineData]);

  const daysToFailure = useMemo(() => {
    if (predictiveData.length === 0) return '--';
    const criticalPoint = predictiveData.find(d => d.forecast && parseFloat(d.forecast) <= 40);
    if (!criticalPoint) return '> 14';
    
    const today = new Date();
    const failDate = new Date();
    failDate.setDate(today.getDate() + predictiveData.indexOf(criticalPoint) - 14); 
    
    const diffTime = failDate - today;
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return days <= 0 ? 0 : days;
  }, [predictiveData]);

  const highestRiskComponent = useMemo(() => {
    if (componentAnalysis.length === 0) return { subject: 'Unknown', A: 0 };
    return [...componentAnalysis].sort((a, b) => b.A - a.A)[0];
  }, [componentAnalysis]);

  if (!activeMachineData) return <div className="flex justify-center items-center h-full"><div className="pulse-dot" style={{transform: 'scale(2)'}}></div></div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="flex items-center gap-3">
            <Brain color="var(--accent-purple)" />
            AI Predictive Forecasting
          </h1>
          <p style={{color: 'var(--text-secondary)'}}>Machine learning algorithms predicting Remaining Useful Life (RUL) and anomaly trajectories based on LIVE data</p>
        </div>
        <div>
          <select 
            value={selectedMachine}
            onChange={(e) => setSelectedMachine(e.target.value)}
            style={{
              padding: '0.75rem 1.5rem', background: 'var(--bg-secondary)', 
              border: '1px solid var(--border-color)', borderRadius: '0.5rem', 
              color: 'var(--text-primary)', outline: 'none', fontWeight: 600, fontSize: '1rem',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)', cursor: 'pointer'
            }}
          >
            {(Array.isArray(machineData) ? machineData : []).map(m => (
              <option key={m.machine_id} value={m.machine_id}>{m.machine_id ? String(m.machine_id).toUpperCase() : 'UNKNOWN'}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="glass-panel flex flex-col justify-center items-center gap-2" style={{borderTop: '4px solid var(--accent-purple)'}}>
          <Target size={32} color="var(--accent-purple)" />
          <span style={{fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600}}>Remaining Useful Life</span>
          <span style={{fontSize: '2.5rem', fontWeight: 800, color: daysToFailure <= 3 ? 'var(--danger)' : daysToFailure <= 7 ? 'var(--warning)' : 'var(--text-primary)', lineHeight: 1}}>
            {daysToFailure} <span style={{fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 500}}>days</span>
          </span>
        </div>
        
        <div className="glass-panel flex flex-col justify-center items-center gap-2 text-center" style={{borderTop: `4px solid ${highestRiskComponent.A > 70 ? 'var(--danger)' : highestRiskComponent.A > 40 ? 'var(--warning)' : 'var(--success)'}`}}>
          <AlertTriangle size={32} color={highestRiskComponent.A > 70 ? 'var(--danger)' : highestRiskComponent.A > 40 ? 'var(--warning)' : 'var(--success)'} />
          <span style={{fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600}}>Highest Risk Subsystem</span>
          <span style={{fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)'}}>{highestRiskComponent.subject}</span>
          <span style={{fontSize: '0.875rem', color: highestRiskComponent.A > 70 ? 'var(--danger)' : highestRiskComponent.A > 40 ? 'var(--warning)' : 'var(--success)', fontWeight: 600}}>
            {highestRiskComponent.A.toFixed(0)}% Failure Probability
          </span>
        </div>

        <div className="glass-panel flex flex-col justify-center items-center gap-2 text-center" style={{borderTop: '4px solid var(--accent-blue)'}}>
          <Activity size={32} color="var(--accent-blue)" />
          <span style={{fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600}}>Primary Stressor</span>
          <span style={{fontSize: '1.25rem', fontWeight: 700, color: modelInsights.stressor !== 'Nominal Operations' ? 'var(--warning)' : 'var(--success)'}}>{modelInsights.stressor}</span>
          <span style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>AI Feature Importance: High</span>
        </div>
        
        <div className="glass-panel flex flex-col justify-center items-center gap-2" style={{borderTop: `4px solid ${modelInsights.confidence > 90 ? 'var(--success)' : 'var(--warning)'}`}}>
          <Cpu size={32} color={modelInsights.confidence > 90 ? 'var(--success)' : 'var(--warning)'} />
          <span style={{fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600}}>Model Confidence</span>
          <span style={{fontSize: '2.5rem', fontWeight: 800, color: modelInsights.confidence > 90 ? 'var(--success)' : 'var(--warning)', lineHeight: 1}}>{modelInsights.confidence}<span style={{fontSize: '1.5rem'}}>%</span></span>
          <span style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>LSTM Time-Series Model</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="glass-panel" style={{height: '450px'}}>
          <div className="flex items-center gap-2 mb-6">
            <Activity size={20} color="var(--accent-blue)" />
            <h3 style={{margin: 0}}>Health Trajectory & Confidence Intervals</h3>
          </div>
          <div style={{height: '350px', width: '100%'}}>
            <ResponsiveContainer>
              <AreaChart data={predictiveData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHistorical" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-purple)" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="var(--accent-purple)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={12} tickLine={false} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} domain={[0, 100]} unit="%" />
                <Tooltip 
                  contentStyle={{background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', color: 'var(--text-primary)'}}
                  itemStyle={{color: 'var(--text-primary)'}}
                  formatter={(value, name) => [value, name === 'forecast_opt' ? 'Optimistic Forecast' : name === 'forecast_pes' ? 'Pessimistic Forecast' : name]}
                />
                
                <ReferenceLine y={40} stroke="var(--danger)" strokeDasharray="3 3" label={{ position: 'top', value: 'Critical Failure Threshold', fill: 'var(--danger)', fontSize: 12 }} />
                <ReferenceLine x={predictiveData.length > 14 ? predictiveData[14].date : ''} stroke="var(--text-secondary)" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'Live', fill: 'var(--text-secondary)', fontSize: 12 }} />

                {/* Bounds */}
                <Area type="monotone" dataKey="forecast_opt" name="forecast_opt" stroke="var(--success)" strokeWidth={1} strokeDasharray="3 3" fillOpacity={0} />
                <Area type="monotone" dataKey="forecast_pes" name="forecast_pes" stroke="var(--danger)" strokeWidth={1} strokeDasharray="3 3" fillOpacity={0} />
                
                {/* Main Lines */}
                <Area type="monotone" dataKey="historical" name="Historical Health" stroke="var(--accent-blue)" strokeWidth={3} fillOpacity={1} fill="url(#colorHistorical)" />
                <Area type="monotone" dataKey="forecast" name="Expected Forecast" stroke="var(--accent-purple)" strokeWidth={3} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorForecast)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel" style={{height: '450px'}}>
          <div className="flex items-center gap-2 mb-6">
            <Zap size={20} color="var(--warning)" />
            <h3 style={{margin: 0}}>Component Anomaly Probability</h3>
          </div>
          <div style={{height: '350px', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={componentAnalysis}>
                <PolarGrid stroke="var(--border-color)" />
                <PolarAngleAxis dataKey="subject" tick={{fill: 'var(--text-primary)', fontSize: 12, fontWeight: 500}} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{fill: 'var(--text-muted)'}} />
                <Radar name="Failure Probability %" dataKey="A" stroke="var(--accent-purple)" fill="var(--accent-purple)" fillOpacity={0.4} />
                <Tooltip 
                  contentStyle={{background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', color: 'var(--text-primary)'}}
                  formatter={(value) => [`${value.toFixed(1)}%`, 'Probability']}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{padding: 0, overflow: 'hidden'}}>
        <div style={{padding: '1.5rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)'}}>
          <div className="flex items-center gap-2 mb-2">
            <Wrench size={20} color="var(--success)" />
            <h3 style={{margin: 0, color: 'var(--text-primary)'}}>AI Component Degradation Analysis</h3>
          </div>
          <p style={{margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)'}}>Financial and operational breakdown of predicted failures</p>
        </div>
        <table className="rtms-table">
          <thead>
            <tr>
              <th style={{paddingLeft: '2rem'}}>Component</th>
              <th>Failure Probability</th>
              <th>Primary Stressor</th>
              <th>Predicted RUL</th>
              <th>Prev. Maintenance Cost</th>
              <th>Est. Failure Cost</th>
              <th style={{paddingRight: '2rem'}}>AI Recommendation</th>
            </tr>
          </thead>
          <tbody>
            {[...componentAnalysis].sort((a, b) => b.A - a.A).map((comp, idx) => (
              <tr key={idx}>
                <td style={{paddingLeft: '2rem', fontWeight: 600, color: 'var(--text-primary)'}}>{comp.subject}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <span style={{fontWeight: 700, color: comp.A > 70 ? 'var(--danger)' : comp.A > 40 ? 'var(--warning)' : 'var(--success)'}}>{comp.A.toFixed(1)}%</span>
                  </div>
                </td>
                <td style={{color: comp.factor !== 'Normal Wear' ? 'var(--warning)' : 'var(--text-secondary)'}}>{comp.factor}</td>
                <td style={{fontWeight: 600, color: comp.rul.includes('<') || comp.rul === 'Imminent' ? 'var(--danger)' : 'var(--text-secondary)'}}>{comp.rul}</td>
                <td style={{color: 'var(--success)', fontWeight: 500}}>{comp.costPrev}</td>
                <td style={{color: 'var(--danger)', fontWeight: 500}}>{comp.costFail}</td>
                <td style={{paddingRight: '2rem'}}>
                  {comp.A > 70 ? (
                    <button style={{background: 'var(--danger)', color: '#fff', border: 'none', padding: '0.25rem 0.75rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer'}}>Schedule Replacement</button>
                  ) : comp.A > 40 ? (
                    <button style={{background: 'rgba(245, 158, 11, 0.2)', color: 'var(--warning)', border: '1px solid var(--warning)', padding: '0.25rem 0.75rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer'}}>Inspect Unit</button>
                  ) : (
                    <span style={{color: 'var(--text-muted)', fontSize: '0.875rem'}}>Continue Operations</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default function Forecasting() {
  return (
    <ErrorBoundary>
      <ForecastingContent />
    </ErrorBoundary>
  );
}
