module.exports = {
  apps: [{
    name: 'openclaw-dashboard',
    script: './server/index.js',
    cwd: '/Users/rockylam/.openclaw/workspace/projects/openclaw-dashboard',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '200M',
    env: {
      NODE_ENV: 'production',
      PORT: 18790
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    merge_logs: true
  }]
};
