#!/usr/bin/env python3

import os
import sys
from pathlib import Path

script_dir = Path(__file__).parent
project_root = script_dir.parent.parent.parent
backend_dir = project_root / 'apps' / 'server'

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
print("Add Custom Integrations Table Migration")
print("=" * 80)
print()

if not os.path.exists("sharedlm.db"):
    print("Database not found. Please run init_sqlite_database.py first.")
    sys.exit(1)

try:
    engine = create_engine(DATABASE_URL, connect_args={'check_same_thread': False})
    
    with engine.connect() as conn:
        print("Checking if custom_integrations table exists...")
        
        result = conn.execute(text(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='custom_integrations'"
        )).fetchone()
        
        if result:
            print("Table 'custom_integrations' already exists. Skipping creation.")
        else:
            print("Creating custom_integrations table...")
            
            conn.execute(text("""
                CREATE TABLE custom_integrations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    provider_id TEXT NOT NULL,
                    base_url TEXT,
                    api_type TEXT DEFAULT 'openai',
                    logo_url TEXT,
                    is_active INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """))
            
            print("Creating indexes...")
            conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_custom_integrations_user_id ON custom_integrations(user_id)"
            ))
            conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_custom_integrations_provider_id ON custom_integrations(provider_id)"
            ))
            
            conn.commit()
            
            print("Table created successfully")
        
        print("\nVerifying table structure...")
        result = conn.execute(text("PRAGMA table_info(custom_integrations)")).fetchall()
        
        print("\nTable columns:")
        for col in result:
            print(f"  - {col[1]} ({col[2]})")
        
        count = conn.execute(text("SELECT COUNT(*) FROM custom_integrations")).fetchone()
        print(f"\nCurrent row count: {count[0]}")
    
    print("\n" + "=" * 80)
    print("Migration Complete")
    print("=" * 80)
    print("\nCustom integrations table is ready to use")
    print("\nNext steps:")
    print("1. Restart your backend server")
    print("2. Custom integrations will now be available in the UI")
    
except Exception as e:
    print(f"\nError: {e}")
    sys.exit(1)