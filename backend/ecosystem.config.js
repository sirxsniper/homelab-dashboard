const path = require('path');

module.exports = {
  apps: [{
    name: 'homelab-api',
    script: './src/server.js',
    cwd: path.resolve(__dirname),
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
    },
    env_file: '.env',
    time: true,
  }]
};
