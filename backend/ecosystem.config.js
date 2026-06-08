// ecosystem.config.js - PM2 Process Manager
module.exports = {
  apps: [{
    name: 'velsoie-backend',
    script: 'server.js',
    instances: 1,          // 1 para SQLite/PG sin pool issues; usar 'max' para cluster con PG pool
    exec_mode: 'fork',     // 'cluster' si usas múltiples instancias
    autorestart: true,
    max_restarts: 10,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    // Logs
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    // Graceful shutdown
    kill_timeout: 10000,
    listen_timeout: 10000,
    // Cron restart (reiniciar a las 4am para liberar memoria)
    cron_restart: '0 4 * * *'
  }]
};
