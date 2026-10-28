const path = require('path');
const express = require('express');
const helmet = require('helmet');
const config = require('./config/env');
const pageRoutes = require('./routes/pageRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { Fleet } = require('./lib/fleet');
const createApi = require('./routes/apiRoutes');
const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(helmet({ referrerPolicy:{policy:'strict-origin-when-cross-origin'}, contentSecurityPolicy: { directives: {
  defaultSrc: ["'self'"], scriptSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  fontSrc: ["'self'"], imgSrc: ["'self'", 'data:', 'https://*.tile.openstreetmap.org', 'https://tile.openstreetmap.org'],
  connectSrc: ["'self'"], upgradeInsecureRequests: config.isProduction ? [] : null,
} } }));
app.use('/vendor/fonts', express.static(path.join(__dirname, 'node_modules/@fontsource')));
app.use('/vendor/leaflet', express.static(path.join(__dirname, 'node_modules/leaflet/dist')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '32kb' }));
const fleet = new Fleet(process.env.DATA_FILE || path.join(__dirname, 'data/fleet.json'));
const api = createApi(fleet);
app.use('/api', api);
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use((req,res,next)=>{res.locals.mapConfig=config.map;next();});
app.use('/', pageRoutes);
app.use(notFound);
app.use(errorHandler);
if (require.main === module) app.listen(config.port, () => console.log(`Cosine Bus Tracker running on http://localhost:${config.port} (${config.env})`));
app.close = api.close;
module.exports = app;
