module.exports = {
  apps: [
    {
      name: "frontend",
      cwd: "/home/navaf/webprojects/attendance-managment/frontend",
      script: "serve",
      args: "-s build -l 3000",
      interpreter: "none",
      env: {
        NODE_ENV: "production"
      },
      max_memory_restart: "200M",
      error_file: "/home/navaf/webprojects/attendance-managment/logs/frontend-err.log",
      out_file: "/home/navaf/webprojects/attendance-managment/logs/frontend-out.log"
    },
    {
      name: "backend",
      cwd: "/home/navaf/webprojects/attendance-managment/backend",
      script: "./venv/bin/uvicorn",
      args: "app.main:app --host 0.0.0.0 --port 8000",
      interpreter: "none",
      env: {
        PYTHONUNBUFFERED: "1"
      },
      max_memory_restart: "400M",
      error_file: "/home/navaf/webprojects/attendance-managment/logs/backend-err.log",
      out_file: "/home/navaf/webprojects/attendance-managment/logs/backend-out.log"
    }
  ]
};
