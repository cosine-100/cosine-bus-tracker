const path = require('node:path');
const fs = require('node:fs');
const { Fleet } = require('../lib/fleet');
require('dotenv').config();
try {
  const file = process.argv[2];
  if (!file) throw new Error('Usage: npm run register:bus -- path/to/your-bus.json');
  const bus = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8').replace(/^\uFEFF/, ''));
  const fleet = new Fleet(process.env.DATA_FILE || path.join(__dirname, '../data/fleet.json'));
  const key = fleet.register(bus);
  console.log(`Registered ${bus.id}. Driver key (save privately): ${key}\nRestart the server to load this registration. Registering an existing ID rotates its key.`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
