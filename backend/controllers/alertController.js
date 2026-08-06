const db = require('../database/db');

exports.getAlerts = (req, res) => {
  db.all("SELECT * FROM alerts ORDER BY created_at DESC LIMIT 50", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: 'Database error fetching alerts' });
    }
    res.json(rows);
  });
};

exports.acknowledgeAlert = (req, res) => {
  const { id } = req.params;
  db.run("UPDATE alerts SET status = 'acknowledged' WHERE id = ?", [id], function(err) {
    if (err) {
      return res.status(500).json({ message: 'Error updating alert' });
    }
    res.json({ message: 'Alert acknowledged', changes: this.changes });
  });
};

exports.resolveAlert = (req, res) => {
  const { id } = req.params;
  db.run("UPDATE alerts SET status = 'resolved' WHERE id = ?", [id], function(err) {
    if (err) {
      return res.status(500).json({ message: 'Error updating alert' });
    }
    res.json({ message: 'Alert resolved', changes: this.changes });
  });
};
