"""
Shared pytest configuration and fixtures for the AI Smart Traffic test suite.
Each test session uses an isolated in-memory SQLite database so tests cannot
interfere with the development database.
"""
import sys
import asyncio
import tempfile
import os
from pathlib import Path

import pytest
import pytest_asyncio

# Ensure backend root is always on sys.path so 'app' is importable
backend_root = Path(__file__).resolve().parent / "backend"
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

# ─── Isolated test database ───────────────────────────────────────────────────
@pytest.fixture(scope="session", autouse=True)
def isolate_test_database(tmp_path_factory):
    """
    Override DATABASE_URL before any app module imports the engine so all
    tests run against a fresh temporary SQLite file, not the dev database.
    """
    tmp_dir = tmp_path_factory.mktemp("testdb")
    test_db = tmp_dir / "test_traffic.db"
    test_db_url = f"sqlite+aiosqlite:///{test_db.as_posix()}"
    os.environ["DATABASE_URL"] = test_db_url
    yield
    # cleanup happens automatically with tmp_path_factory
