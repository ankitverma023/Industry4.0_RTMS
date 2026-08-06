import React from 'react';
import { useSocket } from '../context/SocketContext';
import { calculateHealthScore, getHealthStatus } from '../utils/healthUtils';

const Monitoring = () => {
  const { machineData } = useSocket();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1>Live Monitoring</h1>
          <p style={{color: 'var(--text-secondary)'}}>Detailed real-time sensor data across all facility zones</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {(Array.isArray(machineData) ? machineData : []).map((machine, idx) => {
          if (!machine) return null;
          const healthScore = calculateHealthScore(machine);
          const healthStatus = getHealthStatus(healthScore);
          
          return (
          <div key={machine.machine_id || idx} className="glass-panel flex flex-col gap-6" style={{
            boxShadow: healthStatus.class === 'status-fault' ? '0 0 30px var(--danger-glow)' : 
                       healthStatus.class === 'status-warning' ? '0 0 30px var(--warning-glow)' : 'auto'
          }}>
            <div className="flex justify-between items-start pb-4 border-b" style={{borderColor: 'var(--border-color)'}}>
              <div className="flex flex-col gap-2 flex-1 min-w-0 pr-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 style={{margin: 0, color: 'var(--text-primary)', fontSize: '1.25rem', lineHeight: '1.2'}}>
                    {machine.name ? machine.name : (machine.machine_id ? String(machine.machine_id).toUpperCase() : 'UNKNOWN')}
                  </h3>
                  <div className="flex items-center gap-1.5" style={{background: 'rgba(16, 185, 129, 0.15)', padding: '0.2rem 0.6rem', borderRadius: '1rem', border: '1px solid rgba(16, 185, 129, 0.3)', flexShrink: 0}}>
                    <div style={{width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px var(--success)'}} className="pulse-dot"></div>
                    <span style={{fontSize: '0.65rem', color: 'var(--success)', fontWeight: 800, letterSpacing: '0.05em'}}>ONLINE</span>
                  </div>
                </div>
                <span style={{fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600}}>
                  MODE: {machine.op_status ? String(machine.op_status).replace(/_/g, ' ') : 'UNKNOWN'}
                </span>
              </div>
              <div className="flex gap-2 flex-shrink-0 pt-1" style={{height: 'fit-content'}}>
                <span className={`status-badge ${healthStatus.class}`} style={{height: 'fit-content'}}>
                  {healthScore}%
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <SensorBlock label="Temp" value={machine.temperature ? machine.temperature.toFixed(1) : 0} unit="°C" max={120} danger={95} warning={85} />
              <SensorBlock label="Pressure" value={machine.pressure ? machine.pressure.toFixed(1) : 0} unit="bar" max={150} danger={120} warning={100} />
              <SensorBlock label="RPM" value={machine.rpm ? machine.rpm.toFixed(0) : 0} unit="rpm" max={2000} danger={500} warning={1400} />
              <SensorBlock label="Vibration" value={machine.vibration ? machine.vibration.toFixed(2) : 0} unit="mm/s" max={25} danger={15} warning={10} />
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
};

const SensorBlock = ({ label, value, unit, max, danger, warning }) => {
  const valNum = parseFloat(value);
  const percentage = Math.min(100, Math.max(0, (valNum / max) * 100));
  
  let color = 'var(--success)';
  if ((danger > warning && valNum >= danger) || (danger < warning && valNum <= danger)) color = 'var(--danger)';
  else if ((warning > danger && valNum >= warning) || (warning < danger && valNum <= warning)) color = 'var(--warning)';

  return (
    <div style={{background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '1rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
      <div className="flex flex-col gap-1">
        <span style={{fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em'}}>{label}</span>
        <div style={{color, fontWeight: 700, fontSize: '1.25rem', lineHeight: '1'}}>{value} <span style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>{unit}</span></div>
      </div>
      <div style={{height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden', marginTop: 'auto'}}>
        <div style={{
          height: '100%', 
          width: `${percentage}%`, 
          background: color,
          boxShadow: `0 0 10px ${color}`,
          transition: 'width 0.5s ease-in-out, background 0.5s ease-in-out'
        }}></div>
      </div>
    </div>
  );
};

export default Monitoring;
