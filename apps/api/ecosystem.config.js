const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

function loadEnvFile(fileName, override = false) {
  const filePath = path.join(__dirname, fileName);
  if (!fs.existsSync(filePath)) return;

  dotenv.config({ path: filePath, override });
}

// loadEnvFile('.env.production');
loadEnvFile('.env');

const appName = process.env.PM2_APP_NAME || 'gopass-api';
const instances = process.env.PM2_INSTANCES || 'max';
const execMode = process.env.PM2_EXEC_MODE || 'cluster';
const maxMemoryRestart = process.env.PM2_MAX_MEMORY_RESTART || '512M';

module.exports = {
  apps: [
    {
      name: appName,
      script: 'dist/src/main.js',
      cwd: __dirname,
      instances,
      exec_mode: execMode,
      autorestart: true,
      max_memory_restart: maxMemoryRestart,
      merge_logs: true,
      time: true,
      out_file: path.join(__dirname, 'logs', 'out.log'),
      error_file: path.join(__dirname, 'logs', 'error.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      env: {
        ...process.env,
        NODE_ENV: process.env.NODE_ENV || 'development',
      },
      env_production: {
        ...process.env,
        NODE_ENV: 'production',
      },
    },
  ],
};