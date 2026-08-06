// simulationEngine.js
// Simulates industrial machine data for Phase 1 & 2
const AlertEngine = require('./alerts/alertEngine');
const db = require('./database/db');

// Internal cache for machines fetched from DB
let activeMachines = [];

function fetchMachinesFromDB() {
  db.all("SELECT * FROM machines", [], (err, rows) => {
    if (err) {
      console.error('Failed to fetch machines for simulation', err);
      return;
    }
    activeMachines = rows;
  });
}

function generateMachineData(machine) {
  // Base data generation logic
  const isFault = machine.status === 'Fault';
  const isWarning = machine.status === 'Warning';
  
  let op_status = 'WORK_BY_PROGRAM';
  if (isFault) op_status = 'BREAKDOWN';
  else if (machine.status === 'Idle') op_status = 'IDLE';

  return {
    machine_id: machine.machine_id,
    name: machine.name,
    type: machine.type,
    temperature: isFault ? 95 + Math.random() * 10 : (isWarning ? 85 + Math.random() * 5 : 70 + Math.random() * 5),
    pressure: isFault ? 120 + Math.random() * 20 : (isWarning ? 100 + Math.random() * 10 : 80 + Math.random() * 5),
    rpm: isFault ? 0 : (isWarning ? 1400 + Math.random() * 200 : 1500 + Math.random() * 50),
    power: isFault ? 0 : (isWarning ? 95 + Math.random() * 10 : 80 + Math.random() * 5),
    vibration: isFault ? 15 + Math.random() * 5 : (isWarning ? 10 + Math.random() * 2 : 2 + Math.random() * 1),
    op_status,
    timestamp: new Date().toISOString()
  };
}

function startSimulation(io) {
  console.log('Starting Industrial Machine Simulation...');
  const alertEngine = new AlertEngine(io);
  
  // Initial fetch
  fetchMachinesFromDB();
  
  // Refresh machine list every 5 seconds
  setInterval(fetchMachinesFromDB, 5000);
  
  setInterval(() => {
    if (activeMachines.length === 0) return;
    
    const data = activeMachines.map(generateMachineData);
    
    // Process data through alert engine
    alertEngine.processData(data);
    
    // Broadcast telemetry data to all connected clients
    io.emit('sensor_data', data);
    
    // --- PRODUCTION CONTROL SIMULATION ---
    db.all("SELECT * FROM work_orders WHERE status = 'running'", [], (err, orders) => {
      if (err || !orders || orders.length === 0) {
        db.all("SELECT * FROM work_orders ORDER BY created_at ASC", [], (err, allOrders) => {
          if (!err) io.emit('production_data', allOrders);
        });
        return;
      }

      orders.forEach(order => {
        // Find if machine is actually running
        const machine = activeMachines.find(m => m.machine_id === order.machine_id);
        if (!machine || machine.status === 'Fault' || machine.status === 'Paused') {
          return; // Skip yielding parts if machine is dead or paused
        }

        // Base yield is 2 parts per 2 seconds (60 parts per min)
        const speedMultiplier = order.speed / 100;
        let newCompleted = order.completed + Math.floor(2 * speedMultiplier);
        
        // Defect calculation based on speed over 100%
        let newDefects = order.defects;
        if (order.speed > 100) {
          const defectChance = (order.speed - 100) * 0.5; // 50% speed = 25% defect chance per tick
          if (Math.random() * 100 < defectChance) {
            newDefects += 1;
            newCompleted -= 1; // It was a defect, not a good part
          }
        }

        let newStatus = 'running';
        if (newCompleted >= order.target) {
          newCompleted = order.target;
          newStatus = 'completed';
        }

        // Update DB
        db.run(
          "UPDATE work_orders SET completed = ?, defects = ?, status = ? WHERE id = ?",
          [Math.max(0, newCompleted), newDefects, newStatus, order.id]
        );
      });

      // Broadcast all orders (including queued/completed) so UI can refresh
      db.all("SELECT * FROM work_orders ORDER BY created_at ASC", [], (err, allOrders) => {
        if (!err) io.emit('production_data', allOrders);
      });
    });

  }, 2000); // Generate data every 2 seconds
}

module.exports = { startSimulation };
