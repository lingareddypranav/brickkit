"""CLI interface for direct agent usage."""

import asyncio
import sys
from pathlib import Path

from .agent import LegoModelRetrievalAgent
from .config import Config


async def main():
    """Main function to run the LEGO model retrieval agent via CLI."""
    if len(sys.argv) < 2:
        print("Usage: python -m src.cli <prompt> [--instructions]")
        print("Example: python -m src.cli 'small red car'")
        print("Example: python -m src.cli 'small red car' --instructions")
        print("\nOr run the FastAPI server:")
        print("python -m src.main")
        sys.exit(1)
    
    # Parse arguments
    args = sys.argv[1:]
    generate_instructions = "--instructions" in args
    if generate_instructions:
        args.remove("--instructions")
    
    user_prompt = " ".join(args)
    
    # Load configuration
    try:
        config = Config.from_env()
    except Exception as e:
        print(f"Error loading configuration: {e}")
        print("Please make sure you have a .env file with your API keys.")
        sys.exit(1)
    
    # Create and run the agent
    agent = LegoModelRetrievalAgent(config)
    
    if generate_instructions:
        print(f"Searching for LEGO model and generating instructions: '{user_prompt}'")
        print("This may take several minutes...")
        
        result = await agent.retrieve_model_with_instructions(user_prompt)
        
        print(f"\n{result.summary}")
        
        if result.retrieval_result.success and result.retrieval_result.selected_result:
            print(f"\n📋 Model Details:")
            print(f"Set: {result.retrieval_result.selected_result.name} ({result.retrieval_result.selected_result.set_number})")
            print(f"Theme: {result.retrieval_result.selected_result.theme}")
            print(f"Year: {result.retrieval_result.selected_result.year}")
            print(f"Downloaded to: {result.retrieval_result.downloaded_file_path}")
        
        if result.instruction_result and result.instruction_result.success:
            print(f"\n📖 Instructions Generated:")
            if result.instruction_result.step_images:
                print(f"Step images: {len(result.instruction_result.step_images)} files")
                print(f"Location: omr_output/instructions/steps/")
            if result.instruction_result.bom_csv:
                print(f"BOM CSV: {result.instruction_result.bom_csv}")
            if result.instruction_result.html_export:
                print(f"HTML export: {result.instruction_result.html_export}")
        elif result.instruction_result:
            print(f"\n❌ Instruction generation failed: {result.instruction_result.error_message}")
    else:
        print(f"Searching for LEGO model: '{user_prompt}'")
        print("This may take a few moments...")
        
        result = await agent.retrieve_model(user_prompt)
        
        if result.success:
            print(f"\n✅ Successfully found model!")
            if result.selected_result:
                print(f"Set: {result.selected_result.name} ({result.selected_result.set_number})")
                print(f"Theme: {result.selected_result.theme}")
                print(f"Year: {result.selected_result.year}")
                print(f"Detail URL: {result.selected_result.detail_url}")
            if result.selected_variant:
                print(f"Variant: {result.selected_variant.name}")
                print(f"Download URL: {result.selected_variant.download_url}")
                print(f"Downloaded to: {result.downloaded_file_path}")
            if result.search_results:
                print(f"\nFound {len(result.search_results)} total search results:")
                for i, r in enumerate(result.search_results[:3]):  # Show top 3
                    print(f"  {i+1}. {r.name} ({r.set_number}) - Score: {r.relevance_score:.2f}")
        else:
            print(f"\n❌ Failed to retrieve model: {result.error_message}")
            if result.search_results:
                print(f"Found {len(result.search_results)} search results:")
                for i, r in enumerate(result.search_results[:3]):  # Show top 3
                    print(f"  {i+1}. {r.name} ({r.set_number}) - Score: {r.relevance_score:.2f}")
            else:
                print("No search results found.")


if __name__ == "__main__":
    asyncio.run(main())
