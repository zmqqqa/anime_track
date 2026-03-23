module.exports = {
  apps: [{
    name: 'anime-track',
    cwd: '/home/ubuntu/anime_track',
    script: 'node_modules/.bin/next',
    args: 'start -p 3000',
    env: {
      NODE_ENV: 'production'
    },
    node_args: '--max-old-space-size=256',
    instances: 1,
    autorestart: true,
    max_restarts: 15,
    min_uptime: '5s',
    restart_delay: 3000,
    max_memory_restart: '300M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
