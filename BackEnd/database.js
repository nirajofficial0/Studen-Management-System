const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'db.json');

function readDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      return { users: [], notices: [], attendance: [], marks: [] };
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    if (!data || !data.trim()) {
      return { users: [], notices: [], attendance: [], marks: [] };
    }
    return JSON.parse(data);
  } catch (err) {
    return { users: [], notices: [], attendance: [], marks: [] };
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Failed to write to local db.json:', err.message);
  }
}

module.exports = {
  readDB,
  writeDB
};
