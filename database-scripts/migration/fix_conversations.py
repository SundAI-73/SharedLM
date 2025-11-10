#!/usr/bin/env python3

import os
import sys
from pathlib import Path

script_dir = Path(__file__).parent
project_root = script_dir.parent.parent
backend_dir = project_root / 'backend'

if not backend_dir.exists():
    print(f"Backend directory not found: {backend_dir}")
    sys.exit(1)

sys.path.insert(0, str(backend_dir))
os.chdir(backend_dir)

print(f"Working from: {os.getcwd()}\n")

from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sharedlm.db")

print("=" * 80)
print("Fix Conversations Table - Add Missing Columns")
print("=" * 80)
print()

if not os.path.exists("sharedlm.db"):
    print("Database not found. Please run init_sqlite_database.py first.")
    sys.exit(1)

try:
    engine = create_engine(DATABASE_URL, connect_args={'check_same_thread': False})
    
    with engine.connect() as conn:
        print("Checking conversations table structure...")
        
        columns = conn.execute(text("PRAGMA table_info(conversations)")).fetchall()
        existing_columns = [col[1] for col in columns]
        
        print(f"\nCurrent columns: {', '.join(existing_columns)}")
        
        columns_to_add = []
        
        if 'is_starred' not in existing_columns:
            columns_to_add.append("ALTER TABLE conversations ADD COLUMN is_starred INTEGER DEFAULT 0")
        
        if 'is_archived' not in existing_columns:
            columns_to_add.append("ALTER TABLE conversations ADD COLUMN is_archived INTEGER DEFAULT 0")
        
        if 'mem0_thread_id' not in existing_columns:
            columns_to_add.append("ALTER TABLE conversations ADD COLUMN mem0_thread_id TEXT")
        
        if 'sync_version' not in existing_columns:
            columns_to_add.append("ALTER TABLE conversations ADD COLUMN sync_version INTEGER DEFAULT 1")
        
        if not columns_to_add:
            print("\nAll columns already exist!")
        else:
            print(f"\nAdding {len(columns_to_add)} missing columns...")
            
            for sql in columns_to_add:
                print(f"  - {sql}")
                conn.execute(text(sql))
            
            conn.commit()
            print("\nColumns added successfully!")
        
        print("\nVerifying updated table structure...")
        columns = conn.execute(text("PRAGMA table_info(conversations)")).fetchall()
        
        print("\nFinal columns:")
        for col in columns:
            print(f"  - {col[1]} ({col[2]})")
    
    print("\n" + "=" * 80)
    print("Migration Complete")
    print("=" * 80)
    print("\nConversations table is now up to date")
    print("\nNext steps:")
    print("1. Restart your backend server")
    print("2. Try chatting again - it should work now")
    
except Exception as e:
    print(f"\nError: {e}")
    sys.exit(1)