#!/usr/bin/env python3
"""
Cleanup Old Data from SharedLM Database
Run from: database-scripts/maintenance/
Archives: Old conversations, usage logs, deleted items
"""

import os
import sys
from pathlib import Path
from datetime import datetime, timedelta
import json

script_dir = Path(__file__).parent
project_root = script_dir.parent.parent
backend_dir = project_root / 'backend'

if not backend_dir.exists():
    print(f"❌ Backend directory not found: {backend_dir}")
    sys.exit(1)

sys.path.insert(0, str(backend_dir))
os.chdir(backend_dir)

from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sharedlm.db")


def archive_old_conversations(months=6, dry_run=True):
    """Archive conversations older than specified months"""
    
    print("=" * 80)
    print("Archive Old Conversations")
    print("=" * 80)
    print("")
    
    try:
        engine = create_engine(DATABASE_URL)
        
        cutoff_date = datetime.now() - timedelta(days=months * 30)
        cutoff_str = cutoff_date.strftime('%Y-%m-%d')
        
        with engine.connect() as conn:
            result = conn.execute(text(f"""
                SELECT COUNT(*) FROM conversations 
                WHERE updated_at < '{cutoff_str}' 
                AND is_archived = 0
            """)).fetchone()
            
            count = result[0]
            
            if count == 0:
                print(f"✅ No conversations older than {months} months to archive")
                return
            
            print(f"Found {count} conversations older than {months} months")
            print(f"Cutoff date: {cutoff_str}")
            
            if dry_run:
                print("\n📊 Preview (DRY RUN - No changes):")
                conversations = conn.execute(text(f"""
                    SELECT id, title, updated_at, message_count 
                    FROM conversations 
                    WHERE updated_at < '{cutoff_str}' 
                    AND is_archived = 0
                    LIMIT 10
                """)).fetchall()
                
                for conv in conversations:
                    print(f"   • {conv[1][:50]} ({conv[3]} msgs, {conv[2]})")
                
                if count > 10:
                    print(f"   ... and {count - 10} more")
            else:
                print(f"\n🗄️  Archiving {count} conversations...")
                conn.execute(text(f"""
                    UPDATE conversations 
                    SET is_archived = 1 
                    WHERE updated_at < '{cutoff_str}' 
                    AND is_archived = 0
                """))
                conn.commit()
                print("✅ Conversations archived")
        
    except Exception as e:
        print(f"❌ Error: {e}")


def cleanup_usage_logs(days=90, dry_run=True):
    """Delete usage logs older than specified days"""
    
    print("\n" + "=" * 80)
    print("Cleanup Old Usage Logs")
    print("=" * 80)
    print("")
    
    try:
        engine = create_engine(DATABASE_URL)
        
        cutoff_date = datetime.now() - timedelta(days=days)
        cutoff_str = cutoff_date.strftime('%Y-%m-%d')
        
        with engine.connect() as conn:
            result = conn.execute(text(f"""
                SELECT COUNT(*) FROM usage_logs 
                WHERE created_at < '{cutoff_str}'
            """)).fetchone()
            
            count = result[0]
            
            if count == 0:
                print(f"✅ No usage logs older than {days} days")
                return
            
            print(f"Found {count} usage logs older than {days} days")
            
            if dry_run:
                print(f"\n📊 Would delete {count} log entries (DRY RUN)")
            else:
                print(f"\n🗑️  Deleting {count} log entries...")
                conn.execute(text(f"""
                    DELETE FROM usage_logs 
                    WHERE created_at < '{cutoff_str}'
                """))
                conn.commit()
                print("✅ Usage logs cleaned")
        
    except Exception as e:
        print(f"❌ Error: {e}")


def delete_soft_deleted_messages(days=30, dry_run=True):
    """Permanently delete messages marked as deleted"""
    
    print("\n" + "=" * 80)
    print("Remove Soft-Deleted Messages")
    print("=" * 80)
    print("")
    
    try:
        engine = create_engine(DATABASE_URL)
        
        cutoff_date = datetime.now() - timedelta(days=days)
        cutoff_str = cutoff_date.strftime('%Y-%m-%d')
        
        with engine.connect() as conn:
            result = conn.execute(text(f"""
                SELECT COUNT(*) FROM messages 
                WHERE is_deleted = 1 
                AND created_at < '{cutoff_str}'
            """)).fetchone()
            
            count = result[0]
            
            if count == 0:
                print(f"✅ No soft-deleted messages older than {days} days")
                return
            
            print(f"Found {count} soft-deleted messages older than {days} days")
            
            if dry_run:
                print(f"\n📊 Would permanently delete {count} messages (DRY RUN)")
            else:
                print(f"\n🗑️  Permanently deleting {count} messages...")
                conn.execute(text(f"""
                    DELETE FROM messages 
                    WHERE is_deleted = 1 
                    AND created_at < '{cutoff_str}'
                """))
                conn.commit()
                print("✅ Soft-deleted messages removed")
        
    except Exception as e:
        print(f"❌ Error: {e}")


def vacuum_database(dry_run=True):
    """Compact database and reclaim space"""
    
    print("\n" + "=" * 80)
    print("Vacuum Database")
    print("=" * 80)
    print("")
    
    if not os.path.exists("sharedlm.db"):
        print("❌ Database not found")
        return
    
    before_size = os.path.getsize("sharedlm.db") / 1024
    print(f"Current size: {before_size:.2f} KB")
    
    if dry_run:
        print("\n📊 Would run VACUUM to compact database (DRY RUN)")
        return
    
    try:
        engine = create_engine(DATABASE_URL)
        
        print("\n🔧 Running VACUUM...")
        with engine.connect() as conn:
            conn.execute(text("VACUUM"))
            conn.commit()
        
        after_size = os.path.getsize("sharedlm.db") / 1024
        saved = before_size - after_size
        
        print(f"✅ Database compacted")
        print(f"   Before: {before_size:.2f} KB")
        print(f"   After: {after_size:.2f} KB")
        print(f"   Saved: {saved:.2f} KB")
        
    except Exception as e:
        print(f"❌ Error: {e}")


def main():
    print("=" * 80)
    print("SharedLM Database Cleanup Utility")
    print("=" * 80)
    print(f"Database: {backend_dir}/sharedlm.db")
    print("")
    print("1. Archive Old Conversations (6+ months)")
    print("2. Cleanup Usage Logs (90+ days)")
    print("3. Delete Soft-Deleted Messages (30+ days)")
    print("4. Vacuum Database (Reclaim Space)")
    print("5. Run All Cleanup Tasks")
    print("")
    
    choice = input("Enter choice (1-5): ").strip()
    
    print("\nMode:")
    print("  1. DRY RUN (Preview only)")
    print("  2. EXECUTE (Actually clean)")
    print("")
    
    mode = input("Enter mode (1 or 2): ").strip()
    dry_run = mode != '2'
    
    if not dry_run:
        confirm = input("\n⚠️  This will modify your database. Continue? (yes/no): ").strip().lower()
        if confirm != 'yes':
            print("Cancelled.")
            return
    
    print("")
    
    if choice == '1':
        archive_old_conversations(months=6, dry_run=dry_run)
    elif choice == '2':
        cleanup_usage_logs(days=90, dry_run=dry_run)
    elif choice == '3':
        delete_soft_deleted_messages(days=30, dry_run=dry_run)
    elif choice == '4':
        vacuum_database(dry_run=dry_run)
    elif choice == '5':
        archive_old_conversations(months=6, dry_run=dry_run)
        cleanup_usage_logs(days=90, dry_run=dry_run)
        delete_soft_deleted_messages(days=30, dry_run=dry_run)
        vacuum_database(dry_run=dry_run)
    else:
        print("Invalid choice.")
        return
    
    if dry_run:
        print("\n💡 Run with mode 2 to actually execute cleanup.")
    else:
        print("\n✅ Cleanup complete!")
    
    print("")


if __name__ == "__main__":
    main()