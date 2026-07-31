#!/bin/sh
# Container entrypoint: ensure tables exist, then start the API server.
#
# No Alembic migrations exist yet in this project, so this uses the same
# metadata-driven bootstrap as local development. Replace with
# `alembic upgrade head` once real migrations are introduced.
set -e

python -c "
from database.base import Base
from database.database import engine
from models import command_history, execution_log, saved_prompt, user  # noqa: F401 (register models)

Base.metadata.create_all(bind=engine)
print('Database tables ready.')
"

exec uvicorn app:app --host 0.0.0.0 --port 8000
