# 🗄️ SharedLM Database Scripts

Complete database management tools for SharedLM - migration, backup, and deployment.

---

## 📁 Folder Structure

```
database-scripts/
├── migration/              # Database setup & migration
│   ├── init_sqlite_database.py
│   ├── migrate_postgres_to_sqlite.py
│   └── init_mem0_hybrid.py
├── maintenance/            # Backup & cleanup
│   └── backup_sqlite.py
└── deployment/             # Production deployment
    └── deploy_server.sh
```

---

## 🚀 Quick Start (Choose Your Path)

### **Path A: Fresh Start (No PostgreSQL)**

```bash
# 1. Run from migration folder
cd database-scripts/migration
python init_sqlite_database.py

# 2. Update backend/.env
DATABASE_URL=sqlite:///./sharedlm.db

# 3. Start backend
cd ../../backend
uvicorn app:app --reload
```

### **Path B: Migrate Existing PostgreSQL Data**

```bash
# 1. Export PostgreSQL data
cd database-scripts/migration
python migrate_postgres_to_sqlite.py

# 2. Update backend/.env
DATABASE_URL=sqlite:///./sharedlm.db

# 3. Start backend
cd ../../backend
uvicorn app:app --reload
```

---

## 📖 Script Documentation

### **Migration Scripts**

#### `init_sqlite_database.py`
**Purpose:** Create fresh SQLite database  
**Use When:** Starting new or want clean database  
**What It Does:**
- Creates all tables
- Enables WAL mode (performance)
- Sets up indexes
- Configures foreign keys

**Usage:**
```bash
cd database-scripts/migration
python init_sqlite_database.py
```

#### `migrate_postgres_to_sqlite.py`
**Purpose:** Migrate existing PostgreSQL data  
**Use When:** You have data in PostgreSQL to preserve  
**What It Does:**
- Exports all tables from PostgreSQL
- Creates SQLite database
- Imports all data
- Preserves relationships

**Usage:**
```bash
cd database-scripts/migration
python migrate_postgres_to_sqlite.py
```

#### `init_mem0_hybrid.py`
**Purpose:** Add Mem0 hybrid storage support  
**Use When:** After SQLite setup, want Mem0 integration  
**What It Does:**
- Adds `mem0_memory_id` to messages
- Adds `mem0_thread_id` to conversations
- Adds storage quota columns
- Creates performance indexes
- Tests Mem0 connection

**Usage:**
```bash
cd database-scripts/migration
python init_mem0_hybrid.py
```

---

### **Maintenance Scripts**

#### `backup_sqlite.py`
**Purpose:** Backup, restore, and export database  
**Use When:** Regular backups or before major changes  
**What It Does:**
- Create timestamped backups
- List all available backups
- Restore from backup
- Export to JSON format

**Usage:**
```bash
cd database-scripts/maintenance
python backup_sqlite.py

# Choose:
# 1. Create Backup
# 2. List Backups
# 3. Restore from Backup
# 4. Export to JSON
```

---

### **Deployment Scripts**

#### `deploy_server.sh`
**Purpose:** Production server deployment  
**Use When:** Deploying to Ubuntu/Debian server  
**What It Does:**
- Installs dependencies
- Sets up virtual environment
- Creates SQLite database
- Configures Nginx reverse proxy
- Sets up systemd service
- Configures automatic backups

**Usage:**
```bash
# On your server
sudo chmod +x deploy_server.sh
sudo ./deploy_server.sh
```

---

## 🔧 Configuration

### **Environment Variables (backend/.env)**

```bash
# Database
DATABASE_URL=sqlite:///./sharedlm.db

# API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
MISTRAL_API_KEY=...
mem0_api_key=...

# Encryption (auto-generated)
ENCRYPTION_KEY=...

# Server
HOST=0.0.0.0
PORT=8000
```

---

## 📋 Common Workflows

### **Setup New Development Environment**
```bash
cd database-scripts/migration
python init_sqlite_database.py
python init_mem0_hybrid.py
```

### **Daily Backup**
```bash
cd database-scripts/maintenance
python backup_sqlite.py
# Choose: 1
```

### **Restore After Mistake**
```bash
cd database-scripts/maintenance
python backup_sqlite.py
# Choose: 3, then select backup
```

### **Deploy to Production**
```bash
sudo ./database-scripts/deployment/deploy_server.sh
```

---

## 🚨 Troubleshooting

### **"Backend directory not found"**
```bash
# Make sure folder structure is:
# SHAREDLM/
#   ├── backend/
#   ├── frontend/
#   └── database-scripts/
```

### **"Database is locked"**
```bash
# Close all connections to database
# WAL mode should prevent this
```

### **"Mem0 connection failed"**
```bash
# Add API key to backend/.env
mem0_api_key=your_actual_key
```

---

## 📊 Database Locations

- **Development:** `backend/sharedlm.db`
- **Production:** `/opt/sharedlm/sharedlm.db`
- **Backups:** `backend/backups/` or `/opt/sharedlm/backups/`

---

## 🎯 Best Practices

1. **Always backup before migrations**
2. **Test scripts on development first**
3. **Keep backups for 7+ days**
4. **Monitor database size**
5. **Run cleanup scripts monthly**

---

## 🆘 Support

If scripts fail:
1. Check you're in correct directory
2. Verify backend/ folder exists
3. Check Python path includes backend
4. Review error messages carefully
5. Check backend/.env configuration

---

## 📝 Notes

- All scripts auto-navigate to backend folder
- Can run from anywhere in project
- Scripts are idempotent (safe to run multiple times)
- Backups are automatic and timestamped
- WAL mode enabled for better concurrency

---

**Need help? Check error messages - they're descriptive!** 🎯