#!/bin/bash

# ============================================
# Mus.Link Caddy Installation Script
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Mus.Link Caddy Installation Script${NC}"
echo -e "${GREEN}========================================${NC}"
echo

# Check root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Error: Please run as root (sudo ./install.sh)${NC}"
  exit 1
fi

# Variables
CADDY_USER="caddy"
CADDY_GROUP="caddy"
CADDY_CONFIG_DIR="/etc/caddy"
CADDY_LOG_DIR="/var/log/caddy"
APP_DIR="/var/www/mus-link"

# ============================================
# Step 1: Stop Nginx if running
# ============================================
echo -e "\n${YELLOW}[1/8] Stopping Nginx...${NC}"
if systemctl is-active --quiet nginx; then
  systemctl stop nginx
  systemctl disable nginx
  echo -e "${GREEN}✓ Nginx stopped and disabled${NC}"
else
  echo -e "${GREEN}✓ Nginx not running${NC}"
fi

# ============================================
# Step 2: Install dependencies
# ============================================
echo -e "\n${YELLOW}[2/8] Installing dependencies...${NC}"
apt update
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
echo -e "${GREEN}✓ Dependencies installed${NC}"

# ============================================
# Step 3: Install xcaddy
# ============================================
echo -e "\n${YELLOW}[3/8] Installing xcaddy...${NC}"
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/xcaddy/gpg.key' | gpg --dearmor -o /usr/share/keyrings/xcaddy-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/xcaddy/debian.deb.txt' | tee /etc/apt/sources.list.d/xcaddy.list
apt update
apt install -y xcaddy golang-go
echo -e "${GREEN}✓ xcaddy installed${NC}"

# ============================================
# Step 4: Build Caddy with Cloudflare module
# ============================================
echo -e "\n${YELLOW}[4/8] Building Caddy with Cloudflare DNS module...${NC}"
cd /tmp
xcaddy build --with github.com/caddy-dns/cloudflare
mv caddy /usr/bin/caddy
chmod +x /usr/bin/caddy
setcap cap_net_bind_service=+ep /usr/bin/caddy
echo -e "${GREEN}✓ Caddy built with cloudflare module${NC}"
caddy version
caddy list-modules | grep cloudflare || true

# ============================================
# Step 5: Create caddy user and directories
# ============================================
echo -e "\n${YELLOW}[5/8] Creating user and directories...${NC}"
id -u $CADDY_USER &>/dev/null || useradd --system --home /var/lib/caddy --shell /usr/sbin/nologin $CADDY_USER
mkdir -p $CADDY_CONFIG_DIR
mkdir -p $CADDY_LOG_DIR
mkdir -p /var/lib/caddy
chown -R $CADDY_USER:$CADDY_GROUP $CADDY_LOG_DIR
chown -R $CADDY_USER:$CADDY_GROUP /var/lib/caddy
echo -e "${GREEN}✓ Directories created${NC}"

# ============================================
# Step 6: Copy configuration files
# ============================================
echo -e "\n${YELLOW}[6/8] Copying configuration files...${NC}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Copy Caddyfile
cp "$SCRIPT_DIR/Caddyfile" $CADDY_CONFIG_DIR/Caddyfile
chown root:root $CADDY_CONFIG_DIR/Caddyfile
chmod 644 $CADDY_CONFIG_DIR/Caddyfile

# Copy cloudflare.env template if not exists
if [ ! -f "$CADDY_CONFIG_DIR/cloudflare.env" ]; then
  cp "$SCRIPT_DIR/cloudflare.env" $CADDY_CONFIG_DIR/cloudflare.env
  chown $CADDY_USER:$CADDY_GROUP $CADDY_CONFIG_DIR/cloudflare.env
  chmod 600 $CADDY_CONFIG_DIR/cloudflare.env
  echo -e "${YELLOW}⚠ Please edit /etc/caddy/cloudflare.env with your Cloudflare API token!${NC}"
else
  echo -e "${GREEN}✓ cloudflare.env already exists, keeping it${NC}"
fi

echo -e "${GREEN}✓ Configuration files copied${NC}"

# ============================================
# Step 7: Create systemd service
# ============================================
echo -e "\n${YELLOW}[7/8] Creating systemd service...${NC}"

cat > /etc/systemd/system/caddy.service << 'EOF'
[Unit]
Description=Caddy Web Server
Documentation=https://caddyserver.com/docs/
After=network.target network-online.target
Requires=network-online.target

[Service]
Type=notify
User=caddy
Group=caddy
EnvironmentFile=/etc/caddy/cloudflare.env
ExecStart=/usr/bin/caddy run --environ --config /etc/caddy/Caddyfile
ExecReload=/usr/bin/caddy reload --config /etc/caddy/Caddyfile --force
TimeoutStopSec=5s
LimitNOFILE=1048576
LimitNPROC=512
PrivateTmp=true
ProtectSystem=full
AmbientCapabilities=CAP_NET_BIND_SERVICE

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
echo -e "${GREEN}✓ Systemd service created${NC}"

# ============================================
# Step 8: Start Caddy
# ============================================
echo -e "\n${YELLOW}[8/8] Starting Caddy...${NC}"

# Validate config first
if caddy validate --config $CADDY_CONFIG_DIR/Caddyfile; then
  echo -e "${GREEN}✓ Configuration valid${NC}"
  systemctl enable caddy
  systemctl start caddy
  echo -e "${GREEN}✓ Caddy started${NC}"
else
  echo -e "${RED}✗ Configuration invalid! Please check /etc/caddy/Caddyfile${NC}"
  exit 1
fi

# ============================================
# Summary
# ============================================
echo
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Installation Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Edit /etc/caddy/cloudflare.env with your Cloudflare API token"
echo "2. Restart Caddy: sudo systemctl restart caddy"
echo "3. Check status: sudo systemctl status caddy"
echo "4. Check logs: sudo journalctl -u caddy -f"
echo
echo -e "${YELLOW}Verification commands:${NC}"
echo "curl -I https://mus.link"
echo "curl -I https://mus.link/api/health"
echo "curl -I https://dev.mus.link"
echo

# Show status
systemctl status caddy --no-pager || true
