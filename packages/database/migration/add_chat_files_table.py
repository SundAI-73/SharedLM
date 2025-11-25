#!/usr/bin/env python3
"""
Add chat_files table to existing database
Run from: packages/database/migration/
Adds: chat_files table for storing file attachments in conversations
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
from database.connection import Base
from database.models import ChatFile

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sharedlm.db")


def add_chat_files_table():
    print("=" * 80)
    print("Add chat_files Table Migration")
    print("=" * 80)
    print("")
    
    try:
        engine = create_engine(DATABASE_URL, connect_args={'check_same_thread': False})
        
        # Check if table already exists
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        
        if 'chat_files' in existing_tables:
            print("✅ chat_files table already exists!")
            print("\nChecking table structure...")
            
            columns = inspector.get_columns('chat_files')
            print(f"\nCurrent columns:")
            for col in columns:
                print(f"  - {col['name']} ({col['type']})")
            
            return True
        
        print("📦 Creating chat_files table...")
        
        # Create the table using SQLAlchemy
        ChatFile.__table__.create(engine, checkfirst=True)
        
        print("✅ chat_files table created successfully!")
        
        # Verify the table was created
        columns = inspector.get_columns('chat_files')
        print("\nTable structure:")
        for col in columns:
            print(f"  - {col['name']} ({col['type']})")
        
        print("\n" + "=" * 80)
        print("Migration Complete")
        print("=" * 80)
        print("\nThe chat_files table has been added to your database.")
        print("\nNext steps:")
        print("1. Restart your backend server")
        print("2. File attachments will now be saved and used in chat responses")
        
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = add_chat_files_table()
    sys.exit(0 if success else 1)

