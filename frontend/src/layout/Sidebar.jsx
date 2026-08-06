import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Activity, AlertTriangle, Settings, Wrench, Battery, ShieldCheck, Factory, FileText, Brain, Users, Sliders } from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className="sidebar">
      <div className="sidebar-logo" style={{ padding: '0.5rem', display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
        <img src="/logo.png" alt="RTMS Logo" style={{ width: '100%', maxWidth: '180px', objectFit: 'contain', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }} />
      </div>
      <nav className="sidebar-nav">
        <Link to="/" className={`nav-item ${currentPath === '/' ? 'active' : ''}`}>
          <LayoutDashboard size={20} />
          <span>Plant Overview</span>
        </Link>
        <Link to="/monitoring" className={`nav-item ${currentPath === '/monitoring' ? 'active' : ''}`}>
          <Activity size={20} />
          <span>Live Monitoring</span>
        </Link>
        <Link to="/production" className={`nav-item ${currentPath === '/production' ? 'active' : ''}`}>
          <Sliders size={20} />
          <span>Production Control</span>
        </Link>
        <Link to="/alerts" className={`nav-item ${currentPath === '/alerts' ? 'active' : ''}`}>
          <AlertTriangle size={20} />
          <span>Alert Intelligence</span>
        </Link>
        <Link to="/maintenance" className={`nav-item ${currentPath === '/maintenance' ? 'active' : ''}`}>
          <Wrench size={20} />
          <span>Predictive Maintenance</span>
        </Link>
        <Link to="/energy" className={`nav-item ${currentPath === '/energy' ? 'active' : ''}`}>
          <Battery size={20} />
          <span>Energy Monitoring</span>
        </Link>
        <Link to="/reports" className={`nav-item ${currentPath === '/reports' ? 'active' : ''}`}>
          <FileText size={20} />
          <span>Advanced Reporting</span>
        </Link>
        <Link to="/forecasting" className={`nav-item ${currentPath === '/forecasting' ? 'active' : ''}`}>
          <Brain size={20} />
          <span>AI Forecasting</span>
        </Link>
        <Link to="/floor-map" className={`nav-item ${currentPath === '/floor-map' ? 'active' : ''}`}>
          <Factory size={20} />
          <span>Factory Floor</span>
        </Link>
        <Link to="/staff" className={`nav-item ${currentPath === '/staff' ? 'active' : ''}`}>
          <Users size={20} />
          <span>Staff Directory</span>
        </Link>
        <Link to="/settings" className={`nav-item ${currentPath === '/settings' ? 'active' : ''}`}>
          <Settings size={20} />
          <span>System Settings</span>
        </Link>
      </nav>
    </div>
  );
};

export default Sidebar;
