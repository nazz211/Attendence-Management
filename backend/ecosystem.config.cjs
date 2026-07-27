module.exports = {
  apps: [
    {
      name: "attendance-api",
      cwd: "/home/navaf/webprojects/attendance-managment/backend",
      script: "./venv/bin/uvicorn",
      args: "app.main:app --host 0.0.0.0 --port 8000",
      interpreter: "none",
      env: {
        PYTHONUNBUFFERED: "1"
      }
    }
  ]
};
