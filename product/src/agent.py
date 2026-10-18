"""Main agent for LEGO model retrieval using Pydantic AI."""

import hashlib
from datetime import datetime
from pathlib import Path
from typing import Optional, List

from pydantic_ai import Agent, RunContext
from pydantic_ai.models.anthropic import AnthropicModel
from pydantic_ai.providers.anthropic import AnthropicProvider

from .config import Config
from .models import CompleteModelResult, InstructionGenerationResult, ModelRetrievalResult, ModelVariant, OMRSearchResult, PromptAnalysis
from .omr_search import OMRSearchService
from .leocad_service import LeoCADService


class LegoModelRetrievalAgent:
    """Agent for retrieving LEGO models from OMR based on user prompts."""
    
    def __init__(self, config: Config):
        self.config = config
        self.omr_service = OMRSearchService(config)
        self.leocad_service = LeoCADService(config)
        
        # Create the model with proper API key
        if config.anthropic_api_key:
            self.model = AnthropicModel(
                'claude-sonnet-4-5',
                provider=AnthropicProvider(api_key=config.anthropic_api_key)
            )
            # Pass the LLM to the OMR service for semantic analysis
            self.omr_service.llm = self.model
            print(f"✅ LLM initialized: {type(self.model)}")
        else:
            # Fallback to string model (will use environment variables)
            self.model = config.default_model
            print(f"⚠️  Using fallback model: {self.model}")
        
        # Note: We're not using the LLM agent for the core logic anymore
        # The retrieve_model method handles everything programmatically
    
    # Tools are no longer needed since we handle everything programmatically
    
    async def retrieve_model(self, user_prompt: str) -> ModelRetrievalResult:
        """Main method to retrieve a LEGO model based on user prompt."""
        try:
            # Step 1: Analyze the prompt
            analysis = await self.omr_service.analyze_prompt(user_prompt)
            
            # Step 2: Search OMR
            search_results = await self.omr_service.search_omr(analysis, user_prompt)
            
            if not search_results:
                return ModelRetrievalResult(
                    success=False,
                    error_message="No models found matching the search criteria",
                    search_results=[]
                )
            
            # Step 3: Select the best result using LLM if available
            print(f"🔍 LLM Selection Debug: model={self.model is not None}, results_count={len(search_results)}")
            if self.model and len(search_results) > 1:
                print(f"🤖 Using LLM to select best result from {len(search_results)} options")
                selected_result = await self._select_best_result_with_llm(user_prompt, search_results[:5])  # Top 5 results
            else:
                print(f"📊 Using fallback: first result (relevance score)")
                selected_result = search_results[0]  # Fallback to highest relevance score
            
            # Step 4: Get variants for the selected result
            variants = await self.omr_service.get_model_variants(selected_result)
            
            if not variants:
                return ModelRetrievalResult(
                    success=False,
                    error_message="No download variants found for the selected model",
                    search_results=search_results,
                    selected_result=selected_result
                )
            
            # Step 5: Select the best variant (highest relevance score)
            selected_variant = variants[0]  # Already sorted by relevance
            
            # Step 6: Download the file automatically
            try:
                filename = f"{selected_result.set_number}_{selected_result.name.replace(' ', '_')}.mpd"
                downloaded_file = await self.omr_service.download_file(
                    selected_variant.download_url, 
                    filename
                )
                
                return ModelRetrievalResult(
                    success=True,
                    search_results=search_results,
                    selected_result=selected_result,
                    variants_found=variants,
                    selected_variant=selected_variant,
                    download_url=selected_variant.download_url,
                    downloaded_file_path=downloaded_file
                )
                
            except Exception as download_error:
                return ModelRetrievalResult(
                    success=False,
                    error_message=f"Failed to download model file: {str(download_error)}",
                    search_results=search_results,
                    selected_result=selected_result,
                    variants_found=variants,
                    selected_variant=selected_variant,
                    download_url=selected_variant.download_url
                )
                
        except Exception as e:
            return ModelRetrievalResult(
                success=False,
                error_message=f"Error during model retrieval: {str(e)}"
            )
    
    async def _select_best_result_with_llm(self, prompt: str, search_results: List[OMRSearchResult]) -> OMRSearchResult:
        """Use LLM to select the best result from search results based on the original prompt."""
        print(f"🎯 LLM Selection: prompt='{prompt}', results_count={len(search_results)}")
        
        if not search_results:
            print("❌ No search results provided")
            return None
        
        if len(search_results) == 1:
            print(f"✅ Only one result, returning: {search_results[0].name}")
            return search_results[0]
        
        # Create a prompt for the LLM to select the best result
        results_text = "\n".join([
            f"{i+1}. {result.name} (Set: {result.set_number}) - Theme: {result.theme}"
            for i, result in enumerate(search_results)
        ])
        
        selection_prompt = f"""
Given the user's request: "{prompt}"

Here are the top LEGO model search results:
{results_text}

Which model (1-{len(search_results)}) best matches the user's request? Consider:
- How well the model name and description match the request
- The theme and subject matter
- The overall relevance to what the user is asking for

Respond with just the number (1-{len(search_results)}) of the best match.
"""
        
        try:
            # Create a temporary agent using the Anthropic model
            from pydantic_ai import Agent
            agent = Agent(
                model=self.model,  # AnthropicModel
                system_prompt="You are a LEGO model selection expert. Respond with just a number."
            )
            
            response = await agent.run(selection_prompt)
            
            # Debug: print response object details
            print(f"🔍 LLM Selection Response Debug: type={type(response)}")
            print(f"🔍 Response attributes: {dir(response)}")
            print(f"🔍 Response content: {response}")
            
            # Use the output attribute (this is the correct one for AgentRunResult)
            if hasattr(response, "output"):
                output_text = response.output
                print(f"✅ Using output attribute")
            else:
                print(f"❌ No output attribute found")
                raise ValueError("No output attribute in LLM response")
            
            selection_text = output_text.strip()
            
            # Extract the number from the response
            import re
            match = re.search(r'\b(\d+)\b', selection_text)
            if match:
                selection_index = int(match.group(1)) - 1  # Convert to 0-based index
                if 0 <= selection_index < len(search_results):
                    selected_result = search_results[selection_index]
                    print(f"🤖 LLM selected: {selected_result.name} (option {selection_index + 1})")
                    return selected_result
            
            print(f"⚠️  LLM selection failed, using first result: {search_results[0].name}")
            return search_results[0]
            
        except Exception as e:
            print(f"⚠️  LLM selection error: {e}, using first result: {search_results[0].name}")
            return search_results[0]
    
    async def retrieve_model_sync(self, user_prompt: str) -> ModelRetrievalResult:
        """Synchronous version of retrieve_model."""
        return await self.retrieve_model(user_prompt)
    
    async def retrieve_model_with_instructions(self, user_prompt: str) -> CompleteModelResult:
        """Complete process: retrieve model and generate instructions."""
        # Step 1: Retrieve the model
        retrieval_result = await self.retrieve_model(user_prompt)
        
        if not retrieval_result.success or not retrieval_result.downloaded_file_path:
            return CompleteModelResult(
                retrieval_result=retrieval_result,
                instruction_result=None,
                summary=f"❌ Model retrieval failed: {retrieval_result.error_message}"
            )
        
        # Step 2: Generate instructions
        instruction_result = await self.leocad_service.generate_instructions(
            retrieval_result.downloaded_file_path,
            model_info=retrieval_result.selected_result
        )
        
        # Step 3: Create summary
        summary = self._create_summary(retrieval_result, instruction_result)
        
        return CompleteModelResult(
            retrieval_result=retrieval_result,
            instruction_result=instruction_result,
            summary=summary
        )
    
    def _create_summary(self, retrieval_result: ModelRetrievalResult, instruction_result: InstructionGenerationResult) -> str:
        """Create a human-readable summary of the complete process."""
        summary_parts = []
        
        # Model retrieval summary
        if retrieval_result.success and retrieval_result.selected_result:
            model_name = retrieval_result.selected_result.name
            set_number = retrieval_result.selected_result.set_number
            summary_parts.append(f"✅ Found model: {set_number} - {model_name}")
        else:
            summary_parts.append("❌ Model retrieval failed")
            return " ".join(summary_parts)
        
        # Instruction generation summary
        if instruction_result.success:
            if instruction_result.step_count > 0:
                step_count = len(instruction_result.step_images)
                summary_parts.append(f"✅ Generated {step_count} step images")
            else:
                summary_parts.append("✅ No steps found in model")
            
            if instruction_result.bom_csv:
                summary_parts.append("✅ Generated BOM CSV")
            
            if instruction_result.html_export:
                summary_parts.append("✅ Generated HTML export")
        else:
            summary_parts.append(f"❌ Instruction generation failed: {instruction_result.error_message}")
        
        return " | ".join(summary_parts)
