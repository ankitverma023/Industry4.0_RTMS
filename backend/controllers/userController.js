const db = require('../database/db');
const bcrypt = require('bcryptjs');

exports.getUsers = (req, res) => {
  db.all("SELECT id, username, role FROM users", [], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    res.json(rows);
  });
};

exports.addUser = async (req, res) => {
  const { username, password, role } = req.body;
  
  if (!username || !password || !role) {
    return res.status(400).json({ message: 'Username, password, and role are required' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    db.run("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)", 
      [username.toLowerCase(), hash, role], 
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) return res.status(400).json({ message: 'Username already exists' });
          return res.status(500).json({ message: 'Database error' });
        }
        res.status(201).json({ id: this.lastID, username, role });
      }
    );
  } catch (err) {
    res.status(500).json({ message: 'Error securing password' });
  }
};

exports.deleteUser = (req, res) => {
  const id = req.params.id;
  
  // Prevent a user from deleting themselves
  if (req.user && parseInt(req.user.id) === parseInt(id)) {
    return res.status(400).json({ message: 'You cannot delete your own account' });
  }

  db.run("DELETE FROM users WHERE id = ?", [id], function(err) {
    if (err) return res.status(500).json({ message: 'Database error' });
    if (this.changes === 0) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted successfully', changes: this.changes });
  });
};

exports.updateUser = async (req, res) => {
  const id = req.params.id;
  const { username, role, password } = req.body;
  
  if (!username || !role) {
    return res.status(400).json({ message: 'Username and role are required' });
  }

  try {
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      db.run("UPDATE users SET username = ?, role = ?, password_hash = ? WHERE id = ?", [username.toLowerCase(), role, hash, id], function(err) {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json({ message: 'User updated successfully' });
      });
    } else {
      db.run("UPDATE users SET username = ?, role = ? WHERE id = ?", [username.toLowerCase(), role, id], function(err) {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json({ message: 'User updated successfully' });
      });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error securing password' });
  }
};
