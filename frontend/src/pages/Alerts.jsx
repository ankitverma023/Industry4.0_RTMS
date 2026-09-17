import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { ShieldAlert, CheckCircle, Clock, AlertTriangle, AlertOctagon } from 'lucide-react';

const Alerts = () => {
  const { socket } = useSocket();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial alerts
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const token = localStorage.getItem('rtms_token');
        const res = await fetch('https://industry4-0-rtms-1.onrender.com/api/alerts', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store'
        });
        const data = await res.json();
        if (res.ok) setAlerts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching alerts', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
  }, []);

  // Listen for real-time alerts
  useEffect(() => {
    if (!socket) return;
    
    const handleNewAlerts = (newAlerts) => {
      setAlerts(prev => {
        const safePrev = Array.isArray(prev) ? prev : [];
        const safeNew = Array.isArray(newAlerts) ? newAlerts : [];
        return [...safeNew, ...safePrev];
      });
    };
    
    socket.on('new_alerts', handleNewAlerts);
    return () => socket.off('new_alerts', handleNewAlerts);
  }, [socket]);

  const acknowledgeAlert = async (id) => {
    try {
      const token = localStorage.getItem('rtms_token');
      await fetch(`https://industry4-0-rtms-1.onrender.com/api/alerts/${id}/acknowledge`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      setAlerts(prev => (Array.isArray(prev) ? prev : []).map(a => (a && a.id === id) ? { ...a, status: 'acknowledged' } : a));
    } catch (err) {
      console.error(err);
    }
  };

  const resolveAlert = async (id) => {
    try {
      const token = localStorage.getItem('rtms_token');
      await fetch(`https://industry4-0-rtms-1.onrender.com/api/alerts/${id}/resolve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      setAlerts(prev => (Array.isArray(prev) ? prev : []).map(a => (a && a.id === id) ? { ...a, status: 'resolved' } : a));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-full"><div className="pulse-dot" style={{transform: 'scale(2)'}}></div></div>;

  const safeAlerts = Array.isArray(alerts) ? alerts : [];
  const activeAlerts = safeAlerts.filter(a => a && a.status === 'active').length;
  const criticalAlerts = safeAlerts.filter(a => a && a.status === 'active' && a.severity === 'CRITICAL').length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1>Alert Intelligence</h1>
          <p style={{color: 'var(--text-secondary)'}}>System-wide anomaly detection and threshold breaches</p>
        </div>
        <div className="flex gap-4">
          <div className="glass-panel flex items-center gap-3" style={{padding: '0.75rem 1.5rem', borderRadius: '1rem'}}>
            <AlertOctagon size={24} color={criticalAlerts > 0 ? 'var(--danger)' : 'var(--text-muted)'} />
            <div className="flex flex-col">
              <span style={{fontSize: '1.5rem', fontWeight: 800, lineHeight: 1, color: criticalAlerts > 0 ? 'var(--danger)' : 'var(--text-primary)'}}>{criticalAlerts}</span>
              <span style={{fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase'}}>Critical</span>
            </div>
          </div>
          <div className="glass-panel flex items-center gap-3" style={{padding: '0.75rem 1.5rem', borderRadius: '1rem'}}>
            <AlertTriangle size={24} color={activeAlerts > 0 ? 'var(--warning)' : 'var(--text-muted)'} />
            <div className="flex flex-col">
              <span style={{fontSize: '1.5rem', fontWeight: 800, lineHeight: 1, color: activeAlerts > 0 ? 'var(--warning)' : 'var(--text-primary)'}}>{activeAlerts}</span>
              <span style={{fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase'}}>Active</span>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{padding: 0, overflow: 'hidden'}}>
        {safeAlerts.length === 0 ? (
          <div className="flex flex-col justify-center items-center py-20">
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem'
            }}>
              <CheckCircle size={40} color="var(--success)" />
            </div>
            <h2 style={{margin: 0}}>All Systems Nominal</h2>
            <p style={{color: 'var(--text-secondary)'}}>No active alerts or anomalies detected.</p>
          </div>
        ) : (
          <table className="rtms-table">
            <thead style={{background: 'rgba(0,0,0,0.2)'}}>
              <tr>
                <th style={{paddingLeft: '2rem'}}>Timestamp</th>
                <th>Asset ID</th>
                <th>Severity</th>
                <th>Event Description</th>
                <th>Status</th>
                <th style={{paddingRight: '2rem', textAlign: 'right'}}>Action</th>
              </tr>
            </thead>
            <tbody>
              {safeAlerts.map((alert, index) => {
                if (!alert) return null;
                return (
                  <tr key={alert.id || index}>
                    <td style={{paddingLeft: '2rem', color: 'var(--text-secondary)'}}>
                      <div className="flex items-center gap-2">
                        <Clock size={14} />
                        {(() => {
                          let ds = alert.created_at || alert.timestamp;
                          if (!ds) return 'N/A';
                          let m = String(ds).match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/);
                          if (!m) return 'N/A';
                          let istTime = Date.UTC(m[1], m[2]-1, m[3], m[4], m[5], m[6]) + (5.5 * 3600000); // Force Vite HMR Cache Bust
                          return new Date(istTime).toLocaleString('en-US', {timeZone: 'UTC', month: 'short', day: '2-digit', hour: '2-digit', minute:'2-digit', second:'2-digit'});
                        })()}
                      </div>
                    </td>
                    <td style={{fontWeight: 600, color: 'var(--text-primary)'}}>
                      {alert.machine_id ? String(alert.machine_id).toUpperCase() : 'UNKNOWN'}
                    </td>
                    <td>
                      <span className={`status-badge ${alert.severity === 'CRITICAL' ? 'status-fault' : 'status-warning'}`}>
                        {alert.severity || 'WARNING'}
                      </span>
                    </td>
                    <td style={{color: 'var(--text-secondary)'}}>{alert.message || 'Unknown event'}</td>
                    <td>
                      <span style={{
                        fontWeight: 600,
                        color: alert.status === 'resolved' ? 'var(--success)' : 
                               alert.status === 'acknowledged' ? 'var(--accent-blue)' : 'var(--warning)'
                      }}>
                        {alert.status ? String(alert.status).charAt(0).toUpperCase() + String(alert.status).slice(1) : 'Unknown'}
                      </span>
                    </td>
                    <td style={{paddingRight: '2rem', textAlign: 'right'}}>
                      <div className="flex justify-end gap-2">
                        {alert.status === 'active' && alert.id && (
                          <button 
                            onClick={() => acknowledgeAlert(alert.id)}
                            style={{
                              background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)', 
                              border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '0.5rem',
                              padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s ease'
                            }}
                          >
                            Ack
                          </button>
                        )}
                        {alert.status !== 'resolved' && alert.id && (
                          <button 
                            onClick={() => resolveAlert(alert.id)}
                            style={{
                              background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', 
                              border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '0.5rem',
                              padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s ease'
                            }}
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Alerts;
