#!/usr/bin/env python3
"""
Migrate data from PostgreSQL to SQLite
Run from: database-scripts/migration/
Migrates: All existing data to backend/sharedlm.db
"""

import os
import sys
from pathlib import Path
from datetime import datetime
import shutil

script_dir = Path(__file__).parent
project_root = script_dir.parent.parent
backend_dir = project_root / 'backend'

if not backend_dir.exists():
    print(f"❌ Backend directory not found: {backend_dir}")
    sys.exit(1)

sys.path.insert(0, str(backend_dir))
os.chdir(backend_dir)

print(f"✅ Working from: {os.getcwd()}\n")

from sqlalchemy import create_engine, MetaData
from sqlalchemy.orm import sessionmaker

POSTGRES_URL = os.getenv(
    "POSTGRES_URL",
    "postgresql://postgres:password@localhost:5432/sharedlm"
)

SQLITE_URL = "sqlite:///./sharedlm.db"


def create_backup():
    """Backup existing SQLite database if exists"""
    if os.path.exists("sharedlm.db"):
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_name = f"sharedlm_backup_{timestamp}.db"
        shutil.copy("sharedlm.db", backup_name)
        print(f"✅ Existing SQLite backup: {backup_name}\n")
        return backup_name
    return None


def migrate_data():
    """Migrate all data from PostgreSQL to SQLite"""
    
    print("=" * 80)
    print("PostgreSQL → SQLite Migration for SharedLM")
    print("=" * 80)
    print("")
    
    create_backup()
    
    try:
        print("📡 Connecting to PostgreSQL...")
        pg_engine = create_engine(POSTGRES_URL)
        pg_session = sessionmaker(bind=pg_engine)()
        pg_metadata = MetaData()
        pg_metadata.reflect(bind=pg_engine)
        
        print("✅ Connected to PostgreSQL")
        
    except Exception as e:
        print(f"❌ Failed to connect to PostgreSQL: {e}")
        print("\nMake sure:")
        print("  1. PostgreSQL is running")
        print("  2. Credentials in POSTGRES_URL are correct")
        print("  3. Database 'sharedlm' exists")
        return False
    
    try:
        print("📦 Creating SQLite database...")
        sqlite_engine = create_engine(
            SQLITE_URL,
            connect_args={'check_same_thread': False}
        )
        
        print("🔨 Creating tables in SQLite...")
        from database.models import Base
        Base.metadata.create_all(sqlite_engine)
        
        sqlite_session = sessionmaker(bind=sqlite_engine)()
        
        print("✅ SQLite database created\n")
        
    except Exception as e:
        print(f"❌ Failed to create SQLite database: {e}")
        return False
    
    tables_to_migrate = [
        'users',
        'api_keys', 
        'projects',
        'conversations',
        'messages',
        'project_files'
    ]
    
    print("=" * 80)
    print("Migrating Data")
    print("=" * 80)
    
    total_rows = 0
    
    for table_name in tables_to_migrate:
        try:
            if table_name not in pg_metadata.tables:
                print(f"\n⚠️  Table '{table_name}' not found in PostgreSQL, skipping...")
                continue
            
            pg_table = pg_metadata.tables[table_name]
            
            rows = pg_session.execute(pg_table.select()).fetchall()
            
            if rows:
                print(f"\n📋 Migrating {table_name}: {len(rows)} rows")
                
                sqlite_metadata = MetaData()
                sqlite_metadata.reflect(bind=sqlite_engine)
                sqlite_table = sqlite_metadata.tables[table_name]
                
                success_count = 0
                for row in rows:
                    row_dict = dict(row._mapping)
                    
                    try:
                        sqlite_session.execute(sqlite_table.insert().values(**row_dict))
                        success_count += 1
                    except Exception as e:
                        print(f"   ⚠️  Failed to insert row: {e}")
                        continue
                
                sqlite_session.commit()
                print(f"   ✅ Migrated {success_count}/{len(rows)} rows")
                total_rows += success_count
            else:
                print(f"\n📋 {table_name}: No data to migrate")
                
        except Exception as e:
            print(f"   ❌ Error migrating {table_name}: {e}")
            sqlite_session.rollback()
            continue
    
    print("\n" + "=" * 80)
    print("Migration Complete")
    print("=" * 80)
    print(f"\n✅ Successfully migrated {total_rows} total rows")
    print(f"\n📁 SQLite database created: backend/sharedlm.db")
    print(f"📊 File size: {os.path.getsize('sharedlm.db') / 1024:.2f} KB")
    
    print("\n" + "=" * 80)
    print("Next Steps")
    print("=" * 80)
    print("\n1. Update backend/.env file:")
    print("   DATABASE_URL=sqlite:///./sharedlm.db")
    print("\n2. Restart your backend:")
    print("   cd backend")
    print("   uvicorn app:app --reload")
    print("\n3. Test your application")
    print("\n4. Keep PostgreSQL backup for safety")
    print("")
    
    pg_session.close()
    sqlite_session.close()
    
    return True


if __name__ == "__main__":
    success = migrate_data()
    
    if success:
        print("🎉 Migration successful!")
    else:
        print("❌ Migration failed. Check errors above.")