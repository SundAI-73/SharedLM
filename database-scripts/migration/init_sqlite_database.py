#!/usr/bin/env python3
"""
Initialize Fresh SQLite Database for SharedLM
Run from: database-scripts/migration/
Creates: backend/sharedlm.db
"""

import os
import sys
from pathlib import Path
from datetime import datetime

script_dir = Path(__file__).parent
project_root = script_dir.parent.parent
backend_dir = project_root / 'backend'

if not backend_dir.exists():
    print(f"❌ Backend directory not found: {backend_dir}")
    print(f"   Script location: {script_dir}")
    print(f"   Project root: {project_root}")
    sys.exit(1)

sys.path.insert(0, str(backend_dir))
os.chdir(backend_dir)

print(f"✅ Working from: {os.getcwd()}\n")

from sqlalchemy import create_engine, text

SQLITE_URL = "sqlite:///./sharedlm.db"


def init_fresh_database():
    print("=" * 80)
    print("Fresh SQLite Database Setup for SharedLM")
    print("=" * 80)
    print("")
    
    db_path = backend_dir / "sharedlm.db"
    
    if db_path.exists():
        print("⚠️  Database file 'sharedlm.db' already exists!")
        choice = input("Overwrite? This will DELETE all existing data! (yes/no): ").strip().lower()
        if choice != 'yes':
            print("Cancelled.")
            return False
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_name = f"sharedlm_backup_{timestamp}.db"
        os.rename("sharedlm.db", backup_name)
        print(f"✅ Existing database backed up to: {backup_name}\n")
    
    try:
        print("📦 Creating SQLite database...")
        engine = create_engine(
            SQLITE_URL,
            connect_args={
                'check_same_thread': False,
                'timeout': 30
            }
        )
        
        print("🔨 Creating tables...")
        
        from database.models import Base
        Base.metadata.create_all(engine)
        
        print("✅ Tables created successfully")
        
        with engine.connect() as conn:
            print("\n⚡ Configuring SQLite for performance...")
            conn.execute(text("PRAGMA journal_mode=WAL"))
            conn.execute(text("PRAGMA synchronous=NORMAL"))
            conn.execute(text("PRAGMA cache_size=-64000"))
            conn.execute(text("PRAGMA temp_store=MEMORY"))
            conn.execute(text("PRAGMA foreign_keys=ON"))
            conn.commit()
            print("✅ Performance settings applied")
            
            print("\n📊 Database Info:")
            result = conn.execute(text("PRAGMA page_size")).fetchone()
            print(f"   Page size: {result[0]} bytes")
            
            result = conn.execute(text("PRAGMA journal_mode")).fetchone()
            print(f"   Journal mode: {result[0]}")
            
            tables = conn.execute(text(
                "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
            )).fetchall()
            
            print(f"\n📋 Tables created ({len(tables)}):")
            for table in tables:
                count = conn.execute(text(f"SELECT COUNT(*) FROM {table[0]}")).fetchone()
                print(f"   • {table[0]}: {count[0]} rows")
        
        print("\n" + "=" * 80)
        print("Setup Complete!")
        print("=" * 80)
        print(f"\n✅ Database file: backend/sharedlm.db")
        print(f"📊 Size: {os.path.getsize('sharedlm.db') / 1024:.2f} KB")
        
        print("\n" + "=" * 80)
        print("Next Steps")
        print("=" * 80)
        print("\n1. Update backend/.env file:")
        print("   DATABASE_URL=sqlite:///./sharedlm.db")
        print("\n2. Restart your backend:")
        print("   cd backend")
        print("   uvicorn app:app --reload")
        print("")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = init_fresh_database()
    
    if success:
        print("🎉 SQLite database ready!")
    else:
        print("❌ Setup failed. Check errors above.")