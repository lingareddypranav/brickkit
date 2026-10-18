"""Main entry point for the Brick Kit FastAPI application."""

import uvicorn
from .api.app import create_app_with_agent


def main():
    """Run the FastAPI application."""
    app = create_app_with_agent()
    
    print("🚀 Starting Brick Kit API server...")
    print("📖 API Documentation: http://localhost:8000/docs")
    print("🌐 WebSocket endpoint: ws://localhost:8000/api/v1/ws/{client_id}")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=False,  # Disable reload to avoid import string requirement
        log_level="info"
    )


if __name__ == "__main__":
    main()
