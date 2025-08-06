module.exports = {
  apps: [{
    name: 'c2-boersensaufen',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 4001
    },
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}