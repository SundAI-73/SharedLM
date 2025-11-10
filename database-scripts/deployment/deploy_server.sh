#!/bin/bash

# SharedLM Production Server Setup Script
# For: Ubuntu/Debian servers
# Sets up: SQLite + Mem0 + Nginx + Systemd

set -e

echo "================================================================================"
echo "SharedLM Production Server Setup"
echo "================================================================================"
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (sudo ./deploy_server.sh)${NC}"
    exit 1
fi

echo -e "${GREEN}Step 1: Install System Dependencies${NC}"
echo "--------------------------------------------------------------------------------"

apt-get update
apt-get install -y python3 python3-pip python3-venv git nginx supervisor curl

echo -e "${GREEN}✅ System dependencies installed${NC}"
echo ""

echo -e "${GREEN}Step 2: Create Application Directory${NC}"
echo "--------------------------------------------------------------------------------"

APP_DIR="/opt/sharedlm"
mkdir -p $APP_DIR
cd $APP_DIR

echo -e "${GREEN}✅ Created directory: $APP_DIR${NC}"
echo ""

echo -e "${GREEN}Step 3: Clone or Copy Application${NC}"
echo "--------------------------------------------------------------------------------"

echo "ℹ️  Upload your backend files to $APP_DIR"
echo "   Required: api/, database/, services/, config/, models/, utils/, app.py, requirements.txt"
echo ""
read -p "Press Enter when files are uploaded..."

echo -e "${GREEN}Step 4: Setup Python Virtual Environment${NC}"
echo "--------------------------------------------------------------------------------"

python3 -m venv venv
source venv/bin/activate

echo -e "${GREEN}✅ Virtual environment created${NC}"
echo ""

echo -e "${GREEN}Step 5: Install Python Dependencies${NC}"
echo "--------------------------------------------------------------------------------"

if [ ! -f "requirements.txt" ]; then
    cat > requirements.txt << EOF
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic
pydantic-settings==2.1.0
python-dotenv==1.0.0
openai
anthropic==0.7.8
mem0ai==0.0.12
httpx==0.25.2
python-multipart==0.0.6
mistralai
sqlalchemy==2.0.23
bcrypt==4.1.1
cryptography==41.0.7
EOF
fi

pip install -r requirements.txt

echo -e "${GREEN}✅ Python dependencies installed${NC}"
echo ""

echo -e "${GREEN}Step 6: Create Environment Configuration${NC}"
echo "--------------------------------------------------------------------------------"

ENCRYPTION_KEY=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")

cat > .env << EOF
DATABASE_URL=sqlite:///./sharedlm.db

OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
MISTRAL_API_KEY=your_mistral_key_here
mem0_api_key=your_mem0_key_here

ENCRYPTION_KEY=$ENCRYPTION_KEY

HOST=0.0.0.0
PORT=8000

CORS_ORIGINS=https://yourdomain.com,http://localhost:3000
EOF

echo -e "${GREEN}✅ Environment file created${NC}"
echo -e "${YELLOW}⚠️  IMPORTANT: Edit $APP_DIR/.env to add your actual API keys!${NC}"
echo ""

echo -e "${GREEN}Step 7: Initialize SQLite Database${NC}"
echo "--------------------------------------------------------------------------------"

python3 << 'PYTHON_SCRIPT'
from database.connection import engine
from database.models import Base
from sqlalchemy import text

print("Creating tables...")
Base.metadata.create_all(engine)

print("Enabling WAL mode...")
with engine.connect() as conn:
    conn.execute(text("PRAGMA journal_mode=WAL"))
    conn.execute(text("PRAGMA foreign_keys=ON"))
    conn.commit()

print("✅ Database initialized!")
PYTHON_SCRIPT

echo -e "${GREEN}✅ SQLite database initialized${NC}"
echo ""

echo -e "${GREEN}Step 8: Create Systemd Service${NC}"
echo "--------------------------------------------------------------------------------"

cat > /etc/systemd/system/sharedlm.service << EOF
[Unit]
Description=SharedLM Backend API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=$APP_DIR
Environment="PATH=$APP_DIR/venv/bin"
ExecStart=$APP_DIR/venv/bin/uvicorn app:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

chown -R www-data:www-data $APP_DIR

systemctl daemon-reload
systemctl enable sharedlm
systemctl start sharedlm

echo -e "${GREEN}✅ Systemd service created and started${NC}"
echo ""

echo -e "${GREEN}Step 9: Configure Nginx Reverse Proxy${NC}"
echo "--------------------------------------------------------------------------------"

cat > /etc/nginx/sites-available/sharedlm << 'EOF'
server {
    listen 80;
    server_name _;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

ln -sf /etc/nginx/sites-available/sharedlm /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl reload nginx

echo -e "${GREEN}✅ Nginx configured${NC}"
echo ""

echo -e "${GREEN}Step 10: Setup Automatic Backups${NC}"
echo "--------------------------------------------------------------------------------"

mkdir -p $APP_DIR/backups

cat > $APP_DIR/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/sharedlm/backups"
DB_FILE="/opt/sharedlm/sharedlm.db"

if [ ! -f "$DB_FILE" ]; then
    echo "❌ Database not found"
    exit 1
fi

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/sharedlm_$TIMESTAMP.db"

cp "$DB_FILE" "$BACKUP_FILE"
gzip "$BACKUP_FILE"

find $BACKUP_DIR -name "sharedlm_*.db.gz" -mtime +7 -delete

echo "✅ Backup created: $BACKUP_FILE.gz"
EOF

chmod +x $APP_DIR/backup.sh

(crontab -l 2>/dev/null | grep -v "sharedlm/backup.sh"; echo "0 2 * * * $APP_DIR/backup.sh >> $APP_DIR/backup.log 2>&1") | crontab -

echo -e "${GREEN}✅ Automatic daily backups configured (2 AM)${NC}"
echo ""

echo "================================================================================"
echo "Setup Complete!"
echo "================================================================================"
echo ""
echo -e "${GREEN}✅ SharedLM backend is running!${NC}"
echo ""
echo "📋 Service Status:"
systemctl status sharedlm --no-pager -l | head -10
echo ""
echo "📁 Installation: $APP_DIR"
echo "📊 Database: $APP_DIR/sharedlm.db"
echo ""
echo "🔧 Service Commands:"
echo "   systemctl start sharedlm"
echo "   systemctl stop sharedlm"
echo "   systemctl restart sharedlm"
echo "   systemctl status sharedlm"
echo ""
echo "📝 View Logs:"
echo "   journalctl -u sharedlm -f"
echo ""
echo "🔐 IMPORTANT - Edit API Keys:"
echo "   nano $APP_DIR/.env"
echo "   Then: systemctl restart sharedlm"
echo ""
echo "🌐 API Available At:"
echo "   http://$(hostname -I | awk '{print $1}'):8000"
echo "   http://localhost:8000"
echo ""
echo "🔒 Setup SSL (Optional):"
echo "   apt install certbot python3-certbot-nginx"
echo "   certbot --nginx -d yourdomain.com"
echo ""
echo "💾 Manual Backup:"
echo "   $APP_DIR/backup.sh"
echo ""