"""Run the real account API against an isolated local SQLite database.

Default: deterministic offline responses for frontend interaction development.
--live: explicitly load the backend's existing model configuration and credentials.
No Azure application or production database settings are changed.
"""
from __future__ import annotations

import argparse
import base64
import os
from pathlib import Path
import sys
from urllib.parse import urlsplit

from dotenv import dotenv_values


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--backend-root', type=Path)
    parser.add_argument('--port', type=int, default=8000)
    parser.add_argument('--live', action='store_true')
    args = parser.parse_args()
    frontend = Path(__file__).resolve().parents[1]
    backend = (args.backend_root or frontend.parent / 'xiaoan').resolve()
    account = backend / 'tech/login'
    chatflow = backend / 'tech/chatflow/poc'
    if not (account / 'account_server.py').is_file():
        raise SystemExit('Backend source not found; pass --backend-root /path/to/xiaoan.')
    config = dotenv_values(frontend / '.env.local')
    public = config.get('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY') or ''
    secret = config.get('CLERK_SECRET_KEY') or ''
    if not public.startswith('pk_test_') or not secret.startswith('sk_test_'):
        raise SystemExit('Local development requires matching Clerk test keys in frontend/.env.local.')
    try:
        encoded = public.removeprefix('pk_test_')
        host = base64.b64decode(encoded + '=' * (-len(encoded) % 4), validate=True).decode().removesuffix('$')
        if not host.endswith('.clerk.accounts.dev') or urlsplit('https://' + host).hostname != host:
            raise ValueError('invalid issuer')
    except (ValueError, UnicodeError):
        raise SystemExit('Invalid Clerk development publishable key.') from None
    origin = config.get('FRONTEND_ORIGIN') or 'http://localhost:3000'
    if origin != 'http://localhost:3000':
        raise SystemExit('Expected FRONTEND_ORIGIN=http://localhost:3000 for this local launcher.')
    if not 1024 <= args.port <= 65535:
        raise SystemExit('Choose a non-privileged TCP port.')

    # Never inherit a production database, vault, backup worker or provider credentials.
    prefixes = ('XIAOAN_', 'CLERK_', 'OPENAI_', 'GEMINI_', 'AZURE_')
    for name in list(os.environ):
        if name.startswith(prefixes):
            del os.environ[name]
    if args.live:
        model_config = dotenv_values(chatflow / '.env')
        for name, value in model_config.items():
            if value and (name.startswith(('OPENAI_', 'GEMINI_')) or
                          name.startswith(('XIAOAN_RESPONSE_', 'XIAOAN_ROUTER_', 'XIAOAN_GROUND_', 'XIAOAN_SAFETY_', 'XIAOAN_OUTPUT_GUARD_')) or
                          name in {'XIAOAN_CONFIG_PATH', 'XIAOAN_LLM_PROVIDER'}):
                os.environ[name] = value
        if not os.environ.get('XIAOAN_RESPONSE_API_KEY'):
            raise SystemExit('Live mode requires XIAOAN_RESPONSE_API_KEY in the backend local .env; current response key is empty. Offline mode remains available.')
    data = frontend / '.local-backend'
    data.mkdir(mode=0o700, exist_ok=True)
    os.environ.update(
        CLERK_SECRET_KEY=secret,
        CLERK_ISSUER='https://' + host,
        CLERK_AUTHORIZED_PARTIES=origin,
        XIAOAN_DATABASE_URL='sqlite:///' + str(data / 'accounts.db'),
        XIAOAN_COOKIE_SECURE='0',
        XIAOAN_OFFLINE='0' if args.live else '1',
        XIAOAN_ENABLE_DEBUG='0',
    )
    sys.path[:0] = [str(account), str(chatflow)]
    import uvicorn
    mode = 'LIVE MODEL CALLS' if args.live else 'OFFLINE DEVELOPMENT RESPONSES (not production AI)'
    print(f'Local account API: http://127.0.0.1:{args.port}; {mode}', flush=True)
    uvicorn.run('account_server:create_account_app', factory=True, host='127.0.0.1', port=args.port)


if __name__ == '__main__':
    main()
