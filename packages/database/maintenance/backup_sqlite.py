#!/usr/bin/env python3
"""
SQLite Backup & Restore Utility for SharedLM
Run from: packages/database/maintenance/
Manages: Backups of apps/server/sharedlm.db
"""

import os
import sys
from pathlib import Path
import shutil
import sqlite3
from datetime import datetime
import json

script_dir = Path(__file__).parent
project_root = script_dir.parent.parent.parent
backend_dir = project_root / 'apps' / 'server'

if not backend_dir.exists():
    print(f"❌ Backend directory not found: {backend_dir}")
    sys.exit(1)

os.chdir(backend_dir)

DB_PATH = "sharedlm.db"
BACKUP_DIR = "backups"


def backup_database():
    """Create backup of SQLite database"""
    
    print("=" * 80)
    print("SQLite Database Backup")
    print("=" * 80)
    print("")
    
    if not os.path.exists(DB_PATH):
        print(f"❌ Database not found: {backend_dir}/{DB_PATH}")
        print("   Run init_sqlite_database.py first")
        return None
    
    os.makedirs(BACKUP_DIR, exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_name = f"sharedlm_{timestamp}.db"
    backup_path = os.path.join(BACKUP_DIR, backup_name)
    
    print(f"📦 Creating backup...")
    print(f"   Source: {DB_PATH}")
    print(f"   Destination: {backup_path}")
    print("")
    
    try:
        src_conn = sqlite3.connect(DB_PATH)
        dst_conn = sqlite3.connect(backup_path)
        
        src_conn.backup(dst_conn)
        
        src_conn.close()
        dst_conn.close()
        
        db_size = os.path.getsize(DB_PATH)
        backup_size = os.path.getsize(backup_path)
        
        print("✅ Backup created successfully!")
        print(f"   Original size: {db_size / 1024:.2f} KB")
        print(f"   Backup size: {backup_size / 1024:.2f} KB")
        
        stats = get_database_stats(backup_path)
        print(f"\n📊 Backup contains:")
        for table, count in stats.items():
            print(f"   • {table}: {count} rows")
        
        return backup_path
        
    except Exception as e:
        print(f"❌ Backup failed: {e}")
        return None


def list_backups():
    """List all available backups"""
    
    print("=" * 80)
    print("Available Backups")
    print("=" * 80)
    print("")
    
    if not os.path.exists(BACKUP_DIR):
        print("No backups folder found.")
        return []
    
    backups = [f for f in os.listdir(BACKUP_DIR) if f.endswith('.db')]
    
    if not backups:
        print("No backups found.")
        return []
    
    backups.sort(reverse=True)
    
    for i, backup in enumerate(backups, 1):
        backup_path = os.path.join(BACKUP_DIR, backup)
        size = os.path.getsize(backup_path) / 1024
        mtime = datetime.fromtimestamp(os.path.getmtime(backup_path))
        
        print(f"{i}. {backup}")
        print(f"   Created: {mtime.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"   Size: {size:.2f} KB")
        print("")
    
    return backups


def restore_database(backup_path):
    """Restore database from backup"""
    
    print("=" * 80)
    print("Restore Database")
    print("=" * 80)
    print("")
    
    if not os.path.exists(backup_path):
        print(f"❌ Backup not found: {backup_path}")
        return False
    
    if os.path.exists(DB_PATH):
        print(f"⚠️  Current database will be replaced!")
        confirm = input("Continue? (yes/no): ").strip().lower()
        if confirm != 'yes':
            print("Cancelled.")
            return False
        
        safety_backup = f"{DB_PATH}.before_restore_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        shutil.copy(DB_PATH, safety_backup)
        print(f"✅ Safety backup created: {safety_backup}\n")
    
    try:
        print(f"📥 Restoring from: {backup_path}")
        shutil.copy(backup_path, DB_PATH)
        
        print(f"✅ Database restored successfully!")
        print(f"   Location: {DB_PATH}")
        print(f"   Size: {os.path.getsize(DB_PATH) / 1024:.2f} KB")
        
        stats = get_database_stats(DB_PATH)
        print(f"\n📊 Restored database contains:")
        for table, count in stats.items():
            print(f"   • {table}: {count} rows")
        
        return True
        
    except Exception as e:
        print(f"❌ Restore failed: {e}")
        return False


def get_database_stats(db_path):
    """Get row counts from database"""
    stats = {}
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        tables = cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        ).fetchall()
        
        for table in tables:
            table_name = table[0]
            count = cursor.execute(f"SELECT COUNT(*) FROM {table_name}").fetchone()[0]
            stats[table_name] = count
        
        conn.close()
        
    except Exception as e:
        print(f"Error getting stats: {e}")
    
    return stats


def export_to_json():
    """Export database to JSON format"""
    
    print("=" * 80)
    print("Export Database to JSON")
    print("=" * 80)
    print("")
    
    output_dir = "exports"
    os.makedirs(output_dir, exist_ok=True)
    
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        tables = cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        ).fetchall()
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        for table in tables:
            table_name = table[0]
            
            rows = cursor.execute(f"SELECT * FROM {table_name}").fetchall()
            
            data = [dict(row) for row in rows]
            
            output_file = os.path.join(output_dir, f"{table_name}_{timestamp}.json")
            
            with open(output_file, 'w') as f:
                json.dump(data, f, indent=2, default=str)
            
            print(f"✅ Exported {table_name}: {len(data)} rows → {output_file}")
        
        conn.close()
        
        print(f"\n📁 All data exported to: {output_dir}/")
        
    except Exception as e:
        print(f"❌ Export failed: {e}")


def main():
    print("=" * 80)
    print("SharedLM SQLite Backup Utility")
    print("=" * 80)
    print(f"Database: {backend_dir}/{DB_PATH}")
    print("")
    print("1. Create Backup")
    print("2. List Backups")
    print("3. Restore from Backup")
    print("4. Export to JSON")
    print("")
    
    choice = input("Enter choice (1-4): ").strip()
    
    if choice == '1':
        backup_path = backup_database()
        if backup_path:
            print(f"\n🎉 Backup saved: {backup_path}")
    
    elif choice == '2':
        backups = list_backups()
        if backups:
            print(f"Total: {len(backups)} backup(s)")
    
    elif choice == '3':
        backups = list_backups()
        if not backups:
            return
        
        idx = input(f"\nEnter backup number to restore (1-{len(backups)}): ").strip()
        try:
            idx = int(idx) - 1
            if 0 <= idx < len(backups):
                backup_path = os.path.join(BACKUP_DIR, backups[idx])
                restore_database(backup_path)
            else:
                print("Invalid selection.")
        except ValueError:
            print("Invalid input.")
    
    elif choice == '4':
        export_to_json()
    
    else:
        print("Invalid choice.")


if __name__ == "__main__":
    main()