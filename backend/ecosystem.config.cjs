module.exports = {
  apps: [{
    name: 'attendance-api',
    cwd: __dirname,
    script: 'venv/bin/uvicorn',
    args: 'app.main:app --host 0.0.0.0 --port 8000',
    interpreter: 'none',
    autorestart: true,
    env: { NODE_ENV: 'production' }
  }]
}
