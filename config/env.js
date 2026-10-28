// Reads settings from .env once, so the rest of the app imports them from here.
require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
};
config.isProduction = config.env === 'production';

function coordinate(value,min,max,fallback){const number=Number(value);return value!==undefined&&value!==''&&Number.isFinite(number)&&number>=min&&number<=max?number:fallback;}
config.map={center:[coordinate(process.env.MAP_CENTER_LAT,-85,85,20),coordinate(process.env.MAP_CENTER_LNG,-180,180,0)],zoom:coordinate(process.env.MAP_ZOOM,2,18,3)};
module.exports = config;
