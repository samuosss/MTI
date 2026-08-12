from slowapi import Limiter
from slowapi.util import get_remote_address

# Shared limiter instance — import this in routers instead of creating a new one,
# so every rate-limited endpoint shares the same backend state (in-memory by default).
limiter = Limiter(key_func=get_remote_address)  