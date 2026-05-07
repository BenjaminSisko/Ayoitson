# HTTPS And Reverse Proxy Runbook

## Direct HTTPS

Ayoitson starts HTTPS when both variables are set:

```sh
HTTPS_CERT=/etc/ayoitson/fullchain.pem HTTPS_KEY=/etc/ayoitson/privkey.pem npm start
```

If only one variable is set, startup fails. Keep the private key readable only
by the service account.

## Local Development Certificates

With `mkcert` installed:

```sh
npm run tls:dev
HTTPS_CERT="$PWD/certs/localhost.pem" HTTPS_KEY="$PWD/certs/localhost-key.pem" npm start
```

The generated files are for local development only.

## Reverse Proxy

Ayoitson can also stay on HTTP behind a trusted reverse proxy. Terminate TLS at
the proxy, forward to `http://127.0.0.1:8000`, and keep Ayoitson bound to the
host or private network.

Example Nginx server block:

```nginx
server {
    listen 443 ssl http2;
    server_name ayoitson.example.internal;

    ssl_certificate /etc/letsencrypt/live/ayoitson/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ayoitson/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Do not expose Ayoitson's HTTP port directly to untrusted networks. Provider
feeds and tuner discovery are designed for local network clients.
