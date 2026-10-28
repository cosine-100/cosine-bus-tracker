const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Fleet } = require('../lib/fleet');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cosine-browser-'));
process.env.DATA_FILE = path.join(directory, 'fleet.json');
const fleet = new Fleet(process.env.DATA_FILE);
const key = fleet.register({ id: 'BROWSER-TEST', name: 'Isolated browser test', route: { name: 'Test route', stops: [{id:'test-stop',name:'Test stop',lat:10.002,lng:20.002}] } });
const app = require('../server');
const server = app.listen(3001, () => console.log(JSON.stringify({port:3001,key})));
function close() { app.close(); server.closeAllConnections(); server.close(() => { fs.rmSync(directory,{recursive:true,force:true}); process.exit(); }); }
process.on('SIGINT', close);
process.on('SIGTERM', close);
