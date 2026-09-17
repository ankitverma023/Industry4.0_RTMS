import React, { useState, useEffect } from 'react';
import { User, Shield, Bell, Moon, Sun, Sliders, Thermometer, Zap, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
  const { user, logout } = useAuth();
  
  // UI Preferences
  const [darkTheme, setDarkTheme] = useState(() => {
    return localStorage.getItem('rtms_theme') !== 'light';
  });
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('rtms_theme') === 'dark' || false;
  });

  // Machine Management
  const [machines, setMachines] = useState([]);
  const [newMachine, setNewMachine] = useState({ machine_id: '', name: '', type: 'CNC' });
  const [machineError, setMachineError] = useState('');
  
  const [editingMachineId, setEditingMachineId] = useState(null);
  const [editMachineData, setEditMachineData] = useState({ name: '', type: 'CNC', status: 'Running' });

  // AI Configuration
  const [settings, setSettings] = useState({
    temp_warning_limit: 85,
    temp_critical_limit: 95,
    vib_warning_limit: 10,
    vib_critical_limit: 15
  });
  
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('https://industry4-0-rtms-1.onrender.com/api/settings');
        const data = await res.json();
        if (data && !data.error) {
           setSettings({
             temp_warning_limit: parseFloat(data.temp_warning_limit) || 85,
             temp_critical_limit: parseFloat(data.temp_critical_limit) || 95,
             vib_warning_limit: parseFloat(data.vib_warning_limit) || 10,
             vib_critical_limit: parseFloat(data.vib_critical_limit) || 15
           });
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      } finally {
        setLoading(false);
      }
    };
    const fetchMachines = async () => {
      try {
        const token = localStorage.getItem('rtms_token');
        const res = await fetch('https://industry4-0-rtms-1.onrender.com/api/machines', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setMachines(data);
        }
      } catch (err) {
        console.error('Error fetching machines:', err);
      }
    };
    
    fetchSettings();
    fetchMachines();
  }, []);

  // Handle Theme Change
  useEffect(() => {
    if (darkTheme) {
      document.body.classList.remove('light-theme');
      localStorage.setItem('rtms_theme', 'dark');
    } else {
      document.body.classList.add('light-theme');
      localStorage.setItem('rtms_theme', 'light');
    }
  }, [darkTheme]);


  const handleUpdate = async (key, value) => {
    setSettings(prev => ({...prev, [key]: parseFloat(value)}));
    try {
      await fetch('https://industry4-0-rtms-1.onrender.com/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      });
      setSaveStatus('Saved successfully');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (err) {
      console.error('Failed to save setting:', err);
    }
  };

  const handleAddMachine = async (e) => {
    e.preventDefault();
    setMachineError('');
    try {
      const token = localStorage.getItem('rtms_token');
      const res = await fetch('https://industry4-0-rtms-1.onrender.com/api/machines', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newMachine)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add machine');
      
      setMachines([...machines, data]);
      setNewMachine({ machine_id: '', name: '', type: 'CNC' });
    } catch (err) {
      setMachineError(err.message);
    }
  };

  const handleDeleteMachine = async (id) => {
    if (!window.confirm('Are you sure you want to delete this machine?')) return;
    try {
      const token = localStorage.getItem('rtms_token');
      const res = await fetch(`https://industry4-0-rtms-1.onrender.com/api/machines/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete machine');
      
      setMachines(machines.filter(m => m.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEditMachine = (m) => {
    setEditingMachineId(m.id);
    setEditMachineData({ name: m.name, type: m.type, status: m.status });
  };

  const handleSaveMachine = async (id) => {
    try {
      const token = localStorage.getItem('rtms_token');
      const res = await fetch(`https://industry4-0-rtms-1.onrender.com/api/machines/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editMachineData)
      });
      if (!res.ok) throw new Error('Failed to update machine');
      
      setMachines(machines.map(m => m.id === id ? { ...m, ...editMachineData } : m));
      setEditingMachineId(null);
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-full"><div className="pulse-dot" style={{transform: 'scale(2)'}}></div></div>;

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1>System Settings</h1>
          <p style={{color: 'var(--text-secondary)'}}>Configure your account, preferences, and AI engine</p>
        </div>
        {saveStatus && (
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontWeight: 600, animation: 'fadeIn 0.3s'}}>
            <CheckCircle size={18} /> {saveStatus}
          </div>
        )}
      </div>

      <div className="grid" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem'}}>
        
        {/* Profile Card */}
        <div className="glass-panel">
          <div className="flex items-center gap-3 mb-6 border-b pb-4" style={{borderColor: 'var(--border-color)'}}>
            <User size={24} color="var(--accent-blue)" />
            <h2 style={{margin: 0}}>Profile Information</h2>
          </div>
          
          <div className="flex flex-col gap-4">
            <div>
              <label style={{display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase'}}>Username</label>
              <div style={{padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem', border: '1px solid var(--border-color)'}}>
                {user?.username || 'admin'}
              </div>
            </div>
            <div>
              <label style={{display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase'}}>Role</label>
              <div style={{padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <Shield size={16} color="var(--accent-purple)" /> Administrator
              </div>
            </div>
          </div>
        </div>

        {/* Preferences Card */}
        <div className="glass-panel">
          <div className="flex items-center gap-3 mb-6 border-b pb-4" style={{borderColor: 'var(--border-color)'}}>
            <Sun size={24} color="var(--warning)" />
            <h2 style={{margin: 0}}>Preferences</h2>
          </div>

          <div className="flex flex-col gap-4">
            <div 
              className="flex justify-between items-center p-3 cursor-pointer" 
              style={{background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem', border: '1px solid var(--border-color)'}}
              onClick={() => setDarkTheme(!darkTheme)}
            >
              <div className="flex items-center gap-3">
                <Moon size={20} color="var(--text-secondary)" />
                <span>Dark Theme</span>
              </div>
              <div style={{width: '40px', height: '20px', background: darkTheme ? 'var(--accent-blue)' : 'var(--bg-secondary)', borderRadius: '10px', position: 'relative', border: darkTheme ? 'none' : '1px solid var(--border-color)'}}>
                <div style={{position: 'absolute', left: darkTheme ? '22px' : '2px', top: '2px', width: '16px', height: '16px', background: darkTheme ? '#fff' : 'var(--text-secondary)', borderRadius: '50%', transition: 'left 0.2s'}}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MACHINE MANAGEMENT */}
      <div className="glass-panel">
        <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', paddingBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem'}}>
           <Sliders size={20} color="var(--accent-blue)" />
           <h2 style={{margin: 0}}>Machine Registry (Admin)</h2>
        </div>
        
        {machineError && <div style={{color: 'var(--danger)', marginBottom: '1rem'}}>{machineError}</div>}
        
        <form onSubmit={handleAddMachine} style={{display: 'flex', gap: '1rem', marginBottom: '2rem'}}>
          <input 
            type="text" placeholder="Machine ID (e.g. cnc-10)" required
            value={newMachine.machine_id} onChange={e => setNewMachine({...newMachine, machine_id: e.target.value})}
            style={{flex: 1, padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)', color: 'var(--text-primary)'}}
          />
          <input 
            type="text" placeholder="Display Name (e.g. Haas VF-2)" required
            value={newMachine.name} onChange={e => setNewMachine({...newMachine, name: e.target.value})}
            style={{flex: 1, padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)', color: 'var(--text-primary)'}}
          />
          <select 
            value={newMachine.type} onChange={e => setNewMachine({...newMachine, type: e.target.value})}
            style={{padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)', color: 'var(--text-primary)'}}
          >
            <option value="CNC">CNC</option>
            <option value="Robot">Robot</option>
            <option value="Conveyor">Conveyor</option>
          </select>
          <button type="submit" style={{padding: '0 1.5rem', background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer'}}>
            Add Machine
          </button>
        </form>

        <div style={{overflowX: 'auto'}}>
          <table className="rtms-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Type</th>
                <th>Status</th>
                <th style={{textAlign: 'right'}}>Action</th>
              </tr>
            </thead>
            <tbody>
              {machines.map(m => (
                <tr key={m.id}>
                  <td>{m.machine_id}</td>
                  
                  {editingMachineId === m.id ? (
                    <>
                      <td>
                        <input type="text" value={editMachineData.name} onChange={e => setEditMachineData({...editMachineData, name: e.target.value})} style={{padding: '0.25rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)'}} />
                      </td>
                      <td>
                        <select value={editMachineData.type} onChange={e => setEditMachineData({...editMachineData, type: e.target.value})} style={{padding: '0.25rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)'}}>
                          <option value="CNC">CNC</option>
                          <option value="Robot">Robot</option>
                          <option value="Conveyor">Conveyor</option>
                        </select>
                      </td>
                      <td>
                        <select value={editMachineData.status} onChange={e => setEditMachineData({...editMachineData, status: e.target.value})} style={{padding: '0.25rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)'}}>
                          <option value="Running">Running</option>
                          <option value="Idle">Idle</option>
                          <option value="Warning">Warning</option>
                          <option value="Fault">Fault</option>
                        </select>
                      </td>
                      <td style={{textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end'}}>
                        <button onClick={() => handleSaveMachine(m.id)} style={{padding: '0.4rem 0.8rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', border: '1px solid var(--success)', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem'}}>Save</button>
                        <button onClick={() => setEditingMachineId(null)} style={{padding: '0.4rem 0.8rem', background: 'rgba(255, 255, 255, 0.1)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem'}}>Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{m.name}</td>
                      <td>{m.type}</td>
                      <td><span className={`status-badge status-${m.status.toLowerCase()}`}>{m.status}</span></td>
                      <td style={{textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end'}}>
                        <button onClick={() => handleEditMachine(m)} style={{padding: '0.4rem 0.8rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)', border: '1px solid var(--accent-blue)', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem'}}>Edit</button>
                        <button onClick={() => handleDeleteMachine(m.id)} style={{padding: '0.4rem 0.8rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem'}}>Delete</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI ALERT CONFIGURATOR */}
      <div className="glass-panel">
        <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', paddingBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem'}}>
           <Sliders size={20} color="var(--accent-purple)" />
           <h2 style={{margin: 0}}>AI Alert Intelligence Limits</h2>
        </div>
        
        <p style={{color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.6}}>
          Adjust the physical tolerance limits for the predictive maintenance engine. 
          When a machine crosses a <strong>Warning</strong> limit, it generates a high-priority yellow alert. 
          When a machine crosses a <strong>Critical</strong> limit, it generates an immediate red fault alert.
          Changes made here take effect globally within 5 seconds.
        </p>

        <div style={{display: 'flex', flexDirection: 'column', gap: '2.5rem'}}>
          
          {/* TEMPERATURE LIMITS */}
          <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
            <h3 style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', margin: 0}}>
              <Thermometer size={18} color="var(--danger)" /> Thermal Tolerances (°C)
            </h3>
            
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem'}}>
               <div style={{background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem'}}>
                     <span style={{color: 'var(--warning)', fontWeight: 600}}>Warning Limit</span>
                     <span style={{fontWeight: 800, fontSize: '1.25rem'}}>{settings.temp_warning_limit}°C</span>
                  </div>
                  <input 
                    type="range" min="60" max="110" step="1" 
                    value={settings.temp_warning_limit} 
                    onChange={(e) => handleUpdate('temp_warning_limit', e.target.value)}
                    style={{width: '100%', accentColor: 'var(--warning)'}}
                  />
                  <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)'}}>
                    <span>60°C</span><span>110°C</span>
                  </div>
               </div>
               
               <div style={{background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem'}}>
                     <span style={{color: 'var(--danger)', fontWeight: 600}}>Critical Limit</span>
                     <span style={{fontWeight: 800, fontSize: '1.25rem'}}>{settings.temp_critical_limit}°C</span>
                  </div>
                  <input 
                    type="range" min="70" max="130" step="1" 
                    value={settings.temp_critical_limit} 
                    onChange={(e) => handleUpdate('temp_critical_limit', e.target.value)}
                    style={{width: '100%', accentColor: 'var(--danger)'}}
                  />
                  <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)'}}>
                    <span>70°C</span><span>130°C</span>
                  </div>
               </div>
            </div>
          </div>

          <div style={{height: '1px', background: 'var(--border-color)'}}></div>

          {/* VIBRATION LIMITS */}
          <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
            <h3 style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', margin: 0}}>
              <Zap size={18} color="var(--warning)" /> Kinetic Vibration Tolerances (mm/s)
            </h3>
            
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem'}}>
               <div style={{background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem'}}>
                     <span style={{color: 'var(--warning)', fontWeight: 600}}>Warning Limit</span>
                     <span style={{fontWeight: 800, fontSize: '1.25rem'}}>{settings.vib_warning_limit} mm/s</span>
                  </div>
                  <input 
                    type="range" min="2" max="25" step="0.5" 
                    value={settings.vib_warning_limit} 
                    onChange={(e) => handleUpdate('vib_warning_limit', e.target.value)}
                    style={{width: '100%', accentColor: 'var(--warning)'}}
                  />
                  <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)'}}>
                    <span>2.0</span><span>25.0</span>
                  </div>
               </div>
               
               <div style={{background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem'}}>
                     <span style={{color: 'var(--danger)', fontWeight: 600}}>Critical Limit</span>
                     <span style={{fontWeight: 800, fontSize: '1.25rem'}}>{settings.vib_critical_limit} mm/s</span>
                  </div>
                  <input 
                    type="range" min="5" max="35" step="0.5" 
                    value={settings.vib_critical_limit} 
                    onChange={(e) => handleUpdate('vib_critical_limit', e.target.value)}
                    style={{width: '100%', accentColor: 'var(--danger)'}}
                  />
                  <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)'}}>
                    <span>5.0</span><span>35.0</span>
                  </div>
               </div>
            </div>
          </div>

        </div>
      </div>

      <div className="glass-panel" style={{borderColor: 'var(--danger)', background: 'rgba(239, 68, 68, 0.05)'}}>
        <h2 style={{color: 'var(--danger)', margin: '0 0 1rem 0'}}>Danger Zone</h2>
        <p style={{color: 'var(--text-secondary)', marginBottom: '1.5rem'}}>Sign out of the application or clear your local cache.</p>
        <button 
          onClick={logout}
          style={{
            padding: '0.75rem 1.5rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)',
            border: '1px solid var(--danger)', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer'
          }}
        >
          Sign Out
        </button>
      </div>

    </div>
  );
};

export default Settings;
