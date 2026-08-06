import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, UserPlus, Trash2, Shield, User, Eye, AlertCircle } from 'lucide-react';

const Staff = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'operator' });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  
  const [editingUserId, setEditingUserId] = useState(null);
  const [editUserData, setEditUserData] = useState({ username: '', role: 'operator', password: '' });

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('rtms_token');
      const res = await fetch('http://localhost:5002/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        const err = await res.json();
        setError(err.message || 'Failed to fetch users');
      }
    } catch (err) {
      setError('Server connection error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
    } else {
      setLoading(false);
      setError('Access Denied: You must be an Administrator to view the Staff Directory.');
    }
  }, [user]);

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password) return;
    
    setAddLoading(true);
    setAddError('');
    
    try {
      const token = localStorage.getItem('rtms_token');
      const res = await fetch('http://localhost:5002/api/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(newUser)
      });
      
      const data = await res.json();
      if (res.ok) {
        setNewUser({ username: '', password: '', role: 'operator' });
        fetchUsers();
      } else {
        setAddError(data.message || 'Failed to add user');
      }
    } catch (err) {
      setAddError('Server error while adding user');
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteUser = async (id, role) => {
    if (!window.confirm(`Are you sure you want to permanently delete this ${role} account?`)) return;
    
    try {
      const token = localStorage.getItem('rtms_token');
      const res = await fetch(`http://localhost:5002/api/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to delete user');
      }
    } catch (err) {
      alert('Server error while deleting user');
    }
  };

  const handleEditUser = (u) => {
    setEditingUserId(u.id);
    setEditUserData({ username: u.username, role: u.role, password: '' });
  };

  const handleSaveUser = async (id) => {
    try {
      const token = localStorage.getItem('rtms_token');
      
      const payload = { username: editUserData.username, role: editUserData.role };
      if (editUserData.password) payload.password = editUserData.password;
      
      const res = await fetch(`http://localhost:5002/api/users/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        fetchUsers();
        setEditingUserId(null);
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to update user');
      }
    } catch (err) {
      alert('Server error while updating user');
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return <Shield size={16} color="var(--accent-purple)" />;
      case 'operator': return <User size={16} color="var(--accent-blue)" />;
      case 'viewer': return <Eye size={16} color="var(--success)" />;
      default: return <User size={16} />;
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="glass-panel text-center" style={{padding: '3rem', maxWidth: '400px'}}>
          <Shield size={48} color="var(--danger)" style={{marginBottom: '1rem'}} />
          <h2 style={{color: 'var(--danger)'}}>Access Denied</h2>
          <p style={{color: 'var(--text-secondary)'}}>Only Administrators can access the Staff Directory and User Management module.</p>
        </div>
      </div>
    );
  }

  const admins = users.filter(u => u.role === 'admin').length;
  const operators = users.filter(u => u.role === 'operator').length;
  const viewers = users.filter(u => u.role === 'viewer').length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1>Staff Directory</h1>
          <p style={{color: 'var(--text-secondary)'}}>Manage system access and employee roles</p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-4 gap-6">
        <div className="glass-panel flex flex-col justify-center">
          <h3 style={{fontSize: '0.875rem', color: 'var(--text-muted)'}}>Total Employees</h3>
          <div className="stat-value">{users.length}</div>
        </div>
        <div className="glass-panel flex flex-col justify-center" style={{borderLeft: '4px solid var(--accent-purple)'}}>
          <h3 style={{fontSize: '0.875rem', color: 'var(--text-muted)'}}>Administrators</h3>
          <div className="stat-value">{admins}</div>
        </div>
        <div className="glass-panel flex flex-col justify-center" style={{borderLeft: '4px solid var(--accent-blue)'}}>
          <h3 style={{fontSize: '0.875rem', color: 'var(--text-muted)'}}>Operators</h3>
          <div className="stat-value">{operators}</div>
        </div>
        <div className="glass-panel flex flex-col justify-center" style={{borderLeft: '4px solid var(--success)'}}>
          <h3 style={{fontSize: '0.875rem', color: 'var(--text-muted)'}}>Viewers</h3>
          <div className="stat-value">{viewers}</div>
        </div>
      </div>

      <div className="grid" style={{gridTemplateColumns: '1fr 350px', gap: '1.5rem'}}>
        
        {/* User Table */}
        <div className="glass-panel" style={{padding: 0, overflow: 'hidden'}}>
          <div style={{padding: '1.5rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)'}}>
            <div className="flex items-center gap-3">
              <Users size={24} color="var(--accent-blue)" />
              <h2 style={{margin: 0}}>Active Directory</h2>
            </div>
          </div>
          
          <div style={{padding: '1.5rem', overflowX: 'auto'}}>
            {error ? (
              <div style={{color: 'var(--danger)'}}>{error}</div>
            ) : loading ? (
              <div>Loading directory...</div>
            ) : (
              <table className="rtms-table">
                <thead style={{background: 'rgba(0,0,0,0.2)'}}>
                  <tr>
                    <th style={{paddingLeft: '1.5rem'}}>User ID</th>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td style={{paddingLeft: '1.5rem', color: 'var(--text-muted)'}}>#{u.id}</td>
                      
                      {editingUserId === u.id ? (
                        <>
                          <td>
                            <input type="text" value={editUserData.username} onChange={e => setEditUserData({...editUserData, username: e.target.value})} style={{padding: '0.25rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', width: '100px'}} />
                          </td>
                          <td>
                            <select value={editUserData.role} onChange={e => setEditUserData({...editUserData, role: e.target.value})} style={{padding: '0.25rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-primary)'}}>
                              <option value="operator">Operator</option>
                              <option value="viewer">Viewer</option>
                              <option value="admin">Admin</option>
                            </select>
                            <input type="password" placeholder="New Password" value={editUserData.password} onChange={e => setEditUserData({...editUserData, password: e.target.value})} style={{padding: '0.25rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', width: '100px', marginLeft: '0.5rem'}} />
                          </td>
                          <td style={{display: 'flex', gap: '0.5rem'}}>
                            <button onClick={() => handleSaveUser(u.id)} style={{padding: '0.4rem 0.8rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', border: '1px solid var(--success)', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem'}}>Save</button>
                            <button onClick={() => setEditingUserId(null)} style={{padding: '0.4rem 0.8rem', background: 'rgba(255, 255, 255, 0.1)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem'}}>Cancel</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{fontWeight: 600, color: 'var(--text-primary)'}}>{u.username}</td>
                          <td>
                            <div style={{display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '999px', textTransform: 'capitalize', fontSize: '0.875rem'}}>
                              {getRoleIcon(u.role)}
                              {u.role}
                            </div>
                          </td>
                          <td style={{display: 'flex', gap: '0.5rem'}}>
                            {user.id !== u.id ? (
                              <>
                                <button onClick={() => handleEditUser(u)} style={{background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)', border: 'none', padding: '0.5rem', borderRadius: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}} title="Edit User">
                                  Edit
                                </button>
                                <button onClick={() => handleDeleteUser(u.id, u.role)} style={{background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: 'none', padding: '0.5rem', borderRadius: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}} title="Delete User">
                                  <Trash2 size={16} />
                                </button>
                              </>
                            ) : (
                              <span style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>(You)</span>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Add User Form */}
        <div className="glass-panel" style={{alignSelf: 'start'}}>
          <div className="flex items-center gap-3 mb-6 border-b pb-4" style={{borderColor: 'var(--border-color)'}}>
            <UserPlus size={24} color="var(--success)" />
            <h2 style={{margin: 0}}>Onboard Employee</h2>
          </div>
          
          {addError && (
            <div style={{background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem', border: '1px solid var(--danger)', display: 'flex', gap: '0.5rem'}}>
              <AlertCircle size={16} style={{flexShrink: 0, marginTop: '2px'}} />
              <span style={{fontSize: '0.875rem'}}>{addError}</span>
            </div>
          )}

          <form onSubmit={handleAddUser} className="flex flex-col gap-4">
            <div>
              <label style={{display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase'}}>Username</label>
              <input 
                type="text" required placeholder="e.g. jsmith"
                value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})}
                style={{width: '100%', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', color: 'var(--text-primary)', outline: 'none'}}
              />
            </div>
            <div>
              <label style={{display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase'}}>Temporary Password</label>
              <input 
                type="password" required placeholder="Minimum 6 characters"
                value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}
                style={{width: '100%', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', color: 'var(--text-primary)', outline: 'none'}}
              />
            </div>
            <div>
              <label style={{display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase'}}>Access Role</label>
              <select 
                value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}
                style={{width: '100%', padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', color: 'var(--text-primary)', outline: 'none'}}
              >
                <option value="operator">Operator (Standard)</option>
                <option value="viewer">Viewer (Read Only)</option>
                <option value="admin">Administrator (Full Access)</option>
              </select>
            </div>
            
            <button 
              type="submit" disabled={addLoading}
              style={{
                background: 'linear-gradient(135deg, var(--success), #059669)', marginTop: '1rem',
                color: '#fff', border: 'none', padding: '1rem', borderRadius: '0.5rem',
                fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: addLoading ? 'not-allowed' : 'pointer',
                opacity: addLoading ? 0.7 : 1
              }}
            >
              <UserPlus size={18} /> {addLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default Staff;
