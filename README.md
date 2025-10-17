# Brick Kit - AI-Powered LEGO Build Generator

Brick Kit is an intelligent web application that generates custom LEGO builds and instructions based on your natural language descriptions. Using advanced AI and the Official LEGO Model Repository (OMR), it creates personalized building experiences with step-by-step instructions.

## Features

- **AI-Powered Build Generation**: Creates custom LEGO builds from natural language prompts
- **Hybrid Search Intelligence**: Combines direct keyword matching with semantic AI analysis for optimal results
- **Smart Model Selection**: Uses LLM to intelligently select the best matching models from search results
- **Interactive Web Interface**: Modern React frontend with real-time 3D model viewing
- **Step-by-Step Instructions**: Generates high-quality PNG images for each build step
- **Bill of Materials**: Creates detailed parts lists with quantities and part numbers
- **PDF Instructions**: Generates printable instruction manuals
- **3D Model Viewer**: Interactive LDraw model viewer in the browser
- **Real-time Updates**: Live progress tracking during build generation
- **Intelligent Caching**: Smart caching system for fast repeated builds

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd brick-kit
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Install Playwright browsers (for JavaScript downloads):
```bash
playwright install chromium
```

4. Install LeoCAD (for instruction generation):
```bash
# On macOS
brew install leocad

# On other systems, download from https://github.com/leozide/leocad/releases
```

5. Install LDraw library:
```bash
# Download from https://www.ldraw.org/
# Extract to a directory like /usr/local/share/LDraw or ~/LDraw
# Set LDRAW_PATH environment variable if needed
```

6. Set up environment variables:
```bash
cp env.example .env
# Edit .env with your API keys
```

## Configuration

Create a `.env` file with the following variables:

```env
# Required
OPENAI_API_KEY=your_openai_api_key_here

# Optional
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GOOGLE_API_KEY=your_google_api_key_here

# LeoCAD Configuration (optional)
LDRAW_PATH=/path/to/ldraw/library
LEOCAD_TIMEOUT=60

# Cache settings
CACHE_DIR=~/.prompt2lego/omr_cache
MAX_CACHE_SIZE_MB=1000

# Model settings
DEFAULT_MODEL=openai:gpt-4o
TEMPERATURE=0.1
MAX_TOKENS=2000
```

## Usage

### Web Application (Recommended)

1. **Start the backend server**:
```bash
python -m src.main
```

2. **Start the frontend** (in a separate terminal):
```bash
cd brick-linkfrontend
npm run dev
```

3. **Open your browser** and visit:
   - Frontend: http://localhost:3000
   - API Documentation: http://localhost:8000/docs

4. **Generate LEGO builds**:
   - Enter natural language descriptions like "a big tree", "red race car", or "spaceship"
   - Watch as the AI analyzes your prompt and generates custom builds
   - View the 3D model in real-time
   - Download step-by-step instructions and parts lists

### API Usage

```bash
# Generate a complete LEGO build with instructions
curl -X POST "http://localhost:8000/api/v1/retrieve-model-with-instructions" \
     -H "Content-Type: application/json" \
     -d '{"prompt": "a big tree"}'

# Just find and download a model
curl -X POST "http://localhost:8000/api/v1/retrieve-model" \
     -H "Content-Type: application/json" \
     -d '{"prompt": "red race car"}'
```

### WebSocket (Real-time Updates)

```javascript
const ws = new WebSocket('ws://localhost:8000/api/v1/ws/client123');

ws.onmessage = function(event) {
    const message = JSON.parse(event.data);
    console.log('Received:', message);
};

// Send a retrieval request
ws.send(JSON.stringify({
    type: 'retrieve_model',
    prompt: 'small red car'
}));
```

### Command Line Interface

```bash
# Part 1: Search for a LEGO model only
python -m src.cli "small red car"
python -m src.cli "yellow spaceship"
python -m src.cli "large castle with towers"

# Part 1 + Part 2: Search and generate instructions
python -m src.cli "small red car" --instructions
python -m src.cli "yellow spaceship" --instructions
python -m src.cli "large castle with towers" --instructions

# Test LeoCAD integration
python test_leocad_integration.py
```

### Python API (Direct)

```python
from src.config import Config
from src.agent import LegoModelRetrievalAgent

# Load configuration
config = Config.from_env()

# Create agent
agent = LegoModelRetrievalAgent(config)

# Retrieve a model
result = await agent.retrieve_model("small red car")

if result.success:
    print(f"Found model: {result.cached_model.set_name}")
    print(f"File: {result.cached_model.file_path}")
else:
    print(f"Error: {result.error_message}")
```

## How It Works

### AI-Powered Build Generation Process

1. **Intelligent Prompt Analysis**: The AI agent analyzes your natural language description using advanced semantic understanding:
   - Extracts core themes and concepts (car, spaceship, building, etc.)
   - Identifies colors, size constraints, and style preferences
   - Generates related concepts and search hints for better matching
   - Determines prompt complexity to choose optimal search strategy

2. **Hybrid Search Strategy**: Combines multiple search approaches for comprehensive results:
   - **Direct Search**: For simple prompts, uses exact keyword matching
   - **Semantic Search**: For complex prompts, uses AI-enhanced concept expansion
   - **Progressive Refinement**: Tries multiple search strategies and selects the best results

3. **Smart Model Selection**: Uses Large Language Model (LLM) intelligence to:
   - Analyze all search results and their relevance to your prompt
   - Select the most appropriate model from multiple options
   - Ensure the chosen model best matches your original request

4. **Instruction Generation**: Creates comprehensive building instructions:
   - Analyzes the selected model structure and complexity
   - Generates step-by-step build sequences
   - Creates high-quality instruction images for each step
   - Produces detailed Bill of Materials with part quantities

5. **Interactive Delivery**: Provides an engaging building experience:
   - Real-time 3D model viewer in the browser
   - Downloadable PDF instruction manuals
   - Interactive step-by-step guidance
   - Parts list for easy shopping

## Output Structure

When you run the complete process (Part 1 + Part 2), the following files are generated:

```
omr_output/
├── model.mpd                    # Downloaded LEGO model file
└── instructions/
    ├── steps/
    │   ├── step_001.png         # Step 1 instruction image
    │   ├── step_002.png         # Step 2 instruction image
    │   └── ...                  # Additional step images
    ├── bom.csv                  # Bill of Materials (parts list)
    └── html/                    # Optional HTML export
        ├── index.html           # Model viewer
        └── ...                  # Additional HTML files
```

### File Descriptions

- **model.mpd**: The downloaded LEGO model file in LDraw format
- **step_*.png**: High-quality instruction images showing each build step
- **bom.csv**: Complete parts list with quantities and part numbers
- **html/**: Optional HTML package with interactive model viewer

## Project Structure

```
brick-kit/
├── src/
│   ├── __init__.py
│   ├── agent.py          # Main Pydantic AI agent
│   ├── cli.py            # CLI interface
│   ├── config.py         # Configuration management
│   ├── leocad_service.py # LeoCAD integration service
│   ├── main.py           # FastAPI server entry point
│   ├── models.py         # Pydantic data models
│   ├── omr_search.py     # OMR search and download logic
│   └── api/
│       ├── __init__.py
│       ├── app.py        # FastAPI application
│       ├── models.py     # API request/response models
│       └── routes.py     # API routes and WebSocket handling
├── requirements.txt      # Python dependencies
├── pyproject.toml        # Project configuration
├── setup.py             # Package setup
├── env.example          # Environment variables template
├── test_agent.py        # Test suite
├── test_leocad_integration.py  # LeoCAD integration test
└── README.md            # This file
```

## Dependencies

### Python Packages
- **fastapi**: Modern web framework for building APIs
- **uvicorn**: ASGI server for running FastAPI
- **pydantic-ai**: AI agent framework
- **requests/beautifulsoup4**: Web scraping for OMR search
- **playwright**: JavaScript download handling
- **aiohttp/aiofiles**: Async HTTP and file operations
- **python-dotenv**: Environment variable management
- **websockets**: WebSocket support for real-time updates

### External Tools
- **LeoCAD**: LEGO CAD software for instruction generation
- **LDraw**: LEGO parts library for LeoCAD

## Technology Stack

### Backend
- **FastAPI**: Modern Python web framework for high-performance APIs
- **Pydantic AI**: Advanced AI agent framework for intelligent prompt processing
- **Anthropic Claude**: Large Language Model for semantic analysis and model selection
- **Playwright**: Web automation for OMR data retrieval
- **LeoCAD Integration**: LEGO CAD software for instruction generation

### Frontend
- **Next.js**: React framework for modern web applications
- **Three.js**: 3D graphics library for interactive model viewing
- **LDraw Loader**: Specialized loader for LEGO model files
- **Tailwind CSS**: Utility-first CSS framework for responsive design

### AI & Intelligence
- **Hybrid Search System**: Combines direct keyword matching with semantic AI analysis
- **Smart Model Selection**: LLM-powered selection from multiple search results
- **Progressive Search Strategies**: Multiple fallback approaches for optimal results
- **Semantic Prompt Analysis**: Advanced understanding of user intent and context

## Future Enhancements

- **Custom Build Generation**: AI-powered creation of entirely new LEGO designs
- **Difficulty Assessment**: Automatic analysis of build complexity and skill requirements
- **Part Availability Integration**: Real-time checking of part availability and alternatives
- **Social Features**: Sharing builds and collaborating on designs
- **Mobile App**: Native mobile application for on-the-go building
- **AR Integration**: Augmented reality building assistance

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

[Add your license here]
