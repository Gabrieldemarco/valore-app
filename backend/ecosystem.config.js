// ecosystem.config.js - PM2 Process Manager
module.exports = {
  apps: [{
    name: 'velsoie-backend',
    cwd: __dirname,
    // PM2 debe ejecutar Node con el CLI de tsx como script; no el binario ELF directamente.
    script: 'node_modules/tsx/dist/cli.mjs',
    args: 'server.ts',
    interpreter: 'node',
    instances: 1,          // 1 para SQLite/PG sin pool issues; usar 'max' para cluster con PG pool
    exec_mode: 'fork',     // 'cluster' si usas múltiples instancias
    autorestart: true,
    max_restarts: 10,
    watch: false,
    max_memory_restart: '500M',
    // server.ts carga backend/.env mediante dotenv. No declarar aquí secretos:
    // cualquier valor definido en env puede sobrescribir el archivo .env.
    env: {
      NODE_ENV: 'production'
    },
    env_development: {
      NODE_ENV: 'development',
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
