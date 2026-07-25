"""
app/errors.py

Application-wide exception handlers, split out of main.py (Phase 7, pure
refactor). Call register_exception_handlers(app) during assembly.
"""
import os

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.responses import JSONResponse


def register_exception_handlers(app):
    # 1. Handle HTTP exceptions (400, 401, 403, 404, 500 etc.)
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": True,
                "type": "http_error",
                "message": str(exc.detail),
                "status_code": exc.status_code,
            },
        )

    # 2. Handle validation errors (422 – missing fields, bad types)
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        errors = []
        for error in exc.errors():
            errors.append({
                "field": " -> ".join(str(loc) for loc in error["loc"]),
                "message": error["msg"],
                "type": error["type"],
            })
        return JSONResponse(
            status_code=422,
            content={
                "error": True,
                "type": "validation_error",
                "message": "Validation error",
                "detail": {"errors": errors[:5]},
            },
        )

    # 3. Catch ALL unhandled exceptions (500 – internal server errors)
    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        import traceback
        traceback.print_exc()
        is_production = os.getenv("ENVIRONMENT") == "production"
        return JSONResponse(
            status_code=500,
            content={
                "error": True,
                "type": "internal_error",
                "message": "An internal error occurred" if is_production else str(exc),
                "status_code": 500,
            },
        )
