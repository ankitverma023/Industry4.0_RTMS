import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import { AuthProvider } from './context/AuthContext';
import MainLayout from './layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Monitoring from './pages/Monitoring';
import Alerts from './pages/Alerts';
import Maintenance from './pages/Maintenance';
import Energy from './pages/Energy';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import FloorMap from './pages/FloorMap';
import Forecasting from './pages/Forecasting';
import ProductionControl from './pages/ProductionControl';
import Staff from './pages/Staff';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import './index.css';

function App() {
  React.useEffect(() => {
    if (localStorage.getItem('rtms_theme') === 'light') {
      document.body.classList.add('light-theme');
    }
  }, []);

  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<MainLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="monitoring" element={<Monitoring />} />
                <Route path="alerts" element={<Alerts />} />
                <Route path="maintenance" element={<Maintenance />} />
                <Route path="energy" element={<Energy />} />
                <Route path="reports" element={<Reports />} />
                <Route path="production" element={<ProductionControl />} />
                <Route path="floor-map" element={<FloorMap />} />
                <Route path="forecasting" element={<Forecasting />} />
                <Route path="staff" element={<Staff />} />
                <Route path="settings" element={<Settings />} />
                <Route path="*" element={<div style={{padding: '2rem'}}>Page under construction</div>} />
              </Route>
            </Route>
          </Routes>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
