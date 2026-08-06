import React, { useMemo, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { calculateHealthScore } from '../utils/healthUtils';
import { Wrench, Calendar, AlertTriangle, CheckCircle, TrendingDown, FilterX } from 'lucide-react';

const Maintenance = () => {
  const { machineData } = useSocket();

  const maintenanceData = useMemo(() => {
    return (Array.isArray(machineData) ? machineData : []).map(m => {
      const health = calculateHealthScore(m);
      let riskLevel = 'LOW';
      let riskColor = 'var(--success)';
      let action = 'No action required';
      let timeframe = 'Next scheduled maintenance';
      let anomaly = false;

      // Predictive logic based on current simulated parameters
      if (m.vibration > 12 && m.temperature > 85) {
        riskLevel = 'HIGH';
        riskColor = 'var(--danger)';
        action = 'Immediate Bearing Inspection';
        timeframe = 'ASAP (< 24 hrs)';
        anomaly = true;
      } else if (m.temperature > 90) {
        riskLevel = 'HIGH';
        riskColor = 'var(--danger)';
        action = 'Cooling System Check';
        timeframe = 'ASAP (< 24 hrs)';
        anomaly = true;
      } else if (health < 75) {
        riskLevel = 'MEDIUM';
        riskColor = 'var(--warning)';
        action = 'Routine Component Check';
        timeframe = 'Within 7 Days';
      }

      return {
        ...m,
        health,
        riskLevel,
        riskColor,
        action,
        timeframe,
        anomaly
      };
    });
  }, [machineData]);

  const [filter, setFilter] = useState('ALL');

  const highRiskCount = maintenanceData.filter(m => m.riskLevel === 'HIGH').length;
  const upcomingCount = maintenanceData.filter(m => m.timeframe !== 'Next scheduled maintenance').length;

  const filteredData = useMemo(() => {
    if (filter === 'HIGH_RISK') return maintenanceData.filter(m => m.riskLevel === 'HIGH');
    if (filter === 'UPCOMING') return maintenanceData.filter(m => m.timeframe !== 'Next scheduled maintenance');
    return maintenanceData;
  }, [maintenanceData, filter]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1>Predictive Maintenance</h1>
          <p style={{color: 'var(--text-secondary)'}}>AI-driven anomaly detection and maintenance scheduling</p>
        </div>
        {filter !== 'ALL' && (
          <button 
            onClick={() => setFilter('ALL')}
            style={{
              background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)',
              padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'
            }}
          >
            <FilterX size={16} />
            Clear Filter
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="glass-panel stat-card" style={{gridColumn: 'span 2'}}>
          <div className="flex items-center gap-4 mb-4">
            <div className="icon-wrapper"><Wrench size={24} color="var(--accent-purple)" /></div>
            <div>
              <h3>AI Anomaly Detection</h3>
              <p style={{color: 'var(--text-secondary)', fontSize: '0.875rem'}}>Continuous multivariate analysis</p>
            </div>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span style={{color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 600}}>Status: <span style={{color: highRiskCount > 0 ? 'var(--danger)' : 'var(--success)'}}>{highRiskCount > 0 ? 'Anomalies Detected' : 'Nominal'}</span></span>
            <div className={`pulse-dot`} style={{background: highRiskCount > 0 ? 'var(--danger)' : 'var(--success)', boxShadow: `0 0 10px ${highRiskCount > 0 ? 'var(--danger-glow)' : 'var(--success-glow)'}`}}></div>
          </div>
        </div>

        <div 
          className="glass-panel stat-card text-center items-center" 
          onClick={() => setFilter(filter === 'HIGH_RISK' ? 'ALL' : 'HIGH_RISK')}
          style={{ cursor: 'pointer', border: filter === 'HIGH_RISK' ? '1px solid var(--danger)' : '1px solid var(--border-color)', transform: filter === 'HIGH_RISK' ? 'translateY(-2px)' : 'none' }}
        >
          <h3 style={{marginBottom: '1rem'}}>High Risk Assets</h3>
          <span className="stat-value" style={{color: highRiskCount > 0 ? 'var(--danger)' : 'var(--text-primary)'}}>{highRiskCount}</span>
        </div>

        <div 
          className="glass-panel stat-card text-center items-center"
          onClick={() => setFilter(filter === 'UPCOMING' ? 'ALL' : 'UPCOMING')}
          style={{ cursor: 'pointer', border: filter === 'UPCOMING' ? '1px solid var(--warning)' : '1px solid var(--border-color)', transform: filter === 'UPCOMING' ? 'translateY(-2px)' : 'none' }}
        >
          <h3 style={{marginBottom: '1rem'}}>Upcoming Tasks</h3>
          <span className="stat-value" style={{color: upcomingCount > 0 ? 'var(--warning)' : 'var(--text-primary)'}}>{upcomingCount}</span>
        </div>
      </div>

      <div className="glass-panel" style={{padding: 0, overflow: 'hidden'}}>
        <table className="rtms-table">
          <thead>
            <tr>
              <th>Asset ID</th>
              <th>Health Score</th>
              <th>Failure Risk</th>
              <th>Predicted Anomaly</th>
              <th>Recommended Action</th>
              <th>Timeframe</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr><td colSpan="6" style={{textAlign: 'center', color: 'var(--text-muted)'}}>No matching records found.</td></tr>
            ) : (
              filteredData.map(m => (
                <tr key={m?.machine_id}>
                  <td style={{fontWeight: 600, color: 'var(--text-primary)'}}>
                    {m?.machine_id ? String(m.machine_id).toUpperCase() : 'UNKNOWN'}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div style={{width: '60px', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden'}}>
                        <div style={{width: `${m.health}%`, height: '100%', background: m.health > 80 ? 'var(--success)' : m.health > 50 ? 'var(--warning)' : 'var(--danger)'}}></div>
                      </div>
                      <span style={{fontSize: '0.875rem'}}>{m.health}%</span>
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${m.riskLevel === 'HIGH' ? 'status-fault' : m.riskLevel === 'MEDIUM' ? 'status-warning' : 'status-running'}`}>
                      {m.riskLevel}
                    </span>
                  </td>
                  <td>
                    {m.anomaly ? (
                      <div className="flex items-center gap-2" style={{color: 'var(--danger)'}}>
                        <TrendingDown size={16} />
                        <span style={{fontWeight: 600}}>Degradation detected</span>
                      </div>
                    ) : (
                      <span style={{color: 'var(--text-muted)'}}>None</span>
                    )}
                  </td>
                  <td style={{color: 'var(--text-secondary)'}}>{m.action}</td>
                  <td style={{fontWeight: 600, color: m.riskLevel === 'HIGH' ? 'var(--danger)' : 'var(--text-secondary)'}}>
                    <div className="flex items-center gap-2">
                      <Calendar size={14} />
                      {m.timeframe}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Maintenance;
