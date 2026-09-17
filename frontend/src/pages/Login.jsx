import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, User, AlertCircle } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const result = await login(username, password);
      
      if (result.success) {
        navigate('/');
      } else {
        setError(result.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('Server error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen" style={{
      background: 'var(--bg-primary)',
      backgroundImage: 'radial-gradient(circle at top right, rgba(99, 102, 241, 0.08), transparent 40%), radial-gradient(circle at bottom left, rgba(59, 130, 246, 0.08), transparent 40%)',
      position: 'relative'
    }}>
      <div className="glass-panel" style={{width: '100%', maxWidth: '420px', padding: '3rem', position: 'relative', zIndex: 10, border: '1px solid var(--border-color)', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)'}}>
        
        <div className="flex flex-col items-center mb-8">
          <div style={{
            background: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: '50%', 
            marginBottom: '1.5rem', border: '1px solid rgba(59, 130, 246, 0.2)'
          }}>
            <ShieldCheck size={32} color="var(--accent-blue)" />
          </div>
          <h1 style={{fontSize: '1.5rem', marginBottom: '0.25rem', textAlign: 'center', color: 'var(--text-primary)'}}>System Authentication</h1>
          <p style={{color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.875rem'}}>Please enter your credentials to proceed</p>
          
          <div style={{marginTop: '1rem', padding: '0.75rem', width: '100%', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '0.5rem', border: '1px dashed rgba(59, 130, 246, 0.3)'}}>
             <p style={{color: 'var(--text-secondary)', fontSize: '0.75rem', textAlign: 'center', marginBottom: '0.25rem'}}>Demo Operator Account (For Recruiters):</p>
             <p style={{color: 'var(--accent-blue)', fontSize: '0.8rem', textAlign: 'center', fontWeight: 600}}>operator / operator123</p>
          </div>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', 
            padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1.5rem',
            display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)'
          }}>
            <AlertCircle size={16} />
            <span style={{fontSize: '0.875rem', fontWeight: 500}}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div style={{position: 'relative'}}>
            <User size={18} color="var(--text-secondary)" style={{position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)'}} />
            <input 
              type="text" 
              placeholder="Username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%', padding: '0.875rem 1rem 0.875rem 2.75rem',
                background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)',
                borderRadius: '0.5rem', color: 'var(--text-primary)', outline: 'none',
                fontSize: '0.875rem', transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-blue)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
            />
          </div>

          <div style={{position: 'relative'}}>
            <Lock size={18} color="var(--text-secondary)" style={{position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)'}} />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%', padding: '0.875rem 1rem 0.875rem 2.75rem',
                background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)',
                borderRadius: '0.5rem', color: 'var(--text-primary)', outline: 'none',
                fontSize: '0.875rem', transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-blue)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            style={{
              width: '100%', padding: '0.875rem', marginTop: '1rem',
              background: 'var(--accent-blue)',
              color: '#fff', border: 'none', borderRadius: '0.5rem',
              fontWeight: 600, fontSize: '0.875rem', cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s ease',
              opacity: isLoading ? 0.8 : 1
            }}
            onMouseOver={(e) => { if (!isLoading) e.target.style.background = '#2563eb' }}
            onMouseOut={(e) => { if (!isLoading) e.target.style.background = 'var(--accent-blue)' }}
          >
            {isLoading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
