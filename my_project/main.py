from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import time
import uvicorn

# Import configuration
from config import get_settings

# Import database connection
from db_connection import init_db

# Import error handlers
from error_handlers import configure_exception_handlers

# Import route modules
from routes_auth import router as auth_router
from routes_users import router as users_router
from routes_visitors import router as visitors_router
from routes_badges import router as badges_router
from routes_photos import router as photos_router
from routes_stats import router as stats_router

# Get settings
settings = get_settings()

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("main")

# Create FastAPI application
app = FastAPI(
    title="Visitor Management System",
    description="A complete system for managing visitors in a facility",
    version="1.0.0",
    docs_url=f"{settings.API_PREFIX}/docs",
    redoc_url=f"{settings.API_PREFIX}/redoc",
    openapi_url=f"{settings.API_PREFIX}/openapi.json"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure error handlers
configure_exception_handlers(app)

# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

# Include all routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(visitors_router)
app.include_router(badges_router)
app.include_router(photos_router)
app.include_router(stats_router)

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Welcome to the Visitor Management System API"}

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "api": "Visitor Management System"}

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    logger.info("Starting Visitor Management System...")
    
    try:
        # Initialize database
        init_db()
        logger.info("Database initialized successfully")
        
        # Create initial admin user if needed
        from auth import get_password_hash
        from db_connection import get_db
        from db_models import User
        
        db = next(get_db())
        
        # Check if admin user exists
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            # Create admin user
            admin_user = User(
                username="admin",
                email="admin@example.com",
                full_name="Admin User",
                department="IT",
                hashed_password=get_password_hash("Admin123!"),
                is_admin=True
            )
            db.add(admin_user)
            db.commit()
            logger.info("Created default admin user")
        
        db.close()
        
        logger.info("Visitor Management System started successfully")
    except Exception as e:
        logger.error(f"Error during startup: {str(e)}")
        raise

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down Visitor Management System...")

# Run the application
if __name__ == "__main__":
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=settings.DEBUG,
        log_level="info" if not settings.DEBUG else "debug"
    )