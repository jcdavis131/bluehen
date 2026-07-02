"""RFC 9457 problem+json error responses."""

from __future__ import annotations

from fastapi import HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


def problem(
    *,
    status: int,
    title: str,
    detail: str,
    type_uri: str = "about:blank",
) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={"type": type_uri, "title": title, "status": status, "detail": detail},
        media_type="application/problem+json",
    )


async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    return problem(
        status=exc.status_code,
        title="Request failed",
        detail=str(exc.detail),
    )


async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    return problem(status=422, title="Validation error", detail=str(exc.errors()))
