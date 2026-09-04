from fastapi import Request, HTTPException
from collections import defaultdict
import time

class RateLimiter:
    def __init__(self, max_requests=20, window_seconds=60):
        self.max_requests = max_requests
        self.window = window_seconds
        self.requests = defaultdict(list)
    
    async def __call__(self, request: Request, call_next):
        # Get real IP from proxy (Railway sends X-Forwarded-For)
        forwarded = request.headers.get("X-Forwarded-For")
        client_ip = forwarded.split(",")[0].strip() if forwarded else request.client.host
        
        now = time.time()
        window_start = now - self.window
        
        # Clean old requests
        self.requests[client_ip] = [
            t for t in self.requests[client_ip] if t > window_start
        ]
        
        if len(self.requests[client_ip]) >= self.max_requests:
            raise HTTPException(status_code=429, detail="Too many requests")
        
        self.requests[client_ip].append(now)
        response = await call_next(request)
        return response

# Create instance with desired limits
rate_limiter = RateLimiter(max_requests=30, window_seconds=60)


class EndpointRateLimiter:
    """Per-IP, per-endpoint rate limit usable as a FastAPI dependency:

        _: None = Depends(register_limiter)

    Sliding window, in-memory (per process). Protects auth endpoints from
    signup/login floods and brute-force so Railway isn't overwhelmed. Resets on
    redeploy; for a single-instance deployment that's sufficient.
    """
    def __init__(self, max_requests: int, window_seconds: int, name: str = ""):
        self.max = max_requests
        self.window = window_seconds
        self.name = name
        self.hits = defaultdict(list)

    def _ip(self, request: Request) -> str:
        fwd = request.headers.get("X-Forwarded-For")
        if fwd:
            return fwd.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    async def __call__(self, request: Request):
        ip = self._ip(request)
        now = time.time()
        start = now - self.window
        self.hits[ip] = [t for t in self.hits[ip] if t > start]
        if len(self.hits[ip]) >= self.max:
            retry = int(self.window - (now - self.hits[ip][0])) if self.hits[ip] else self.window
            retry = max(1, retry)
            raise HTTPException(
                status_code=429,
                detail=f"Too many attempts. Please wait {retry} seconds and try again.",
                headers={"Retry-After": str(retry)},
            )
        self.hits[ip].append(now)

    # Occasionally drop empty IP buckets so the dict can't grow unbounded.
    def _gc(self):
        now = time.time()
        for ip in list(self.hits.keys()):
            self.hits[ip] = [t for t in self.hits[ip] if t > now - self.window]
            if not self.hits[ip]:
                del self.hits[ip]


# Auth limits — tuned to stop abuse without blocking real users.
register_limiter = EndpointRateLimiter(max_requests=5, window_seconds=3600, name="register")   # 5 signups / hour / IP
login_limiter = EndpointRateLimiter(max_requests=10, window_seconds=300, name="login")          # 10 logins / 5 min / IP