#!/usr/bin/env python3
"""Entry point for the CorridorKey HTTP server.

Usage:
    python -m server.run [--host HOST] [--port PORT] [--device DEVICE] [--preview-size SIZE]

Or via the installed console script:
    corridorkey-server [--host HOST] [--port PORT] [--device DEVICE]
"""

from __future__ import annotations

import argparse
import logging
import sys


def main():
    parser = argparse.ArgumentParser(description="CorridorKey HTTP Server")
    parser.add_argument("--host", default="127.0.0.1", help="Bind address (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8741, help="Port (default: 8741)")
    parser.add_argument("--device", default=None, help="Compute device: auto, cuda, mps, cpu")
    parser.add_argument("--preview-size", type=int, default=1024, help="Max preview dimension (default: 1024)")
    parser.add_argument("--log-level", default="INFO", choices=["DEBUG", "INFO", "WARNING", "ERROR"])
    args = parser.parse_args()

    logging.basicConfig(
        level=getattr(logging, args.log_level),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    from .config import ServerConfig
    from .app import create_app

    config = ServerConfig(
        host=args.host,
        port=args.port,
        device=args.device,
        preview_size=args.preview_size,
    )

    app = create_app(config)

    import uvicorn

    uvicorn.run(app, host=config.host, port=config.port, log_level=args.log_level.lower())


if __name__ == "__main__":
    main()
