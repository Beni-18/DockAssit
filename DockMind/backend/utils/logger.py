"""
Structured application logger.

Configures a consistent log format for the entire application.
Import and use `logger` from this module in every service or utility.
"""

import logging
import sys

# Configure structured logging for the entire application
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
    ],
)

# Application logger — use this everywhere:
# from utils.logger import logger
logger = logging.getLogger("dockmind")
