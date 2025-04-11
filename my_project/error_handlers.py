from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from jose.exceptions import JWTError
import logging

# Configure logging
logger = logging.getLogger("error_handlers")

class DatabaseError(Exception):
    def __init__(self, detail: str = "Database error occurred"):
        self.detail = detail
        super().__init__(self.detail)

class NotFoundError(Exception):
    def __init__(self, resource_type: str, resource_id: str = None):
        self.resource_type = resource_type
        self.resource_id = resource_id
        message = f"{resource_type} not found"
        if resource_id:
            message += f" with id {resource_id}"
        self.detail = message
        super().__init__(self.detail)

class AuthorizationError(Exception):
    def __init__(self, detail: str = "Not authorized to perform this action"):
        self.detail = detail
        super().__init__(self.detail)

class BadRequestError(Exception):
    def __init__(self, detail: str = "Bad request"):
        self.detail = detail
        super().__init__(self.detail)

class DuplicateError(Exception):
    def __init__(self, resource_type: str, field: str = None):
        self.resource_type = resource_type
        self.field = field
        message = f"{resource_type} already exists"
        if field:
            message += f" with this {field}"
        self.detail = message
        super().__init__(self.detail)

# Error handler for database errors
async def database_error_handler(request: Request, exc: SQLAlchemyError):
    logger.error(f"Database error: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "A database error occurred. Please try again later."}
    )

# Error handler for integrity errors (unique constraint violations, etc.)
async def integrity_error_handler(request: Request, exc: IntegrityError):
    logger.error(f"Integrity error: {str(exc)}")
    
    # Try to extract useful information from the error message
    error_message = "A data integrity error occurred."
    
    if "Duplicate entry" in str(exc):
        # MySQL specific error message for duplicate entries
        error_message = "A record with the same unique values already exists."
    
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"detail": error_message}
    )

# Error handler for validation errors
async def validation_error_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Validation error: {str(exc)}")
    errors = []
    
    for error in exc.errors():
        error_detail = {
            "loc": error["loc"],
            "msg": error["msg"],
            "type": error["type"]
        }
        errors.append(error_detail)
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": errors}
    )

# Error handler for JWT errors
async def jwt_error_handler(request: Request, exc: JWTError):
    logger.warning(f"JWT error: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={"detail": "Invalid authentication credentials"},
        headers={"WWW-Authenticate": "Bearer"}
    )

# Error handler for not found errors
async def not_found_error_handler(request: Request, exc: NotFoundError):
    logger.info(f"Not found error: {exc.detail}")
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": exc.detail}
    )

# Error handler for authorization errors
async def authorization_error_handler(request: Request, exc: AuthorizationError):
    logger.warning(f"Authorization error: {exc.detail}")
    return JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content={"detail": exc.detail}
    )

# Error handler for bad request errors
async def bad_request_error_handler(request: Request, exc: BadRequestError):
    logger.info(f"Bad request error: {exc.detail}")
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": exc.detail}
    )

# Error handler for duplicate errors
async def duplicate_error_handler(request: Request, exc: DuplicateError):
    logger.info(f"Duplicate error: {exc.detail}")
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"detail": exc.detail}
    )

# Configure exception handlers for FastAPI app
def configure_exception_handlers(app):
    app.add_exception_handler(SQLAlchemyError, database_error_handler)
    app.add_exception_handler(IntegrityError, integrity_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(JWTError, jwt_error_handler)
    app.add_exception_handler(NotFoundError, not_found_error_handler)
    app.add_exception_handler(AuthorizationError, authorization_error_handler)
    app.add_exception_handler(BadRequestError, bad_request_error_handler)
    app.add_exception_handler(DuplicateError, duplicate_error_handler)