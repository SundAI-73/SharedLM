"""
Database migration script to add project_id column to conversations table
Run this once to update your existing database schema
"""

from database.connection import engine
from sqlalchemy import inspect, text

def check_and_migrate():
    """Check if project_id column exists and add if missing"""
    
    # Check current schema
    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns('conversations')]
    
    print("=" * 50)
    print("DATABASE MIGRATION CHECK")
    print("=" * 50)
    print(f"\nCurrent 'conversations' table columns:")
    for col in inspector.get_columns('conversations'):
        print(f"  - {col['name']}: {col['type']}")
    
    # Check if project_id exists
    if 'project_id' not in columns:
        print("\n❌ project_id column is MISSING")
        print("Adding project_id column...")
        
        try:
            with engine.connect() as conn:
                # Add the column
                conn.execute(text("""
                    ALTER TABLE conversations 
                    ADD COLUMN project_id INTEGER 
                    REFERENCES projects(id) ON DELETE SET NULL
                """))
                conn.commit()
            
            print("✅ Successfully added project_id column!")
            print("\nUpdated schema:")
            
            # Show updated schema
            inspector = inspect(engine)
            for col in inspector.get_columns('conversations'):
                print(f"  - {col['name']}: {col['type']}")
                
        except Exception as e:
            print(f"\n❌ Migration failed: {e}")
            print("\nTry running this SQL manually in pgAdmin or psql:")
            print("ALTER TABLE conversations ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL;")
    else:
        print("\n✅ project_id column already exists!")
        print("Your database schema is up to date.")
    
    print("\n" + "=" * 50)

if __name__ == "__main__":
    check_and_migrate()