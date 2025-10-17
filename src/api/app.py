"""FastAPI application for Brick Kit."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse

from .routes import router, set_agent
from ..agent import LegoModelRetrievalAgent
from ..config import Config


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    
    app = FastAPI(
        title="Brick Kit API",
        description="AI-powered LEGO build agent using Pydantic AI",
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc"
    )
    
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Configure this properly for production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Include API routes
    app.include_router(router, prefix="/api/v1")
    
    # Serve static files (for future frontend) - only if directory exists
    from pathlib import Path
    static_dir = Path("static")
    if static_dir.exists():
        app.mount("/static", StaticFiles(directory="static"), name="static")
    
    @app.get("/", response_class=HTMLResponse)
    async def root():
        """Root endpoint with basic info."""
        return """
        <html>
            <head>
                <title>Brick Kit API</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; }
                    .container { max-width: 800px; margin: 0 auto; }
                    .endpoint { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }
                    .method { font-weight: bold; color: #007bff; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🧱 Brick Kit API</h1>
                    <p>AI-powered LEGO build agent using Pydantic AI</p>
                    
                    <h2>Available Endpoints</h2>
                    
                    <div class="endpoint">
                        <span class="method">GET</span> <code>/api/v1/health</code>
                        <p>Health check endpoint</p>
                    </div>
                    
                    <div class="endpoint">
                        <span class="method">POST</span> <code>/api/v1/analyze-prompt</code>
                        <p>Analyze a user prompt to extract structured information</p>
                    </div>
                    
                    <div class="endpoint">
                        <span class="method">POST</span> <code>/api/v1/retrieve-model</code>
                        <p>Retrieve a LEGO model based on user prompt</p>
                    </div>
                    
                    <div class="endpoint">
                        <span class="method">GET</span> <code>/api/v1/download/{file_hash}</code>
                        <p>Download a cached model file</p>
                    </div>
                    
                    <div class="endpoint">
                        <span class="method">WebSocket</span> <code>/api/v1/ws/{client_id}</code>
                        <p>Real-time updates for model retrieval</p>
                    </div>
                    
                    <h2>Documentation</h2>
                    <p>
                        <a href="/docs">Interactive API Documentation (Swagger UI)</a><br>
                        <a href="/redoc">Alternative API Documentation (ReDoc)</a>
                    </p>
                </div>
            </body>
        </html>
        """
    
    return app


async def initialize_agent(app: FastAPI):
    """Initialize the agent and set it in the routes."""
    try:
        config = Config.from_env()
        agent = LegoModelRetrievalAgent(config)
        set_agent(agent)
        print("✅ Agent initialized successfully")
    except Exception as e:
        print(f"❌ Failed to initialize agent: {e}")
        raise


def create_app_with_agent() -> FastAPI:
    """Create app and initialize agent."""
    app = create_app()
    
    @app.on_event("startup")
    async def startup_event():
        await initialize_agent(app)
    
    return app
