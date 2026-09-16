const db = require('../database/db');

exports.getMachines = (req, res) => {
  db.all("SELECT * FROM machines", [], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    res.json(rows);
  });
};

exports.addMachine = (req, res) => {
  const { machine_id, name, type, status } = req.body;
  if (!machine_id || !name || !type) {
    return res.status(400).json({ message: 'Machine ID, name, and type are required' });
  }

  const defaultStatus = status || 'Idle';
  db.run("INSERT INTO machines (machine_id, name, type, status) VALUES (?, ?, ?, ?)", 
    [machine_id.toLowerCase(), name, type, defaultStatus], 
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) return res.status(400).json({ message: 'Machine ID already exists' });
        return res.status(500).json({ message: 'Database error' });
      }
      res.status(201).json({ id: this.lastID, machine_id, name, type, status: defaultStatus });
    }
  );
};

exports.deleteMachine = (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM machines WHERE id = ?", [id], function(err) {
    if (err) return res.status(500).json({ message: 'Database error' });
    res.json({ message: 'Machine deleted successfully', changes: this.changes });
  });
};

const { forceRefreshMachines } = require('../simulationEngine');

exports.updateMachine = (req, res) => {
  const id = req.params.id;
  const { name, type, status } = req.body;
  if (!name || !type || !status) {
    return res.status(400).json({ message: 'Name, type, and status are required' });
  }

  db.run("UPDATE machines SET name = ?, type = ?, status = ? WHERE id = ?",
    [name, type, status, id],
    function(err) {
      if (err) return res.status(500).json({ message: 'Database error' });
      if (this.changes === 0) return res.status(404).json({ message: 'Machine not found' });
      if (forceRefreshMachines) forceRefreshMachines();
      res.json({ message: 'Machine updated successfully' });
    }
  );
};
