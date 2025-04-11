from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import get_settings
from sqlalchemy.exc import SQLAlchemyError
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("database")

# Get database URL from settings
settings = get_settings()
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

try:
    # Create SQLAlchemy engine with MySQL-specific configurations
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        echo=settings.DEBUG,  # Log SQL queries in debug mode
        pool_pre_ping=True,  # Verify connection before using from pool
        pool_recycle=3600,  # Recycle connections after an hour
        pool_size=10,  # Connection pool size
        max_overflow=20,  # Maximum number of connections to allow in addition to pool_size
        connect_args={
            "connect_timeout": 30,  # 30 seconds timeout
            "charset": "utf8mb4"  # Support all Unicode characters
        }
    )
    logger.info(f"Database engine created for {SQLALCHEMY_DATABASE_URL.split('@')[1]}")
    
    # Create session factory
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Base class for models
    Base = declarative_base()
    
    # Initialize the database
    def init_db():
        try:
            # Import models here to avoid circular imports
            from db_models import User, Visitor, VisitorPhoto, Badge, SystemLog
            
            # Create tables
            Base.metadata.create_all(bind=engine)
            logger.info("Database tables created successfully")
        except SQLAlchemyError as e:
            logger.error(f"Error initializing database: {str(e)}")
            raise
    
    # Database dependency for FastAPI
    def get_db():
        db = SessionLocal()
        try:
            yield db
        except SQLAlchemyError as e:
            logger.error(f"Database session error: {str(e)}")
            db.rollback()
            raise
        finally:
            db.close()
            
except SQLAlchemyError as e:
    logger.error(f"Database connection error: {str(e)}")
    raise