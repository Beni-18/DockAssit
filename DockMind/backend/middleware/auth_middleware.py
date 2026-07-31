from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from config.security import decode_access_token

# Routes that don't need authentication
PUBLIC_ROUTES = [
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/api/v1/auth/google",
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
]


class AuthMiddleware(BaseHTTPMiddleware):
    """
    Validates JWT token on protected routes before they reach the endpoint.
    Note: For most cases, use the get_current_user_id dependency directly.
    This middleware is an additional layer for early rejection.
    """

    async def dispatch(self, request: Request, call_next):
        if any(request.url.path.startswith(route) for route in PUBLIC_ROUTES):
            return await call_next(request)

        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing authorization token")

        token = auth_header.split(" ")[1]
        try:
            payload = decode_access_token(token)
            request.state.user_id = payload.get("sub")
        except HTTPException:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        return await call_next(request)
