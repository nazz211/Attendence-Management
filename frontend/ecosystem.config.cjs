module.exports = {
  apps: [{
    name: 'attendance-web',
    cwd: __dirname,
    script: 'node_modules/vite/bin/vite.js',
    args: 'preview --host 0.0.0.0 --port 5173',
    interpreter: 'node',
    autorestart: true,
    env: { NODE_ENV: 'production' }
  }]
}
