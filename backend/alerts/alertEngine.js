const db = require('../database/db');

class AlertEngine {
  constructor(io) {
    this.io = io;
    // Map to keep track of active alerts to prevent spamming
    this.activeAlerts = new Map();
    
    // Dynamic settings cache
    this.settings = {
      temp_warning_limit: 85,
      temp_critical_limit: 95,
      vib_warning_limit: 10,
      vib_critical_limit: 15
    };

    // Load initial settings and refresh every 5 seconds
    this.loadSettings();
    setInterval(() => this.loadSettings(), 5000);
  }

  loadSettings() {
    db.all("SELECT * FROM settings", [], (err, rows) => {
      if (!err && rows) {
        rows.forEach(r => {
          this.settings[r.key] = parseFloat(r.value);
        });
      }
    });
  }

  async processData(machineData) {
    const alerts = [];

    for (const machine of machineData) {
      // 1. Temperature Thresholds
      if (machine.temperature > this.settings.temp_critical_limit) {
        const a = await this.createAlert(machine.machine_id, 'temperature', 'CRITICAL', `Critical temperature exceeded (> ${this.settings.temp_critical_limit}°C)`);
        if (a) alerts.push(a);
      } else if (machine.temperature > this.settings.temp_warning_limit) {
        const a = await this.createAlert(machine.machine_id, 'temperature', 'WARNING', `High temperature warning (> ${this.settings.temp_warning_limit}°C)`);
        if (a) alerts.push(a);
      }

      // 2. Vibration Thresholds
      if (machine.vibration > this.settings.vib_critical_limit) {
        const a = await this.createAlert(machine.machine_id, 'vibration', 'CRITICAL', `Critical vibration exceeded (> ${this.settings.vib_critical_limit} mm/s)`);
        if (a) alerts.push(a);
      } else if (machine.vibration > this.settings.vib_warning_limit) {
        const a = await this.createAlert(machine.machine_id, 'vibration', 'WARNING', `High vibration warning (> ${this.settings.vib_warning_limit} mm/s)`);
        if (a) alerts.push(a);
      }
    }

    if (alerts.length > 0) {
      this.io.emit('new_alerts', alerts);
    }
    
    return alerts;
  }

  createAlert(machineId, type, severity, message) {
    return new Promise((resolve) => {
      db.get(
        "SELECT id, status FROM alerts WHERE machine_id = ? AND type = ? AND severity = ? ORDER BY created_at DESC LIMIT 1",
        [machineId, type, severity],
        (err, existingAlert) => {
          if (!err && existingAlert && (existingAlert.status === 'active' || existingAlert.status === 'acknowledged')) {
            // An active or acknowledged alert already exists for this issue, do not spam.
            resolve(null);
          } else {
            const newAlert = { machine_id: machineId, type, severity, message, status: 'active', timestamp: new Date() };
            
            db.run(
              `INSERT INTO alerts (machine_id, type, severity, message) VALUES (?, ?, ?, ?)`,
              [machineId, type, severity, message],
              function(insertErr) {
                if (!insertErr) {
                  newAlert.id = this.lastID;
                }
                resolve(newAlert);
              }
            );
          }
        }
      );
    });
  }
}

module.exports = AlertEngine;
