"""
Rate limiting.

A single shared ``Limiter`` instance, keyed by client IP, used to throttle
brute-force-able endpoints (login, registration). Kept in its own module
(rather than inside ``app.py``) so route modules can import it without a
circular import.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
