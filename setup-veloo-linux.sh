#!/usr/bin/env bash
set -euo pipefail

readonly DOMAIN="${DOMAIN:-veloo.page}"
readonly EMAIL="${EMAIL:-kimjunhee2483@gmail.com}"
readonly APP_PORT="${APP_PORT:-9000}"
readonly NGINX_SITE="/etc/nginx/sites-available/veloo"
readonly NGINX_LINK="/etc/nginx/sites-enabled/veloo"
readonly CERT_PATH="/etc/letsencrypt/live/${DOMAIN}"

if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD=(docker-compose)
else
    echo "Error: Docker Compose is not installed." >&2
    exit 1
fi

echo "[1/9] Installing Nginx and Certbot"
sudo apt update
sudo apt install -y nginx certbot

echo "[2/9] Starting the application"
"${COMPOSE_CMD[@]}" up -d

echo "[3/9] Waiting for the application on port ${APP_PORT}"
app_ready=false
for _ in {1..30}; do
    if curl --silent --fail --max-time 2 "http://127.0.0.1:${APP_PORT}" >/dev/null; then
        app_ready=true
        break
    fi
    sleep 2
done

if [[ "${app_ready}" != true ]]; then
    echo "Error: The application did not respond on port ${APP_PORT}." >&2
    "${COMPOSE_CMD[@]}" ps
    exit 1
fi

echo "[4/9] Creating the HTTP Nginx configuration"
sudo mkdir -p /var/www/certbot/.well-known/acme-challenge
sudo tee "${NGINX_SITE}" >/dev/null <<NGINX_EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/certbot;
        default_type text/plain;
        try_files \$uri =404;
    }

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX_EOF

sudo ln -sfn "${NGINX_SITE}" "${NGINX_LINK}"
sudo rm -f /etc/nginx/sites-enabled/default

echo "[5/9] Enabling Nginx"
sudo nginx -t
if command -v systemctl >/dev/null 2>&1; then
    sudo systemctl enable --now nginx
    sudo systemctl reload nginx
else
    sudo service nginx restart
fi

echo "[6/9] Requesting the TLS certificate"
sudo certbot certonly \
    --webroot \
    --webroot-path /var/www/certbot \
    --email "${EMAIL}" \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    -d "${DOMAIN}" \
    -d "www.${DOMAIN}"

echo "[7/9] Creating the HTTPS Nginx configuration"
sudo tee "${NGINX_SITE}" >/dev/null <<NGINX_EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name ${DOMAIN} www.${DOMAIN};

    ssl_certificate ${CERT_PATH}/fullchain.pem;
    ssl_certificate_key ${CERT_PATH}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX_EOF

sudo nginx -t
if command -v systemctl >/dev/null 2>&1; then
    sudo systemctl reload nginx
else
    sudo service nginx reload
fi

echo "[8/9] Installing the certificate renewal hook"
readonly RENEW_SCRIPT="/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh"
sudo mkdir -p "$(dirname "${RENEW_SCRIPT}")"
sudo tee "${RENEW_SCRIPT}" >/dev/null <<'RENEW_EOF'
#!/usr/bin/env bash
set -e

if command -v systemctl >/dev/null 2>&1; then
    systemctl reload nginx
else
    service nginx reload
fi
RENEW_EOF
sudo chmod +x "${RENEW_SCRIPT}"

if command -v systemctl >/dev/null 2>&1; then
    sudo systemctl enable --now certbot.timer 2>/dev/null || true
fi

echo "[9/9] Setup complete"
echo "Site: https://${DOMAIN}"
echo "Verify with: sudo certbot renew --dry-run"
