// Reads settings from .env once, so the rest of the app imports them from here.
require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
};
config.isProduction = config.env === 'production';

function coordinate(value,min,max,fallback){const number=Number(value);return value!==undefined&&value!==''&&Number.isFinite(number)&&number>=min&&number<=max?number:fallback;}
config.map={center:[coordinate(process.env.MAP_CENTER_LAT,-85,85,9.0820),coordinate(process.env.MAP_CENTER_LNG,-180,180,8.6753)],zoom:coordinate(process.env.MAP_ZOOM,2,18,6)};
if(!process.env.MAP_CENTER_LAT&&!process.env.MAP_CENTER_LNG&&!process.env.MAP_ZOOM)config.map.bounds=[[4.2,2.7],[13.9,14.7]];
module.exports = config;
