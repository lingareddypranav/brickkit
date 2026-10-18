"""Test script for the Brick Kit agent and API."""

import asyncio
import os
import requests
import json
from pathlib import Path
from dotenv import load_dotenv

from src.agent import LegoModelRetrievalAgent
from src.config import Config

# Load environment variables from .env file
load_dotenv()


async def test_agent():
    """Test the LEGO model retrieval agent directly."""
    
    # Check if we have an API key
    if not os.getenv("ANTHROPIC_API_KEY") and not os.getenv("OPENAI_API_KEY"):
        print("❌ No API key found in environment variables.")
        print("Please set your ANTHROPIC_API_KEY or OPENAI_API_KEY in a .env file.")
        return
    
    try:
        # Load configuration
        config = Config.from_env()
        print(f"✅ Configuration loaded successfully")
        print(f"   Model: {config.default_model}")
        
        # Create agent
        agent = LegoModelRetrievalAgent(config)
        print(f"✅ Agent created successfully")
        
        # Test prompt analysis
        test_prompt = "small red car"
        print(f"\n🔍 Testing prompt analysis for: '{test_prompt}'")
        
        analysis = await agent.omr_service.analyze_prompt(test_prompt)
        print(f"   Theme: {analysis.theme}")
        print(f"   Colors: {analysis.colors}")
        print(f"   Constraints: {analysis.constraints}")
        print(f"   Keywords: {analysis.keywords}")
        
        # Test OMR search (this will make actual HTTP requests)
        print(f"\n🌐 Testing OMR search...")
        search_results = await agent.omr_service.search_omr(analysis)
        
        if search_results:
            print(f"   Found {len(search_results)} results:")
            for i, result in enumerate(search_results[:3]):  # Show top 3
                print(f"   {i+1}. {result.name} ({result.set_number}) - Score: {result.relevance_score:.2f}")
        else:
            print("   No search results found")
        
        print(f"\n✅ Basic functionality test completed!")
        print(f"   The agent is ready to use. Try running:")
        print(f"   CLI: python -m src.cli '{test_prompt}'")
        print(f"   API: python -m src.main (then visit http://localhost:8000/docs)")
        
    except Exception as e:
        print(f"❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()


def test_api():
    """Test the FastAPI endpoints."""
    base_url = "http://localhost:8000/api/v1"
    
    print("\n🌐 Testing API endpoints...")
    
    try:
        # Test health endpoint
        response = requests.get(f"{base_url}/health")
        if response.status_code == 200:
            print("✅ Health endpoint working")
        else:
            print(f"❌ Health endpoint failed: {response.status_code}")
            return
        
        # Test prompt analysis endpoint
        analysis_data = {"prompt": "small red car"}
        response = requests.post(f"{base_url}/analyze-prompt", json=analysis_data)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Prompt analysis working: {result['theme']}")
        else:
            print(f"❌ Prompt analysis failed: {response.status_code}")
        
        # Test model retrieval endpoint
        retrieval_data = {"prompt": "small red car", "max_results": 5}
        response = requests.post(f"{base_url}/retrieve-model", json=retrieval_data)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Model retrieval working: {result['success']}")
            if result['search_results']:
                print(f"   Found {len(result['search_results'])} results")
        else:
            print(f"❌ Model retrieval failed: {response.status_code}")
            print(f"   Response: {response.text}")
        
    except requests.exceptions.ConnectionError:
        print("❌ API server not running. Start it with: python -m src.main")
    except Exception as e:
        print(f"❌ API test error: {e}")


async def main():
    """Run all tests."""
    print("🧱 Brick Kit Test Suite")
    print("=" * 50)
    
    # Test agent directly
    await test_agent()
    
    # Test API endpoints
    test_api()
    
    print("\n" + "=" * 50)
    print("🎯 Next steps:")
    print("1. Set up your .env file with API keys")
    print("2. Run CLI: python -m src.cli 'small red car'")
    print("3. Run API: python -m src.main")
    print("4. Visit: http://localhost:8000/docs")


if __name__ == "__main__":
    asyncio.run(main())
