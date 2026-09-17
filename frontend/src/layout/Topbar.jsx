import React, { useState, useEffect } from 'react';
import { Bell, User, Search, X } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';

const Topbar = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const { socket, isConnected } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const token = localStorage.getItem('rtms_token');
        if (!token) return;
        const res = await fetch('https://industry4-0-rtms-1.onrender.com/api/alerts', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store'
        });
        if (res.ok) {
          const data = await res.json();
          setNotifications(Array.isArray(data) ? data.filter(a => a.status === 'active').slice(0, 5) : []);
        }
      } catch (err) {}
    };
    fetchLatest();
  }, []);

  useEffect(() => {
    if (!socket) return;
    
    const handleNewAlert = (newAlerts) => {
      setNotifications(prev => {
        const valid = Array.isArray(newAlerts) ? newAlerts.filter(a => a !== null) : [];
        return [...valid, ...prev].slice(0, 5); // Keep last 5
      });
    };
    socket.on('new_alerts', handleNewAlert);
    return () => socket.off('new_alerts', handleNewAlert);
  }, [socket]);

  const handleSearch = (e) => {
    e.preventDefault();
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      if (query.includes('alert') || query.includes('warning') || query.includes('fault')) navigate('/alerts');
      else if (query.includes('energy') || query.includes('power') || query.includes('cost')) navigate('/energy');
      else if (query.includes('dash') || query.includes('home')) navigate('/');
      else if (query.includes('report') || query.includes('analytic')) navigate('/reports');
      else if (query.includes('predict') || query.includes('forecast') || query.includes('ai')) navigate('/forecasting');
      else if (query.includes('map') || query.includes('floor') || query.includes('layout')) navigate('/floor-map');
      else if (query.includes('maintain') || query.includes('maintenance') || query.includes('log')) navigate('/maintenance');
      else if (query.includes('staff') || query.includes('personnel') || query.includes('team')) navigate('/staff');
      else if (query.includes('production') || query.includes('plan') || query.includes('control')) navigate('/production');
      else if (query.includes('monitor') || query.includes('machine') || query.includes('live')) navigate('/monitoring');
      else {
        alert(`No results found for "${searchQuery}". Try searching for 'alerts', 'energy', 'reports', or 'forecasting'.`);
      }
    }
  };

  return (
    <header className="topbar">
      <form onSubmit={handleSearch} style={{position: 'relative', width: '300px'}}>
        <Search size={18} color="var(--text-secondary)" style={{position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)'}} />
        <input 
          type="text" 
          placeholder="Search machines, alerts..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem',
            background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
            borderRadius: '2rem', color: 'var(--text-primary)', outline: 'none',
            fontSize: '0.875rem'
          }}
        />
      </form>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className={`pulse-dot ${!isConnected ? 'fault' : ''}`}></div>
          <span style={{fontSize: '0.875rem', color: 'var(--text-secondary)'}}>
            {isConnected ? 'System Live' : 'Disconnected'}
          </span>
        </div>

        <div style={{position: 'relative'}}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary)', position: 'relative', padding: '0.5rem'
            }}
          >
            <Bell size={20} />
            {notifications.length > 0 && (
              <span style={{
                position: 'absolute', top: '0', right: '0',
                width: '8px', height: '8px', background: 'var(--danger)',
                borderRadius: '50%', boxShadow: '0 0 10px var(--danger-glow)'
              }}></span>
            )}
          </button>
          
          {showNotifications && (
            <div className="glass-panel" style={{
              position: 'absolute', top: '100%', right: '0', width: '300px',
              padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem',
              marginTop: '0.5rem'
            }}>
              <div className="flex justify-between items-center pb-2 mb-2 border-b" style={{borderColor: 'var(--border-color)'}}>
                <h4 style={{margin: 0}}>Notifications {notifications.length > 0 ? `(${notifications.length})` : ''}</h4>
                <button 
                  onClick={() => setShowNotifications(false)} 
                  style={{background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0, display: 'flex'}}
                >
                  <X size={16} />
                </button>
              </div>
              {notifications.length === 0 ? (
                <div style={{padding: '1rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)'}}>
                  No new notifications
                </div>
              ) : (
                <div style={{maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                  {notifications.map((notif, idx) => (
                    <div key={notif.id || idx} style={{
                      padding: '0.75rem', borderRadius: '0.5rem', 
                      background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                      borderLeft: `3px solid ${notif.severity === 'CRITICAL' || notif.severity === 'Fault' ? 'var(--danger)' : 'var(--warning)'}`
                    }}>
                      <div style={{fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.25rem'}}>
                        {notif.machine_id ? String(notif.machine_id).toUpperCase() : 'UNKNOWN'}
                      </div>
                      <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
                        {notif.message}
                      </div>
                      <span style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>
                        {(() => {
                          let ds = notif.created_at || notif.timestamp || new Date().toISOString();
                          let m = String(ds).match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/);
                          if (!m) return 'N/A';
                          let istTime = Date.UTC(m[1], m[2]-1, m[3], m[4], m[5], m[6]) + (5.5 * 3600000); // Force Vite HMR Cache Bust
                          return new Date(istTime).toLocaleString('en-US', {timeZone: 'UTC', month: 'short', day: '2-digit', hour: '2-digit', minute:'2-digit', second:'2-digit'});
                        })()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <button 
                onClick={() => { setShowNotifications(false); navigate('/alerts'); }}
                style={{
                  background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)',
                  border: 'none', padding: '0.5rem', borderRadius: '0.5rem',
                  cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600
                }}
              >
                View all alerts
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3" style={{borderLeft: '1px solid var(--border-color)', paddingLeft: '1.5rem'}}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <User size={18} color="#fff" />
          </div>
          <div className="flex flex-col">
            <span style={{fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.2}}>Admin</span>
            <span style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>System Operator</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
