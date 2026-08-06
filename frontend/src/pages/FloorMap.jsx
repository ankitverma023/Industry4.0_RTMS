import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { calculateHealthScore } from '../utils/healthUtils';
import { X, Activity, Thermometer, Gauge, Zap, AlertTriangle, Settings, Move, Check } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Text, Html } from '@react-three/drei';
import * as THREE from 'three';

// 3D Machine Component
const MachineNode = React.memo(({ machine, defaultPosition, onClick, isSelected, isEditing, onDragStart, onDragEnd }) => {
  const groupRef = useRef();
  const materialRef = useRef();
  const [isDragging, setIsDragging] = useState(false);
  const dragPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  
  const health = calculateHealthScore(machine);
  
  let baseColor = '#10b981'; // success
  let emissiveIntensity = 0.5;
  
  if (health < 50 || machine.status === 'Fault') {
    baseColor = '#ef4444'; // danger
    emissiveIntensity = 1.2;
  } else if (health < 80 || machine.status === 'Warning') {
    baseColor = '#f59e0b'; // warning
    emissiveIntensity = 0.8;
  }
  
  if (machine.status === 'Idle') {
    baseColor = '#94a3b8'; // gray
    emissiveIntensity = 0.2;
  }

  useEffect(() => {
    if (groupRef.current && !isDragging) {
      groupRef.current.position.set(defaultPosition[0], defaultPosition[1], defaultPosition[2]);
    }
  }, [defaultPosition[0], defaultPosition[1], defaultPosition[2], isDragging]);

  // Handle global mouse up to ensure we always drop the machine even if the mouse leaves the canvas
  useEffect(() => {
    const handleWindowPointerUp = () => {
      if (isDragging && groupRef.current) {
        setIsDragging(false);
        onDragEnd(machine.machine_id, [groupRef.current.position.x, 0, groupRef.current.position.z]);
      }
    };
    
    if (isDragging) {
      window.addEventListener('pointerup', handleWindowPointerUp);
    }
    return () => {
      window.removeEventListener('pointerup', handleWindowPointerUp);
    };
  }, [isDragging, machine.machine_id, onDragEnd]);

  useFrame((state) => {
    // Animate pulse for faulty machines
    if (health < 50 && materialRef.current) {
      const t = state.clock.getElapsedTime();
      materialRef.current.emissiveIntensity = 1 + Math.sin(t * 8) * 0.8;
    }
    
    // Slight idle hovering (only when not dragging)
    if (groupRef.current && !isDragging && !isEditing) {
      groupRef.current.position.y = Math.sin(state.clock.getElapsedTime() * 2 + defaultPosition[0]) * 0.05;
    }

    // Drag Logic (bypasses React state for smooth 60FPS)
    if (isEditing && isDragging && groupRef.current) {
      const pointer = state.pointer || state.mouse;
      if (pointer) {
        state.raycaster.setFromCamera(pointer, state.camera);
        const point = new THREE.Vector3();
        const intersect = state.raycaster.ray.intersectPlane(dragPlane, point);
        if (intersect) {
          groupRef.current.position.x = point.x;
          groupRef.current.position.z = point.z;
          groupRef.current.position.y = 0.5; // Lift up slightly while dragging
        }
      }
    }
  });

  return (
    <group 
      ref={groupRef}
      onClick={(e) => { e.stopPropagation(); onClick(machine); }}
      onPointerDown={(e) => { 
        e.stopPropagation(); 
        if (isEditing) {
          setIsDragging(true);
          onDragStart();
        }
      }}
      style={{ cursor: isEditing ? (isDragging ? 'grabbing' : 'grab') : 'pointer' }}
    >
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[1, 1.2, 1]} />
        <meshStandardMaterial 
          ref={materialRef}
          color={baseColor} 
          emissive={baseColor}
          emissiveIntensity={isSelected ? emissiveIntensity + 0.5 : emissiveIntensity}
          metalness={0.8}
          roughness={0.2}
          transparent={true}
          opacity={0.9}
        />
      </mesh>
      
      {/* Selection outline/ring */}
      {isSelected && (
        <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.8, 1, 32]} />
          <meshBasicMaterial color="#3b82f6" side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Floating UI Label */}
      <Html position={[0, 1.2, 0]} center style={{ pointerEvents: 'none', transition: 'all 0.2s', opacity: isSelected ? 1 : 0.7 }}>
        <div style={{
          background: 'rgba(0,0,0,0.8)',
          border: `1px solid ${baseColor}`,
          padding: '4px 8px',
          borderRadius: '4px',
          color: '#fff',
          fontSize: '12px',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
          textTransform: 'uppercase',
          boxShadow: `0 0 10px ${baseColor}`
        }}>
          {machine.machine_id}
        </div>
      </Html>
    </group>
  );
});

// Floor Grid Component
const FactoryFloor = () => {
  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]}>
        <planeGeometry args={[1000, 1000]} />
        <meshStandardMaterial color="#0f172a" metalness={0.5} roughness={0.5} />
      </mesh>
      <gridHelper args={[1000, 1000, '#334155', '#1e293b']} position={[0, -0.59, 0]} />
    </group>
  );
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return <div style={{padding: '2rem', color: 'red'}}><h1>Something went wrong.</h1><pre>{this.state.error.toString()}</pre></div>;
    }
    return this.props.children;
  }
}

const FloorMap = () => {
  const { machineData } = useSocket();
  const [selectedMachineId, setSelectedMachineId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isGlobalDragging, setIsGlobalDragging] = useState(false);
  const OrbitControlsRef = useRef(null);
  
  // Persistent layout positions
  const [savedPositions, setSavedPositions] = useState(() => {
    try {
      const saved = localStorage.getItem('rtms_floor_positions_3d');
      return saved ? JSON.parse(saved) : {};
    } catch(e) {
      return {};
    }
  });

  const getMachinePosition = (m, idx) => {
    if (savedPositions && Array.isArray(savedPositions[m.machine_id]) && savedPositions[m.machine_id].length === 3) {
      const pos = savedPositions[m.machine_id];
      // Guard against corrupted localStorage saving NaN or null which instantly crashes WebGL
      if (typeof pos[0] === 'number' && typeof pos[2] === 'number' && !isNaN(pos[0]) && !isNaN(pos[2])) {
        return pos;
      }
    }
    // Spread machines out more (8 units apart)
    const x = (idx % 3) * 8 - 8;
    const z = Math.floor(idx / 3) * 8 - 8;
    return [x, 0, z];
  };

  const handleSavePosition = (id, pos) => {
    setSavedPositions(prev => {
      const updated = { ...prev, [id]: pos };
      localStorage.setItem('rtms_floor_positions_3d', JSON.stringify(updated));
      return updated;
    });
    setIsGlobalDragging(false);
  };

  const selectedMachineData = Array.isArray(machineData) ? machineData.find(m => m && m.machine_id === selectedMachineId) : null;

  return (
    <ErrorBoundary>
    <div className="flex flex-col gap-6 h-full min-h-[85vh]">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1>3D Digital Twin</h1>
          <p style={{color: 'var(--text-secondary)'}}>Real-time 3D spatial representation of factory assets</p>
        </div>
        <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
           {!isEditing && (
             <>
               <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
                  <div style={{width: '12px', height: '12px', background: '#10b981', borderRadius: '50%'}}></div> Optimal
               </div>
               <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
                  <div style={{width: '12px', height: '12px', background: '#f59e0b', borderRadius: '50%'}}></div> Warning
               </div>
               <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
                  <div style={{width: '12px', height: '12px', background: '#ef4444', borderRadius: '50%'}}></div> Critical
               </div>
             </>
           )}
           
           {isEditing && <span style={{color: 'var(--warning)', fontWeight: 600, fontSize: '0.875rem', animation: 'blink 2s infinite'}}>Editing Layout Mode</span>}
           <button 
             onClick={() => setIsEditing(!isEditing)}
             style={{
               background: isEditing ? 'rgba(245, 158, 11, 0.1)' : 'var(--bg-tertiary)', 
               color: isEditing ? 'var(--warning)' : 'var(--text-primary)', 
               border: isEditing ? '1px solid var(--warning)' : '1px solid var(--border-color)',
               padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer',
               transition: 'all 0.2s ease', fontSize: '0.875rem'
             }}
           >
             {isEditing ? <Check size={16} /> : <Settings size={16} />}
             {isEditing ? 'Done Editing' : 'Edit Layout'}
           </button>
        </div>
      </div>

      <div style={{position: 'relative', display: 'flex', gap: '1.5rem', flex: 1}}>
        
        {/* 3D Canvas Context */}
        <div 
          className="glass-panel" 
          style={{
            flex: 1, 
            background: 'radial-gradient(circle at center, #1e293b, #020617)', 
            overflow: 'hidden', padding: 0, position: 'relative',
            border: '1px solid var(--border-color)',
            borderRadius: '1rem',
            minHeight: '75vh'
          }}
        >
          <Canvas camera={{ position: [0, 15, 25], fov: 40 }} style={{ position: 'absolute', inset: 0 }}>
            <fog attach="fog" args={['#020617', 20, 100]} />
            <ambientLight intensity={0.6} />
            <pointLight position={[10, 15, 10]} intensity={1.5} color="#ffffff" />
            <pointLight position={[-10, 10, -10]} intensity={1} color="#3b82f6" />
            
            <FactoryFloor />
            
            {(Array.isArray(machineData) ? machineData : []).filter(m => m != null).map((m, idx) => (
              <MachineNode 
                key={m.machine_id}
                machine={m}
                defaultPosition={getMachinePosition(m, idx)}
                isSelected={selectedMachineId === m.machine_id}
                isEditing={isEditing}
                onClick={(machine) => !isEditing && setSelectedMachineId(machine.machine_id)}
                onDragStart={() => setIsGlobalDragging(true)}
                onDragEnd={(id, pos) => handleSavePosition(id, pos)}
              />
            ))}
            
            <OrbitControls 
              makeDefault 
              ref={OrbitControlsRef} 
              enabled={!isEditing} 
              minPolarAngle={0} 
              maxPolarAngle={Math.PI / 2 - 0.05}
              minDistance={5}
              maxDistance={60}
              target={[0, 0, 0]}
            />
          </Canvas>
          
          {/* Instructions Overlay */}
          <div style={{position: 'absolute', bottom: '1.5rem', left: '1.5rem', pointerEvents: 'none', background: 'rgba(0,0,0,0.5)', padding: '0.75rem 1.25rem', borderRadius: '0.5rem', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.1)'}}>
            <p style={{margin: 0, fontSize: '0.875rem', color: '#fff', fontWeight: 500}}>
              {isEditing ? 'Click and Drag machines to position them' : 'Left Click + Drag to rotate camera'}
            </p>
            <p style={{margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
              {isEditing ? 'Positions are automatically saved.' : 'Scroll to zoom, Click machines for details.'}
            </p>
          </div>
        </div>

        {/* Live Details Popover Panel */}
        {selectedMachineData && (
          <div className="glass-panel" style={{width: '320px', animation: 'fadeIn 0.2s ease-out', position: 'relative', display: 'flex', flexDirection: 'column'}}>
            <button 
              onClick={() => setSelectedMachineId(null)}
              style={{position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer'}}
            >
              <X size={20} />
            </button>
            
            <h2 style={{margin: '0 0 0.5rem 0', color: 'var(--text-primary)', textTransform: 'uppercase'}}>{selectedMachineData.name || selectedMachineData.machine_id}</h2>
            <div style={{display: 'inline-flex', padding: '0.25rem 0.75rem', background: selectedMachineData.status === 'Fault' ? 'rgba(239, 68, 68, 0.1)' : selectedMachineData.status === 'Warning' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: selectedMachineData.status === 'Fault' ? 'var(--danger)' : selectedMachineData.status === 'Warning' ? 'var(--warning)' : 'var(--success)', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', alignSelf: 'flex-start', marginBottom: '2rem'}}>
              {selectedMachineData.status || 'Active'}
            </div>

            <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
              
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                  <div style={{padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: '8px'}}><Activity size={18} color="var(--accent-purple)" /></div>
                  <span style={{color: 'var(--text-secondary)', fontWeight: 500}}>Health Score</span>
                </div>
                <span style={{fontSize: '1.25rem', fontWeight: 800, color: calculateHealthScore(selectedMachineData) < 50 ? 'var(--danger)' : calculateHealthScore(selectedMachineData) < 80 ? 'var(--warning)' : 'var(--success)'}}>{calculateHealthScore(selectedMachineData)}%</span>
              </div>

              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                  <div style={{padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: '8px'}}><Thermometer size={18} color="var(--danger)" /></div>
                  <span style={{color: 'var(--text-secondary)', fontWeight: 500}}>Temperature</span>
                </div>
                <span style={{fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)'}}>{Math.round(selectedMachineData.temperature || 0)}°C</span>
              </div>

              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                  <div style={{padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: '8px'}}><Zap size={18} color="var(--warning)" /></div>
                  <span style={{color: 'var(--text-secondary)', fontWeight: 500}}>Vibration</span>
                </div>
                <span style={{fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)'}}>{(selectedMachineData.vibration || 0).toFixed(1)} G</span>
              </div>

              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                  <div style={{padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: '8px'}}><Gauge size={18} color="var(--accent-blue)" /></div>
                  <span style={{color: 'var(--text-secondary)', fontWeight: 500}}>Pressure</span>
                </div>
                <span style={{fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)'}}>{Math.round(selectedMachineData.pressure || 0)} PSI</span>
              </div>

            </div>
            
            {calculateHealthScore(selectedMachineData) < 50 && (
               <div style={{marginTop: 'auto', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', padding: '1rem', borderRadius: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start'}}>
                  <AlertTriangle size={18} color="var(--danger)" style={{flexShrink: 0, marginTop: '2px'}} />
                  <div>
                     <span style={{display: 'block', color: 'var(--danger)', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem'}}>Critical Fault Detected</span>
                     <span style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>Machine requires immediate inspection. Temperature and Vibration thresholds exceeded.</span>
                  </div>
               </div>
            )}
            
          </div>
        )}
      </div>
      </div>
    </ErrorBoundary>
  );
};

export default FloorMap;
