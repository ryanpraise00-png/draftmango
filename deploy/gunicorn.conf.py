bind = '0.0.0.0:4176'
workers = 2
worker_class = 'gthread'
threads = 2
timeout = 60
graceful_timeout = 30
keepalive = 5
max_requests = 1000
max_requests_jitter = 100
worker_tmp_dir = '/tmp'
errorlog = '-'
control_socket_disable = True
# Request paths may contain account identifiers; do not log bodies or query strings.
accesslog = None
# Node sets the forwarded protocol; this backend has no host-published port.
forwarded_allow_ips = '*'
