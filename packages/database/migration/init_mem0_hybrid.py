#!/usr/bin/env python3
"""
Initialize Mem0 + Hybrid Storage for SharedLM
Run from: packages/database/migration/
Adds: Hybrid storage columns to existing database
"""

import os
import sys
from pathlib import Path

script_dir = Path(__file__).parent
project_root = script_dir.parent.parent.parent
backend_dir = project_root / 'apps' / 'server'

if not backend_dir.exists():
    print(f"❌ Backend directory not found: {backend_dir}")
    sys.exit(1)

sys.path.insert(0, str(backend_dir))
os.chdir(backend_dir)

print(f"✅ Working from: {os.getcwd()}\n")

from sqlalchemy import create_engine, text, inspect
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sharedlm.db")
MEM0_API_KEY = os.getenv("mem0_api_key", "")


def check_mem0_connection():
    """Test Mem0 API connection"""
    try:
        from mem0 import MemoryClient
        
        if not MEM0_API_KEY:
            print("⚠️  MEM0_API_KEY not found in .env file")
            print("   Add to apps/server/.env: mem0_api_key=your_key_here")
            return False
        
        client = MemoryClient(api_key=MEM0_API_KEY)
        
        test_result = client.search(
            query="test",
            user_id="test_user",
            limit=1,
            version="v2"
        )
        
        print("✅ Mem0 API connection successful")
        return True
        
    except ImportError:
        print("❌ Mem0 not installed. Run: pip install mem0ai")
        return False
    except Exception as e:
        print(f"❌ Mem0 connection failed: {e}")
        return False


def add_hybrid_columns():
    """Add columns needed for hybrid SQLite + Mem0 storage"""
    
    print("\n" + "=" * 80)
    print("Adding Hybrid Storage Columns")
    print("=" * 80)
    print("")
    
    try:
        engine = create_engine(DATABASE_URL)
        inspector = inspect(engine)
        
        migrations = []
        
        existing_conversations = [col['name'] for col in inspector.get_columns('conversations')]
        if 'mem0_thread_id' not in existing_conversations:
            migrations.append("ALTER TABLE conversations ADD COLUMN mem0_thread_id TEXT")
        if 'is_archived' not in existing_conversations:
            migrations.append("ALTER TABLE conversations ADD COLUMN is_archived INTEGER DEFAULT 0")
        if 'sync_version' not in existing_conversations:
            migrations.append("ALTER TABLE conversations ADD COLUMN sync_version INTEGER DEFAULT 1")
        
        existing_messages = [col['name'] for col in inspector.get_columns('messages')]
        if 'mem0_memory_id' not in existing_messages:
            migrations.append("ALTER TABLE messages ADD COLUMN mem0_memory_id TEXT")
        if 'token_count' not in existing_messages:
            migrations.append("ALTER TABLE messages ADD COLUMN token_count INTEGER")
        if 'is_deleted' not in existing_messages:
            migrations.append("ALTER TABLE messages ADD COLUMN is_deleted INTEGER DEFAULT 0")
        
        existing_files = [col['name'] for col in inspector.get_columns('project_files')]
        if 'cloud_url' not in existing_files:
            migrations.append("ALTER TABLE project_files ADD COLUMN cloud_url TEXT")
        if 'storage_type' not in existing_files:
            migrations.append("ALTER TABLE project_files ADD COLUMN storage_type TEXT DEFAULT 'local'")
        if 'checksum' not in existing_files:
            migrations.append("ALTER TABLE project_files ADD COLUMN checksum TEXT")
        
        existing_users = [col['name'] for col in inspector.get_columns('users')]
        if 'storage_quota_mb' not in existing_users:
            migrations.append("ALTER TABLE users ADD COLUMN storage_quota_mb INTEGER DEFAULT 100")
        if 'storage_used_mb' not in existing_users:
            migrations.append("ALTER TABLE users ADD COLUMN storage_used_mb INTEGER DEFAULT 0")
        
        existing_projects = [col['name'] for col in inspector.get_columns('projects')]
        if 'settings' not in existing_projects:
            migrations.append("ALTER TABLE projects ADD COLUMN settings TEXT")
        
        if not migrations:
            print("✅ All hybrid columns already exist")
        else:
            print(f"📝 Applying {len(migrations)} schema updates...")
            
            with engine.connect() as conn:
                for migration in migrations:
                    print(f"   • {migration}")
                    conn.execute(text(migration))
                    conn.commit()
            
            print("\n✅ All columns added successfully")
        
        return True
        
    except Exception as e:
        print(f"❌ Error adding columns: {e}")
        import traceback
        traceback.print_exc()
        return False


def create_indexes():
    """Create performance indexes"""
    
    print("\n" + "=" * 80)
    print("Creating Performance Indexes")
    print("=" * 80)
    print("")
    
    try:
        engine = create_engine(DATABASE_URL)
        
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
            "CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_api_keys_user_provider ON api_keys(user_id, provider)",
            "CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_projects_starred ON projects(user_id, is_starred)",
            "CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_conversations_project_id ON conversations(project_id)",
            "CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at)",
            "CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)",
            "CREATE INDEX IF NOT EXISTS idx_messages_mem0_id ON messages(mem0_memory_id)",
            "CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id)",
        ]
        
        with engine.connect() as conn:
            for idx_sql in indexes:
                conn.execute(text(idx_sql))
                conn.commit()
        
        print(f"✅ Created {len(indexes)} indexes")
        return True
        
    except Exception as e:
        print(f"❌ Error creating indexes: {e}")
        return False


def main():
    print("=" * 80)
    print("SharedLM - Mem0 + SQLite Hybrid Setup")
    print("=" * 80)
    print("")
    
    print("Step 1: Check Mem0 Connection")
    print("-" * 80)
    mem0_ok = check_mem0_connection()
    
    if not mem0_ok:
        print("\n⚠️  Mem0 not configured. You can continue but memory features won't work.")
        choice = input("Continue anyway? (yes/no): ").strip().lower()
        if choice != 'yes':
            return
    
    print("\nStep 2: Add Hybrid Storage Columns")
    print("-" * 80)
    columns_ok = add_hybrid_columns()
    
    if not columns_ok:
        print("\n❌ Failed to add columns. Exiting.")
        return
    
    print("\nStep 3: Create Performance Indexes")
    print("-" * 80)
    indexes_ok = create_indexes()
    
    print("\n" + "=" * 80)
    print("Setup Complete!")
    print("=" * 80)
    
    if mem0_ok and columns_ok and indexes_ok:
        print("\n✅ Your database is ready for hybrid storage!")
        print(f"\n📁 Database: apps/server/sharedlm.db")
        
        if os.path.exists("sharedlm.db"):
            print(f"📊 Size: {os.path.getsize('sharedlm.db') / 1024:.2f} KB")
        
        print("\n" + "=" * 80)
        print("Configuration Check")
        print("=" * 80)
        print("\nMake sure apps/server/.env has:")
        print("   DATABASE_URL=sqlite:///./sharedlm.db")
        print("   mem0_api_key=your_mem0_key")
        print("\nThen restart your backend:")
        print("   cd apps/server")
        print("   uvicorn app:app --reload")
        print("")
    else:
        print("\n⚠️  Setup completed with warnings. Check errors above.")


if __name__ == "__main__":
    main()