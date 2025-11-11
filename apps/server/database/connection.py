import os
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./sharedlm.db"
)

if DATABASE_URL.startswith('sqlite'):
    # Optimized SQLite engine with better performance settings
    engine = create_engine(
        DATABASE_URL,
        connect_args={
            'check_same_thread': False,
            'timeout': 20  # Reduced timeout for faster failure detection
        },
        echo=False,
        future=True
    )
    
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        try:
            # Performance optimizations
            cursor.execute("PRAGMA journal_mode=WAL")  # Write-Ahead Logging for better concurrency
            cursor.execute("PRAGMA synchronous=NORMAL")  # Balance between safety and speed
            cursor.execute("PRAGMA cache_size=-128000")  # Increased cache (128MB) for better performance
            cursor.execute("PRAGMA foreign_keys=ON")  # Maintain data integrity
            cursor.execute("PRAGMA temp_store=MEMORY")  # Store temp tables in memory
            # Memory-mapped I/O for faster reads (if supported)
            try:
                cursor.execute("PRAGMA mmap_size=268435456")  # 256MB memory-mapped I/O
            except:
                pass  # Not all SQLite versions support this
            # Thread-safe mode for better concurrency
            cursor.execute("PRAGMA threads=4")  # Use multiple threads if available
        except Exception:
            pass  # Ignore errors for pragmas that may not be supported
        finally:
            cursor.close()
else:
    # Optimized PostgreSQL/MySQL connection pool
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,  # Verify connections before using
        pool_recycle=3600,  # Recycle connections after 1 hour
        pool_size=20,  # Increased pool size for better concurrency
        max_overflow=30,  # Allow more overflow connections
        pool_timeout=10,  # Timeout for getting connection from pool
        echo=False,
        future=True
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()