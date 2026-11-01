/*
 * deploy-hostinger.js
 * One-click deploy to Hostinger VPS (PM2-managed, port 3000)
 *
 * Prerequisites:
 *   - SSH access to VPS (configure DEPLOY_HOST, DEPLOY_USER, DEPLOY_KEY env vars)
 *   - PM2 installed globally on VPS: npm install -g pm2
 *   - Node.js 20+ on VPS
 *   - .env file in backend/ with production values
 *
 * Usage (local with SSH):
 *   DEPLOY_HOST=root@31.179.46.17 DEPLOY_KEY=path/to/key node scripts/deploy-hostinger.js
 *
 * Usage (on VPS directly):
 *   NODE_ENV=production node scripts/deploy-hostinger.js --local
 *
 * Steps performed:
 *   1. Check environment variables
 *   2. Build frontend (npm run build in frontend-vite/)
 *   3. Transfer frontend build to VPS backend/public/
 *   4. Run database migrations on VPS
 *   5. Reload PM2 process with --update-env
 *   6. Run smoke tests
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BACKEND_DIR = path.resolve(__dirname, '..');
const FRONTEND_DIR = path.resolve(BACKEND_DIR, '..', 'frontend-vite');
// vite.config.ts publica el build en frontend/dist para que Express/Nginx lo sirvan.
const FRONTEND_DIST = path.resolve(BACKEND_DIR, '..', 'frontend', 'dist');
const LOCAL_MODE = process.argv.includes('--local');

// SSH configuration from environment
const DEPLOY_HOST = process.env.DEPLOY_HOST || 'srv1976051.hstgr.cloud';
const DEPLOY_USER = process.env.DEPLOY_USER || 'root';
const DEPLOY_KEY = process.env.DEPLOY_KEY || path.join(process.env.HOME || process.env.USERPROFILE, '.ssh', 'vora_deploy');
const DEPLOY_PATH = process.env.DEPLOY_PATH || '/var/www/velsoie/backend';
const FRONTEND_DEPLOY_PATH = process.env.FRONTEND_DEPLOY_PATH || '/var/www/velsoie/frontend/dist';
const RELEASE_ID = `${Date.now()}`;
const FRONTEND_RELEASE_PATH = `${FRONTEND_DEPLOY_PATH}.release-${RELEASE_ID}`;
const FRONTEND_BACKUP_PATH = `${FRONTEND_DEPLOY_PATH}.backup-${RELEASE_ID}`;

function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

function run(cmd, cwd, env = {}) {
  log(`$ ${cmd} (in ${cwd || process.cwd()})`);
  const result = spawnSync(cmd, {
    cwd: cwd || process.cwd(),
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ...env }
  });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${cmd}`);
  }
  return result;
}

function sshCmd(cmd) {
  const sshArgs = [
    '-i', DEPLOY_KEY,
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'ConnectTimeout=30',
    `${DEPLOY_USER}@${DEPLOY_HOST}`,
    cmd
  ];
  // Pasar los argumentos directamente evita que PowerShell interprete `&&` localmente.
  const result = spawnSync('ssh', sshArgs, { stdio: 'inherit', shell: false });
  if (result.status !== 0) {
    throw new Error(`SSH command failed: ${cmd}`);
  }
  return result;
}

function rsync(localPath, remotePath) {
  const rsyncArgs = [
    '-avz',
    '-e', `"ssh -i "${DEPLOY_KEY}" -o StrictHostKeyChecking=no -o ConnectTimeout=30"`,
    localPath + '/',
    `${DEPLOY_USER}@${DEPLOY_HOST}:${remotePath}/`
  ];
  const result = spawnSync('rsync', rsyncArgs, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) {
    throw new Error(`rsync failed: ${localPath} -> ${remotePath}`);
  }
  return result;
}

async function main() {
  try {
    // Step 0: Check environment locally
    log('Checking environment variables locally...');
    run('node scripts/check-env.js', BACKEND_DIR, { NODE_ENV: 'production' });

    if (!LOCAL_MODE) {
      // Verify SSH connectivity
      log(`Testing SSH connection to ${DEPLOY_USER}@${DEPLOY_HOST}...`);
      sshCmd('echo "SSH connection OK"');

      // Step 1: Build frontend
      log('Building frontend locally...');
      run('npm run build', FRONTEND_DIR);

      // Check dist exists
      if (!fs.existsSync(FRONTEND_DIST)) {
        throw new Error('Frontend build failed - dist/ not found');
      }

       // Step 2: Transfer frontend build to VPS (frontend/dist, not backend/public)
      log('Transferring frontend build to VPS...');
       sshCmd(`mkdir -p ${FRONTEND_RELEASE_PATH}`);

       // Use scp or rsync to transfer frontend build
       if (process.platform !== 'win32') {
         rsync(FRONTEND_DIST, FRONTEND_RELEASE_PATH);
       } else {
         // Fallback: use tar over SSH for Windows
         log('Using tar pipe for frontend deploy (Windows)...');
         const tarResult = spawnSync(
           `tar czf - -C "${FRONTEND_DIST}" . | ssh -i "${DEPLOY_KEY}" -o StrictHostKeyChecking=no ${DEPLOY_USER}@${DEPLOY_HOST} "tar xzf - -C ${FRONTEND_RELEASE_PATH}"`,
           { stdio: 'inherit', shell: process.platform === 'win32' }
         );
         if (tarResult.status !== 0) {
           throw new Error('Frontend transfer failed');
         }
       }
       sshCmd(`test -s ${FRONTEND_RELEASE_PATH}/index.html`);
       sshCmd(
         `set -e; ` +
         `if [ -d "${FRONTEND_DEPLOY_PATH}" ]; then mv "${FRONTEND_DEPLOY_PATH}" "${FRONTEND_BACKUP_PATH}"; fi; ` +
         `if ! mv "${FRONTEND_RELEASE_PATH}" "${FRONTEND_DEPLOY_PATH}"; then ` +
         `if [ -d "${FRONTEND_BACKUP_PATH}" ]; then mv "${FRONTEND_BACKUP_PATH}" "${FRONTEND_DEPLOY_PATH}"; fi; ` +
         `exit 1; fi`
       );

       // Step 3: Transfer backend files (excluding node_modules, logs, .env)
      log('Syncing backend files to VPS...');
      if (process.platform !== 'win32') {
        rsync(BACKEND_DIR, DEPLOY_PATH);
      } else {
        log('Using tar pipe for backend deploy (Windows)...');
        const tarResult = spawnSync(
          `tar czf - --exclude=node_modules --exclude=logs --exclude=.env --exclude=.git --exclude=*.tgz --exclude=*.zip --exclude=scripts/check-orig*.js --exclude=scripts/debug-host.js --exclude=scripts/fix-*.js --exclude=scripts/inspect-*.js --exclude=scripts/test-append*.js --exclude=scripts/test-smtp.js --exclude=scripts/validate-*.js -C "${BACKEND_DIR}" . | ssh -i "${DEPLOY_KEY}" -o StrictHostKeyChecking=no ${DEPLOY_USER}@${DEPLOY_HOST} "mkdir -p ${DEPLOY_PATH} && tar xzf - -C ${DEPLOY_PATH}"`,
          { stdio: 'inherit', shell: process.platform === 'win32' }
        );
        if (tarResult.status !== 0) {
          throw new Error('Backend transfer failed');
        }
      }

      // Step 4: Run database migrations on VPS
      log('Running database migrations...');
      // El host remoto puede ser Windows; el runner de migraciones carga su propio .env.
      sshCmd(`cd ${DEPLOY_PATH} && node migrations/run-migrations.js`);

      // Step 5: Reload PM2 with environment
      log('Restarting PM2 process...');
      sshCmd(`cd ${DEPLOY_PATH} && pm2 reload ecosystem.config.js --env production --update-env`);

      // Step 6: Wait for server to start
      log('Waiting for server to start...');
      await new Promise(r => setTimeout(r, 5000));

      // Step 7: Run smoke tests
      log('Running smoke tests...');
      sshCmd(`cd ${DEPLOY_PATH} && npx cross-env BASE_URL=http://localhost:3000 node scripts/smoke-test.js`);

      // Step 8: Save PM2 process list
      log('Saving PM2 process list...');
      sshCmd('pm2 save');
    } else {
      // Local mode - for testing
      log('Running in local mode...');
      run('npm run build', FRONTEND_DIR);
      run('node migrations/run-migrations.js', BACKEND_DIR, { NODE_ENV: 'production' });
      run('pm2 reload ecosystem.config.js --env production --update-env', BACKEND_DIR);
      await new Promise(r => setTimeout(r, 5000));
      run('npx cross-env BASE_URL=http://localhost:3000 node scripts/smoke-test.js', BACKEND_DIR);
    }

    log('Deployment completed successfully!');
    log('Verify at: https://velsoie.com/api/health');

  } catch (error) {
    console.error('\n[DEPLOY ERROR]', error.message);
    process.exit(1);
  }
}

main();
