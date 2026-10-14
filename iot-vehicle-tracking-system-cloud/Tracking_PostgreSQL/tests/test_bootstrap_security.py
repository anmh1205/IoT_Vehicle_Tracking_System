from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def test_fresh_db_does_not_embed_predictable_admin_secret():
    user_seed = (ROOT / "init/01-users.sql").read_text(encoding="utf-8")
    assert "Admin@2026" not in user_seed
    assert "INSERT INTO users (username, password_hash" not in user_seed

def test_first_admin_requires_unique_password_and_salted_hash():
    bootstrap = (ROOT / "init/01a-bootstrap-admin.sh").read_text(encoding="utf-8")
    extensions = (ROOT / "init/00-extensions.sql").read_text(encoding="utf-8")
    assert 'POSTGRES_BOOTSTRAP_ADMIN_PASSWORD' in bootstrap
    assert '${#secret}' in bootstrap
    assert 'CHANGE_ME_INITIAL_ADMIN_PASSWORD' in bootstrap
    assert "crypt(:'initial_admin_password', gen_salt('bf', 12))" in bootstrap
    assert "CREATE EXTENSION IF NOT EXISTS pgcrypto;" in extensions

def test_postgres_defaults_to_loopback_with_explicit_opt_in_override():
    compose = (ROOT / "docker-compose.yml").read_text(encoding="utf-8")
    assert "${POSTGRES_BIND_ADDRESS:-127.0.0.1}:5432:5432" in compose
    assert '0.0.0.0:5432:5432' not in compose
    assert "${POSTGRES_BOOTSTRAP_ADMIN_PASSWORD:?" in compose
