import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { Play, Pause, AlertOctagon, Send, ListTree, Sliders, Clock } from 'lucide-react';

const ProductionControl = () => {
  const { machineData, socket } = useSocket();
  const [orders, setOrders] = useState([]);
  const [plantTarget] = useState(50000);
  
  const [dispatchForm, setDispatchForm] = useState({
    machine_id: '',
    recipe: 'Aluminum Casing A4',
    target: 1000
  });

  // Fetch initial orders
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch('http://localhost:5002/api/production/work-orders');
        const data = await res.json();
        if (Array.isArray(data)) setOrders(data);
      } catch (err) {
        console.error('Error fetching work orders', err);
      }
    };
    fetchOrders();
  }, []);

  // Listen to live backend simulation ticks
  useEffect(() => {
    if (!socket) return;
    const handleProduction = (data) => {
      if (Array.isArray(data)) setOrders(data);
    };
    socket.on('production_data', handleProduction);
    return () => socket.off('production_data', handleProduction);
  }, [socket]);

  const handleDispatch = async (e) => {
    e.preventDefault();
    if (!dispatchForm.machine_id) return alert("Select a machine first!");
    
    try {
      const res = await fetch('http://localhost:5002/api/production/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machine_id: dispatchForm.machine_id,
          recipe: dispatchForm.recipe,
          target: parseInt(dispatchForm.target)
        })
      });
      if (res.ok) {
        const newOrder = await res.json();
        setOrders(prev => [...prev, newOrder]);
        const btn = document.getElementById('dispatch-btn');
        const oldText = btn.innerHTML;
        btn.innerHTML = '<span style="display:flex;align-items:center;gap:0.5rem">Added to Queue!</span>';
        btn.style.background = 'var(--success)';
        setTimeout(() => {
           btn.innerHTML = oldText;
           btn.style.background = 'var(--accent-blue)';
        }, 2000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOverride = async (machineId, action) => {
    // action: 'Running', 'Paused', 'Fault'
    let targetStatus = action === 'start' ? 'Running' : (action === 'pause' ? 'Paused' : 'Fault');
    try {
      await fetch('http://localhost:5002/api/production/machine-override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machine_id: machineId, status: targetStatus })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const setSpeed = async (orderId, newSpeed) => {
    try {
      await fetch(`http://localhost:5002/api/production/speed/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speed: parseInt(newSpeed) })
      });
      // Optimistically update
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, speed: parseInt(newSpeed) } : o));
    } catch (err) {
      console.error(err);
    }
  };

  const currentYield = orders.reduce((acc, o) => acc + (o.completed || 0), 0);
  const yieldPercent = Math.min(100, Math.round((currentYield / plantTarget) * 100));

  return (
    <div className="flex flex-col gap-6" style={{height: '100%'}}>
      
      {/* SHIFT QUOTA PROGRESS */}
      <div className="glass-panel" style={{display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1.25rem'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end'}}>
          <div>
            <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: '0.25rem'}}>Plant Shift Quota</div>
            <div style={{fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1}}>
              {currentYield.toLocaleString()} <span style={{fontSize: '1rem', color: 'var(--text-muted)'}}>/ {plantTarget.toLocaleString()} Units</span>
            </div>
          </div>
          <div style={{fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-purple)'}}>
            {yieldPercent}%
          </div>
        </div>
        <div style={{width: '100%', height: '10px', background: 'var(--bg-primary)', borderRadius: '5px', overflow: 'hidden'}}>
          <div style={{height: '100%', width: `${yieldPercent}%`, background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-purple))', transition: 'width 1s ease-out'}}></div>
        </div>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem', flex: 1}}>
        
        {/* JOB DISPATCH PANEL */}
        <div className="glass-panel" style={{display: 'flex', flexDirection: 'column'}}>
           <div style={{paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
             <Send size={16} color="var(--accent-blue)" />
             <h3 style={{margin: 0, fontSize: '1rem'}}>Batch Dispatcher</h3>
           </div>
           
           <form onSubmit={handleDispatch} style={{display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1}}>
              <div style={{display: 'flex', flexDirection: 'column', gap: '0.4rem'}}>
                <label style={{fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase'}}>Target Machine</label>
                <select 
                  className="glass-panel" 
                  style={{padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', outline: 'none', background: 'var(--bg-primary)'}}
                  value={dispatchForm.machine_id}
                  onChange={e => setDispatchForm({...dispatchForm, machine_id: e.target.value})}
                  required
                >
                  <option value="">-- Select Machine --</option>
                  {(Array.isArray(machineData) ? machineData : []).map(m => m && m.machine_id ? (
                    <option key={m.machine_id} value={m.machine_id}>{m.name || m.machine_id}</option>
                  ) : null)}
                </select>
              </div>

              <div style={{display: 'flex', flexDirection: 'column', gap: '0.4rem'}}>
                <label style={{fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase'}}>Recipe (Product)</label>
                <select 
                  className="glass-panel" 
                  style={{padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', outline: 'none', background: 'var(--bg-primary)'}}
                  value={dispatchForm.recipe}
                  onChange={e => setDispatchForm({...dispatchForm, recipe: e.target.value})}
                >
                  <option value="Aluminum Casing A4">Aluminum Casing A4</option>
                  <option value="Steel Bracket v2">Steel Bracket v2</option>
                  <option value="Titanium Rotor">Titanium Rotor</option>
                  <option value="Polymer Housing">Polymer Housing</option>
                </select>
              </div>

              <div style={{display: 'flex', flexDirection: 'column', gap: '0.4rem'}}>
                <label style={{fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase'}}>Quota (Units)</label>
                <input 
                  type="number" 
                  className="glass-panel"
                  style={{padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', outline: 'none', background: 'var(--bg-primary)'}}
                  value={dispatchForm.target}
                  onChange={e => setDispatchForm({...dispatchForm, target: e.target.value})}
                  min="1"
                  required
                />
              </div>

              <div style={{marginTop: 'auto', paddingTop: '1rem'}}>
                 <button id="dispatch-btn" type="submit" style={{width: '100%', padding: '0.75rem', background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', transition: 'background 0.2s'}}>
                    <ListTree size={16} />
                    Queue Work Order
                 </button>
              </div>
           </form>
        </div>

        {/* MACHINE OVERRIDES & TIMELINES */}
        <div className="glass-panel" style={{display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
           <div style={{paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
             <Sliders size={16} color="var(--warning)" />
             <h3 style={{margin: 0, fontSize: '1rem'}}>Advanced Asset Control Matrix</h3>
           </div>
           
           <div style={{flex: 1, overflowY: 'auto', paddingRight: '0.5rem'}}>
              <table style={{width: '100%', borderCollapse: 'collapse', marginTop: '0.5rem'}}>
                <thead>
                  <tr style={{borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-secondary)'}}>
                    <th style={{padding: '0.75rem 0.5rem', fontSize: '0.75rem', textTransform: 'uppercase'}}>Machine</th>
                    <th style={{padding: '0.75rem 0.5rem', fontSize: '0.75rem', textTransform: 'uppercase', width: '35%'}}>Production Timeline (Gantt)</th>
                    <th style={{padding: '0.75rem 0.5rem', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'center'}}>Yield %</th>
                    <th style={{padding: '0.75rem 0.5rem', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'center'}}>Speed Limit</th>
                    <th style={{padding: '0.75rem 0.5rem', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'right'}}>Override</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(machineData) ? machineData : []).map(m => {
                    if (!m || !m.machine_id) return null;
                    
                    // Get queue for this machine
                    const machineOrders = orders.filter(o => o.machine_id === m.machine_id && o.status !== 'completed');
                    const activeJob = machineOrders.find(o => o.status === 'running') || machineOrders[0];
                    const queueCount = machineOrders.length > 1 ? machineOrders.length - 1 : 0;
                    
                    let yieldPercent = 100;
                    if (activeJob && activeJob.completed > 0) {
                       yieldPercent = Math.round(((activeJob.completed - activeJob.defects) / activeJob.completed) * 100);
                    }

                    return (
                      <tr key={m.machine_id} style={{borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                        <td style={{padding: '1rem 0.5rem'}}>
                          <div style={{display: 'flex', flexDirection: 'column'}}>
                            <span style={{fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.9rem'}}>{m.name || m.machine_id}</span>
                            <span style={{
                              fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', marginTop: '0.25rem',
                              color: m.status === 'Running' ? 'var(--success)' : m.status === 'Paused' ? 'var(--warning)' : 'var(--danger)'
                            }}>{m.status}</span>
                          </div>
                        </td>
                        
                        {/* TIMELINE / GANTT */}
                        <td style={{padding: '1rem 0.5rem'}}>
                          {!activeJob ? (
                            <div style={{fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                               <Clock size={12} /> Machine Idle
                            </div>
                          ) : (
                            <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                              <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem'}}>
                                <span style={{color: 'var(--text-primary)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px'}} title={activeJob.recipe}>{activeJob.recipe}</span>
                                <span style={{color: 'var(--text-secondary)'}}>{activeJob.completed} / {activeJob.target}</span>
                              </div>
                              <div style={{display: 'flex', gap: '4px', height: '14px'}}>
                                 <div style={{flex: 2, background: 'var(--bg-primary)', borderRadius: '3px', position: 'relative', overflow: 'hidden'}}>
                                    <div style={{position: 'absolute', top: 0, left: 0, bottom: 0, width: `${(activeJob.completed / activeJob.target)*100}%`, background: m.status === 'Running' ? 'var(--accent-purple)' : 'var(--text-muted)', transition: 'width 0.5s ease-out'}}></div>
                                 </div>
                                 {Array.from({length: queueCount}).map((_, i) => (
                                    <div key={i} style={{flex: 0.5, background: 'rgba(255,255,255,0.05)', border: '1px dashed var(--border-color)', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                       <span style={{fontSize: '0.55rem', color: 'var(--text-muted)'}}>Q{i+1}</span>
                                    </div>
                                 ))}
                              </div>
                            </div>
                          )}
                        </td>

                        {/* YIELD */}
                        <td style={{padding: '1rem 0.5rem', textAlign: 'center'}}>
                          {activeJob ? (
                             <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                                <span style={{fontSize: '1rem', fontWeight: 800, color: yieldPercent > 95 ? 'var(--success)' : yieldPercent > 90 ? 'var(--warning)' : 'var(--danger)'}}>{yieldPercent}%</span>
                                {activeJob.defects > 0 && <span style={{fontSize: '0.65rem', color: 'var(--danger)'}}>{activeJob.defects} Scrap</span>}
                             </div>
                          ) : '-'}
                        </td>

                        {/* SPEED SLIDER */}
                        <td style={{padding: '1rem 0.5rem'}}>
                           {activeJob ? (
                             <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center'}}>
                               <div style={{display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.65rem', color: 'var(--text-secondary)'}}>
                                 <span>50%</span>
                                 <span style={{fontWeight: 800, color: activeJob.speed > 150 ? 'var(--warning)' : 'var(--accent-blue)'}}>{activeJob.speed}%</span>
                                 <span>250%</span>
                               </div>
                               <input 
                                 type="range" min="50" max="250" step="10" 
                                 value={activeJob.speed} 
                                 onChange={(e) => setSpeed(activeJob.id, e.target.value)}
                                 style={{width: '100%', cursor: 'ew-resize', accentColor: activeJob.speed > 150 ? 'var(--warning)' : 'var(--accent-blue)'}}
                               />
                             </div>
                           ) : (
                             <span style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>N/A</span>
                           )}
                        </td>

                        {/* OVERRIDES */}
                        <td style={{padding: '1rem 0.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', alignItems: 'center'}}>
                          <button 
                            onClick={() => handleOverride(m.machine_id, 'start')}
                            style={{background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.4rem', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s', opacity: m.status === 'Running' ? 0.3 : 1}}
                            disabled={m.status === 'Running'}
                          >
                            <Play size={14} />
                          </button>
                          <button 
                            onClick={() => handleOverride(m.machine_id, 'pause')}
                            style={{background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '0.4rem', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s', opacity: m.status === 'Paused' ? 0.3 : 1}}
                            disabled={m.status === 'Paused'}
                          >
                            <Pause size={14} />
                          </button>
                          <button 
                            onClick={() => handleOverride(m.machine_id, 'estop')}
                            style={{background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '0.4rem', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s'}}
                          >
                            <AlertOctagon size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
           </div>
        </div>

      </div>
    </div>
  );
};

export default ProductionControl;
