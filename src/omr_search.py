"""OMR (Official LEGO Model Repository) search functionality."""

import asyncio
import json
import re
import ssl
from pathlib import Path
from typing import List, Optional
from urllib.parse import urljoin

import aiohttp
from playwright.async_api import async_playwright

from .config import Config
from .models import ModelRetrievalResult, ModelVariant, OMRSearchResult, PromptAnalysis


class OMRSearchService:
    """Service for searching and downloading LEGO models from OMR."""
    
    def __init__(self, config: Config):
        self.config = config
        self.llm = None  # Will be set by the agent if available
    
    async def analyze_prompt(self, prompt: str) -> PromptAnalysis:
        """Analyze user prompt using hybrid approach: direct + semantic understanding."""
        # First, try direct analysis for simple prompts
        direct_analysis = self._analyze_prompt_direct(prompt)
        
        # Check if this is a simple, straightforward prompt
        if self._is_simple_prompt(prompt, direct_analysis):
            print(f"🔍 Direct analysis for simple prompt '{prompt}':")
            print(f"   Theme: {direct_analysis.theme}")
            print(f"   Colors: {direct_analysis.colors}")
            print(f"   Constraints: {direct_analysis.constraints}")
            print(f"   Keywords: {direct_analysis.keywords}")
            return direct_analysis
        
        # For complex/novel prompts, use semantic analysis
        print(f"🧠 Using semantic analysis for complex prompt '{prompt}'")
        semantic_analysis = await self._analyze_prompt_semantic(prompt, direct_analysis)
        
        print(f"🔍 Semantic analysis for '{prompt}':")
        print(f"   Theme: {semantic_analysis.theme}")
        print(f"   Colors: {semantic_analysis.colors}")
        print(f"   Constraints: {semantic_analysis.constraints}")
        print(f"   Keywords: {semantic_analysis.keywords}")
        print(f"   Related concepts: {getattr(semantic_analysis, 'related_concepts', [])}")
        print(f"   Search hints: {getattr(semantic_analysis, 'search_hints', [])}")
        
        return semantic_analysis
    
    def _analyze_prompt_direct(self, prompt: str) -> PromptAnalysis:
        """Direct keyword-based analysis for simple prompts."""
        # More specific theme categories with priority order
        theme_categories = {
            # Vehicle types (most specific first)
            "batmobile": ["batmobile", "bat mobile", "batman car"],
            "race_car": ["race car", "racing car", "formula", "f1", "nascar", "speed"],
            "sports_car": ["sports car", "supercar", "ferrari", "lamborghini", "porsche"],
            "regular_car": ["car", "automobile", "vehicle", "sedan", "coupe"],
            "truck": ["truck", "pickup", "lorry"],
            "bus": ["bus", "coach"],
            "motorcycle": ["motorcycle", "bike", "motorbike"],
            "train": ["train", "locomotive", "railway", "railroad"],
            
            # Aircraft
            "fighter_jet": ["fighter", "jet", "f-16", "f-22"],
            "airplane": ["plane", "aircraft", "airplane", "airliner"],
            "helicopter": ["helicopter", "chopper"],
            
            # Space
            "spaceship": ["spaceship", "spacecraft", "rocket", "shuttle"],
            
            # Buildings
            "house": ["house", "home", "residence"],
            "castle": ["castle", "fortress", "palace"],
            "building": ["building", "tower", "skyscraper"],
            
            # Other
            "robot": ["robot", "android", "cyborg"],
            "ship": ["ship", "boat", "yacht", "cruise"],
            "tank": ["tank", "armored"],
        }
        
        # Common colors
        colors = [
            "red", "blue", "green", "yellow", "black", "white", "gray", "grey",
            "orange", "purple", "pink", "brown", "tan", "lime", "cyan", "magenta"
        ]
        
        # Size/constraint keywords
        constraints = [
            "small", "large", "big", "tiny", "mini", "micro", "huge",
            "simple", "complex", "detailed", "basic", "advanced"
        ]
        
        prompt_lower = prompt.lower()
        
        # Find the most specific theme match
        found_theme = "general"
        theme_priority = 0
        
        for theme_name, keywords in theme_categories.items():
            for keyword in keywords:
                if keyword in prompt_lower:
                    # Use priority based on specificity (more specific themes have higher priority)
                    current_priority = len(keywords)  # More keywords = more specific
                    if current_priority > theme_priority:
                        found_theme = theme_name
                        theme_priority = current_priority
                    break
        
        # Extract colors
        found_colors = [color for color in colors if color in prompt_lower]
        
        # Extract constraints
        found_constraints = [constraint for constraint in constraints if constraint in prompt_lower]
        
        # Extract all meaningful keywords (excluding common words)
        common_words = {"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "lego"}
        keywords = [word for word in prompt_lower.split() if word not in common_words and len(word) > 2]
        
        return PromptAnalysis(
            theme=found_theme,
            colors=found_colors,
            constraints=found_constraints,
            keywords=keywords
        )
        
    def _is_simple_prompt(self, prompt: str, analysis: PromptAnalysis) -> bool:
        """Determine if a prompt is simple enough for direct analysis."""
        prompt_lower = prompt.lower()
        
        # Simple prompts are those that:
        # 1. Have 3 or fewer meaningful words
        # 2. Match a known theme category
        # 3. Don't contain complex concepts
        
        meaningful_words = [word for word in prompt_lower.split() if len(word) > 2 and word not in {"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "lego"}]
        
        # Check for complex concepts that need semantic analysis
        complex_concepts = [
            "futuristic", "steampunk", "cyberpunk", "medieval", "ancient", "modern", "vintage",
            "flying", "hovering", "levitating", "transforming", "modular", "custom",
            "battle", "war", "combat", "military", "space", "alien", "fantasy", "sci-fi"
        ]
        
        has_complex_concept = any(concept in prompt_lower for concept in complex_concepts)
        is_short_and_simple = len(meaningful_words) <= 3 and analysis.theme != "general" and not has_complex_concept
        
        return is_short_and_simple
    
    async def _analyze_prompt_semantic(self, prompt: str, direct_analysis: PromptAnalysis) -> PromptAnalysis:
        """Use LLM to analyze complex prompts semantically."""
        try:
            # Use the existing LLM setup if available
            if hasattr(self, 'llm') and self.llm:
                return await self._analyze_with_llm(prompt, direct_analysis)
            else:
                # Fallback to enhanced direct analysis for now
                return self._analyze_prompt_enhanced(prompt, direct_analysis)
        except Exception as e:
            print(f"⚠️  Semantic analysis failed, falling back to enhanced direct analysis: {e}")
            return self._analyze_prompt_enhanced(prompt, direct_analysis)
    
    async def _analyze_with_llm(self, prompt: str, direct_analysis: PromptAnalysis) -> PromptAnalysis:
        """Analyze prompt using LLM for semantic understanding."""
        try:
            system_prompt = f"""
            Analyze this LEGO model request: "{prompt}"
            
            Extract and return a JSON response with:
            1. theme: Main theme/category (be creative, don't limit to predefined categories)
            2. colors: List of colors mentioned
            3. constraints: List of size/complexity constraints
            4. keywords: List of all relevant keywords for search
            5. related_concepts: List of related concepts and synonyms that might help find similar LEGO models
            6. search_hints: List of alternative search terms that might find similar models in a LEGO database
            
            For novel concepts, suggest related LEGO themes that might have similar models.
            Think about what LEGO sets or themes might contain similar concepts.
            
            Current direct analysis shows: theme={direct_analysis.theme}, colors={direct_analysis.colors}
            
            Return only valid JSON, no other text.
            """
            
            # Create a temporary agent using the Anthropic model
            from pydantic_ai import Agent
            agent = Agent(
                model=self.llm,  # AnthropicModel
                system_prompt="You are a LEGO model analysis expert. Respond with valid JSON only."
            )
            
            # Use the LLM to get semantic analysis
            response = await agent.run(system_prompt)
            
            # Use the output attribute (this is the correct one for AgentRunResult)
            if hasattr(response, "output"):
                output_text = response.output
            else:
                raise ValueError("No output attribute in LLM response")
            
            # Parse the JSON response (handle markdown code blocks)
            import json
            import re
            try:
                # Extract JSON from markdown code blocks if present
                json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', output_text, re.DOTALL)
                if json_match:
                    json_text = json_match.group(1)
                else:
                    json_text = output_text
                
                llm_analysis = json.loads(json_text)
                
                # Create enhanced analysis with LLM results
                enhanced_analysis = PromptAnalysis(
                    theme=llm_analysis.get('theme', direct_analysis.theme),
                    colors=llm_analysis.get('colors', direct_analysis.colors),
                    constraints=llm_analysis.get('constraints', direct_analysis.constraints),
                    keywords=llm_analysis.get('keywords', direct_analysis.keywords)
                )
                
                # Add semantic information
                enhanced_analysis.related_concepts = llm_analysis.get('related_concepts', [])
                enhanced_analysis.search_hints = llm_analysis.get('search_hints', [])
                
                return enhanced_analysis
                
            except json.JSONDecodeError:
                print(f"⚠️  Failed to parse LLM response as JSON, falling back to enhanced analysis")
                return self._analyze_prompt_enhanced(prompt, direct_analysis)
                
        except Exception as e:
            print(f"⚠️  LLM analysis failed: {e}, falling back to enhanced analysis")
            return self._analyze_prompt_enhanced(prompt, direct_analysis)
    
    def _analyze_prompt_enhanced(self, prompt: str, direct_analysis: PromptAnalysis) -> PromptAnalysis:
        """Enhanced direct analysis with better concept extraction."""
        prompt_lower = prompt.lower()
        
        # Enhanced theme detection with more flexible matching
        enhanced_theme = direct_analysis.theme
        related_concepts = []
        search_hints = []
        
        # Add semantic concept mapping
        concept_mappings = {
            # Futuristic concepts
            "futuristic": ["space", "sci-fi", "cyber", "neon", "tech"],
            "steampunk": ["vintage", "brass", "gear", "steam", "industrial"],
            "cyberpunk": ["neon", "tech", "cyber", "digital", "matrix"],
            
            # Movement concepts
            "flying": ["aircraft", "plane", "helicopter", "jet", "wing"],
            "hovering": ["hover", "levitate", "float", "air cushion"],
            "transforming": ["transform", "convert", "change", "modular"],
            
            # Style concepts
            "medieval": ["castle", "knight", "dragon", "fortress", "ancient"],
            "modern": ["contemporary", "sleek", "minimalist", "tech"],
            "vintage": ["classic", "retro", "old", "traditional"],
            
            # Function concepts
            "battle": ["war", "combat", "military", "tank", "fighter"],
            "space": ["astronaut", "rocket", "shuttle", "alien", "planet"],
            "fantasy": ["magic", "dragon", "wizard", "mythical", "enchanted"]
        }
        
        # Find related concepts
        for concept, related in concept_mappings.items():
            if concept in prompt_lower:
                related_concepts.extend(related)
                search_hints.extend(related)
        
        # Enhanced keyword extraction
        enhanced_keywords = direct_analysis.keywords.copy()
        enhanced_keywords.extend(related_concepts)
        
        # Remove duplicates and common words
        common_words = {"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "lego", "build", "make", "create"}
        enhanced_keywords = [word for word in enhanced_keywords if word not in common_words and len(word) > 2]
        enhanced_keywords = list(dict.fromkeys(enhanced_keywords))  # Remove duplicates while preserving order
        
        # Create enhanced analysis
        enhanced_analysis = PromptAnalysis(
            theme=enhanced_theme,
            colors=direct_analysis.colors,
            constraints=direct_analysis.constraints,
            keywords=enhanced_keywords
        )
        
        # Add semantic information as attributes
        enhanced_analysis.related_concepts = related_concepts
        enhanced_analysis.search_hints = search_hints
        
        return enhanced_analysis
    
    async def search_omr(self, analysis: PromptAnalysis, original_prompt: str = "") -> List[OMRSearchResult]:
        """Search OMR for relevant LEGO models using Playwright."""
        # Try multiple search strategies
        search_strategies = self._generate_search_strategies(analysis, original_prompt)
        
        print(f"🎯 Generated {len(search_strategies)} search strategies:")
        for i, (strategy_name, search_terms) in enumerate(search_strategies, 1):
            print(f"   {i}. {strategy_name}: '{search_terms}'")
        
        # Try strategies in order of preference, stop at first good result
        for strategy_name, search_terms in search_strategies:
            search_url = f"{self.config.omr_search_url}?search={search_terms}"
            print(f"Trying search strategy: {strategy_name} with terms: {search_terms}")
            
            results = await self._perform_search(search_url, analysis, search_terms)
            
            if not results:
                print(f"No results found with strategy: {strategy_name}")
                continue
            
            # Show results for debugging
                print(f"Found {len(results)} results with strategy: {strategy_name}")
            if results:
                top_result = max(results, key=lambda x: x.relevance_score)
                print(f"   Top result: {top_result.name} (score: {top_result.relevance_score:.3f})")
            
            # For exact_prompt, be more lenient - any results are good
            if strategy_name == "exact_prompt" and results:
                print(f"✅ Using exact_prompt strategy with {len(results)} results")
                results.sort(key=lambda x: x.relevance_score, reverse=True)
                return results
            
            # For other strategies, require at least 3 results or a high score
            if len(results) >= 3 or (results and max(r.relevance_score for r in results) > 0.3):
                print(f"✅ Using {strategy_name} strategy with {len(results)} results")
                results.sort(key=lambda x: x.relevance_score, reverse=True)
                return results
            else:
                print(f"   Strategy {strategy_name} not good enough, trying next...")
        
        # If no strategy worked well, return the last attempt
        if 'results' in locals() and results:
            print(f"⚠️  No strategy was ideal, using last attempt with {len(results)} results")
            results.sort(key=lambda x: x.relevance_score, reverse=True)
            return results
        else:
            print("❌ No results found with any strategy")
            return []
    
    def _generate_search_strategies(self, analysis: PromptAnalysis, original_prompt: str) -> List[tuple]:
        """Generate different search strategies using hybrid approach."""
        strategies = []
        
        # Strategy 1: Use the original prompt exactly as entered (most important!)
        strategies.append(("exact_prompt", original_prompt))
        
        # Check if this is a simple prompt or complex prompt
        is_simple = self._is_simple_prompt(original_prompt, analysis)
        
        if is_simple:
            # For simple prompts, use direct strategies
            strategies.extend(self._generate_direct_strategies(analysis, original_prompt))
        else:
            # For complex prompts, use semantic strategies
            strategies.extend(self._generate_semantic_strategies(analysis, original_prompt))
        
        return strategies
    
    def _generate_direct_strategies(self, analysis: PromptAnalysis, original_prompt: str) -> List[tuple]:
        """Generate direct search strategies for simple prompts."""
        strategies = []
        
        # Strategy 2: Most specific theme terms
        if analysis.theme == "batmobile":
            strategies.append(("batmobile_specific", "batmobile batman"))
        elif analysis.theme == "race_car":
            strategies.append(("race_car_specific", "race car racing formula"))
        elif analysis.theme == "sports_car":
            strategies.append(("sports_car_specific", "sports car supercar"))
        elif analysis.theme == "regular_car":
            strategies.append(("regular_car_specific", "car automobile vehicle"))
        elif analysis.theme == "train":
            strategies.append(("train_specific", "train locomotive railway"))
        
        # Strategy 3: Core concept (extract the main word)
        core_concept = self._extract_core_concept(original_prompt)
        if core_concept:
            strategies.append(("core_concept", core_concept))
        
        # Strategy 4: Broader category
        broader_category = self._get_broader_category(analysis)
        if broader_category and broader_category != analysis.theme:
            strategies.append(("broader_category", broader_category))
        
        # Strategy 5: Enhanced keywords (just the main ones)
        if analysis.keywords:
            main_keywords = analysis.keywords[:3]  # Just the top 3 keywords
            strategies.append(("enhanced_keywords", " ".join(main_keywords)))
        
        return strategies
    
    def _generate_semantic_strategies(self, analysis: PromptAnalysis, original_prompt: str) -> List[tuple]:
        """Generate semantic search strategies using the same simple pattern as direct strategies."""
        strategies = []
        
        # Strategy 1: Exact prompt (already added in _generate_search_strategies)
        # strategies.append(("exact_prompt", original_prompt))
        
        # Strategy 2: Core concept (extract the main word)
        core_concept = self._extract_core_concept(original_prompt)
        if core_concept:
            strategies.append(("core_concept", core_concept))
        
        # Strategy 3: Broader category (same as original logic)
        broader_category = self._get_broader_category(analysis)
        if broader_category and broader_category != analysis.theme:
            strategies.append(("broader_category", broader_category))
        
        # Strategy 4: Enhanced keywords (use the LLM's enhanced keywords, but just the main ones)
        if analysis.keywords:
            # Only use the first few most important keywords, not all of them
            main_keywords = analysis.keywords[:3]  # Just the top 3 keywords
            strategies.append(("enhanced_keywords", " ".join(main_keywords)))
        
        return strategies
    
    def _extract_core_concept(self, prompt: str) -> str:
        """Extract the core concept from a complex prompt."""
        prompt_lower = prompt.lower()
        
        # Remove common words and extract meaningful terms
        common_words = {"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "lego", "build", "make", "create", "small", "large", "big", "tiny", "mini", "micro", "huge", "red", "blue", "green", "yellow", "black", "white", "gray", "grey", "orange", "purple", "pink", "brown", "tan", "lime", "cyan", "magenta"}
        
        words = [word for word in prompt_lower.split() if word not in common_words and len(word) > 2]
        
        # Return the most important words (up to 3)
        return " ".join(words[:3])
    
    def _get_broader_category(self, analysis: PromptAnalysis) -> str:
        """Get a broader category for the analysis."""
        # Map specific themes to broader categories
        broader_mapping = {
            "race_car": "vehicle",
            "sports_car": "vehicle", 
            "regular_car": "vehicle",
            "truck": "vehicle",
            "bus": "vehicle",
            "motorcycle": "vehicle",
            "train": "vehicle",
            "fighter_jet": "aircraft",
            "airplane": "aircraft",
            "helicopter": "aircraft",
            "spaceship": "space",
            "house": "building",
            "castle": "building",
            "building": "building",
            "robot": "mechanical",
            "ship": "watercraft",
            "tank": "military"
        }
        
        return broader_mapping.get(analysis.theme, "general")
    
    async def _perform_search(self, search_url: str, analysis: PromptAnalysis, search_terms: str) -> List[OMRSearchResult]:
        """Perform a single search and return results."""
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context()
            page = await context.new_page()
            
            # Clear any potential cache issues
            await context.clear_cookies()
            
            try:
                # Navigate to the OMR sets page first
                await page.goto("https://library.ldraw.org/omr/sets", wait_until='networkidle')
                await page.wait_for_timeout(2000)
                
                # Find and fill the search input
                search_input = await page.wait_for_selector('input[type="search"], input[name="search"], input[placeholder*="search" i]', timeout=10000)
                await search_input.fill("")  # Clear the input
                await search_input.fill(search_terms)
                
                # Submit the search (try different methods)
                try:
                    # Try pressing Enter
                    await search_input.press('Enter')
                except:
                    # Try clicking a search button
                    search_button = await page.wait_for_selector('button[type="submit"], input[type="submit"], .search-button', timeout=5000)
                    await search_button.click()
                
                # Wait for results to load
                await page.wait_for_timeout(3000)
                
                # Wait longer for dynamic content to load
                await page.wait_for_timeout(5000)  # Give more time for JavaScript to load results
                
                # Wait for the results to load - be more specific about what we're looking for
                try:
                    # Wait for the actual results table with data
                    await page.wait_for_selector('table tbody tr', timeout=15000)
                    # Wait a bit more to ensure all results are loaded
                    await page.wait_for_timeout(2000)
                except:
                    print("No table rows found, trying alternative selectors...")
                    # If no table rows found, try other selectors
                    await page.wait_for_selector('table, .table, [data-testid="results"], .results', timeout=5000)
                
                # Debug: Check what's actually on the page
                page_title = await page.title()
                print(f"Page title: {page_title}")
                
                # Check if we're on the right page
                current_url = page.url
                print(f"Current URL: {current_url}")
                
                # Debug: Check if we found the right content
                html_content = await page.content()
                if "Red Race Car" in html_content:
                    print("✅ Found 'Red Race Car' in search results!")
                
                # Extract results from the page
                results = await page.evaluate("""
                    () => {
                        const results = [];
                        
                        // Look for table rows in tbody
                        const tableRows = document.querySelectorAll('table tbody tr');
                        
                        for (const row of tableRows) {
                            try {
                                const cells = row.querySelectorAll('td');
                                console.log('Row has', cells.length, 'cells');
                                
                                if (cells.length >= 5) {
                                    // OMR table structure: [empty, set_number, name, theme, year, ...]
                                    const setNumber = cells[1]?.textContent?.trim() || '';
                                    const name = cells[2]?.textContent?.trim() || '';
                                    const theme = cells[3]?.textContent?.trim() || '';
                                    const yearText = cells[4]?.textContent?.trim() || '';
                                    
                                    console.log('Parsed:', {setNumber, name, theme, yearText});
                                    
                                    // Find detail URL (usually in the name cell)
                                    const link = cells[2]?.querySelector('a') || row.querySelector('a');
                                    const detailUrl = link ? link.href : '';
                                    
                                    if (setNumber && name) {
                                        results.push({
                                            set_number: setNumber,
                                            name: name,
                                            theme: theme,
                                            year: yearText.match(/\\d{4}/) ? parseInt(yearText.match(/\\d{4}/)[0]) : null,
                                            detail_url: detailUrl
                                        });
                                    }
                                }
                            } catch (e) {
                                console.log('Error parsing row:', e);
                            }
                        }
                        
                        console.log('Total results found:', results.length);
                        return results;
                    }
                """)
                
                # Convert to OMRSearchResult objects and calculate relevance scores
                search_results = []
                for result_data in results:
                    relevance_score = self._calculate_relevance_score(
                        analysis, 
                        result_data['set_number'], 
                        result_data['name'], 
                        result_data['theme']
                    )
                    
                    result = OMRSearchResult(
                        set_number=result_data['set_number'],
                        name=result_data['name'],
                        theme=result_data['theme'],
                        year=result_data['year'],
                        detail_url=result_data['detail_url'],
                        relevance_score=relevance_score
                    )
                    search_results.append(result)
                
                # Sort by relevance score (descending)
                search_results.sort(key=lambda x: x.relevance_score, reverse=True)
                
                # Debug: Print first few results to see what we're getting
                if search_results:
                    print(f"Found {len(search_results)} results from OMR")
                
                return search_results
                
            except Exception as e:
                print(f"Error searching OMR: {e}")
                return []
            finally:
                await browser.close()
    
    def _calculate_relevance_score(
        self, 
        analysis: PromptAnalysis, 
        set_number: str, 
        name: str, 
        theme: str
    ) -> float:
        """Calculate relevance score using hybrid approach."""
        score = 0.0
        name_lower = name.lower()
        theme_lower = theme.lower()
        
        # Check if this is a simple or complex analysis
        is_simple = not (analysis.related_concepts and len(analysis.related_concepts) > 0)
        
        if is_simple:
            # Use direct scoring for simple prompts
            score = self._calculate_direct_relevance_score(analysis, name_lower, theme_lower)
        else:
            # Use semantic scoring for complex prompts
            score = self._calculate_semantic_relevance_score(analysis, name_lower, theme_lower)
        
        return max(0.0, min(score, 1.0))  # Cap between 0 and 1
    
    def _calculate_direct_relevance_score(self, analysis: PromptAnalysis, name_lower: str, theme_lower: str) -> float:
        """Calculate relevance score for simple prompts using direct matching."""
        score = 0.0
        
        # Theme-specific scoring with penalties for irrelevant matches
        if analysis.theme == "race_car":
            if any(word in name_lower for word in ["race", "racing", "formula", "f1", "nascar", "speed"]):
                score += 0.8  # High score for race cars
            elif any(word in name_lower for word in ["train", "railroad", "railway", "locomotive"]):
                score -= 0.5  # Penalty for train cars when looking for race cars
            elif "car" in name_lower:
                score += 0.3  # Medium score for regular cars
                
        elif analysis.theme == "regular_car":
            if any(word in name_lower for word in ["car", "automobile", "vehicle"]):
                if any(word in name_lower for word in ["train", "railroad", "railway", "locomotive"]):
                    score -= 0.3  # Penalty for train cars
                else:
                    score += 0.6  # Good score for regular cars
                    
        elif analysis.theme == "train":
            if any(word in name_lower for word in ["train", "railroad", "railway", "locomotive"]):
                score += 0.8  # High score for trains
            elif "car" in name_lower and not any(word in name_lower for word in ["race", "racing", "sports"]):
                score += 0.4  # Medium score for train cars
                
        elif analysis.theme == "sports_car":
            if any(word in name_lower for word in ["sports", "supercar", "ferrari", "lamborghini", "porsche"]):
                score += 0.8
            elif "car" in name_lower:
                score += 0.4
                
        else:
            # Generic theme matching
            if analysis.theme.lower() in name_lower or analysis.theme.lower() in theme_lower:
                score += 0.5
        
        # Color matches (higher weight for exact matches)
        for color in analysis.colors:
            if color.lower() in name_lower:
                score += 0.3  # Increased weight for color matches
        
        # Constraint matches
        for constraint in analysis.constraints:
            if constraint.lower() in name_lower:
                score += 0.2  # Increased weight for constraint matches
        
        # Keyword matches in name (lower weight to avoid over-scoring)
        for keyword in analysis.keywords:
            if keyword.lower() in name_lower:
                score += 0.1
        
        # Bonus for exact phrase matches
        if analysis.theme == "race_car" and "race car" in name_lower:
            score += 0.2
        elif analysis.theme == "sports_car" and "sports car" in name_lower:
            score += 0.2
        
        return score
    
    def _calculate_semantic_relevance_score(self, analysis: PromptAnalysis, name_lower: str, theme_lower: str) -> float:
        """Calculate relevance score for complex prompts using semantic understanding."""
        score = 0.0
        
        # Base score from theme matching
        if analysis.theme != "general" and analysis.theme.lower() in name_lower:
            score += 0.4
        
        # Color matches
        for color in analysis.colors:
            if color.lower() in name_lower:
                score += 0.3
        
        # Constraint matches
        for constraint in analysis.constraints:
            if constraint.lower() in name_lower:
                score += 0.2
        
        # Enhanced keyword matching (includes semantic expansion)
        keyword_matches = 0
        for keyword in analysis.keywords:
            if keyword.lower() in name_lower:
                keyword_matches += 1
                score += 0.15  # Slightly higher weight for semantic keywords
        
        # Bonus for multiple keyword matches
        if keyword_matches >= 2:
            score += 0.1
        
        # Related concepts matching
        if hasattr(analysis, 'related_concepts') and analysis.related_concepts:
            concept_matches = 0
            for concept in analysis.related_concepts:
                if concept.lower() in name_lower:
                    concept_matches += 1
                    score += 0.2  # Higher weight for semantic concept matches
            
            # Bonus for multiple concept matches
            if concept_matches >= 2:
                score += 0.15
        
        # Search hints matching
        if hasattr(analysis, 'search_hints') and analysis.search_hints:
            hint_matches = 0
            for hint in analysis.search_hints:
                if hint.lower() in name_lower:
                    hint_matches += 1
                    score += 0.1
            
            # Bonus for multiple hint matches
            if hint_matches >= 3:
                score += 0.1
        
        
        # Penalty for clearly irrelevant matches
        if self._is_irrelevant_match(analysis, name_lower, theme_lower):
            score -= 0.3
        
        return score
    
    def _is_irrelevant_match(self, analysis: PromptAnalysis, name_lower: str, theme_lower: str) -> bool:
        """Check if a result is clearly irrelevant to the search."""
        # Define irrelevant patterns for different themes
        irrelevant_patterns = {
            "race_car": ["train", "railroad", "railway", "locomotive", "house", "building", "castle"],
            "train": ["race", "racing", "sports car", "ferrari", "lamborghini"],
            "aircraft": ["car", "truck", "ship", "boat", "house", "building"],
            "space": ["car", "truck", "house", "building", "train"],
            "building": ["car", "truck", "aircraft", "spaceship", "train"]
        }
        
        theme = analysis.theme
        if theme in irrelevant_patterns:
            for pattern in irrelevant_patterns[theme]:
                if pattern in name_lower:
                    return True
        
        return False
    
    async def get_model_variants(self, result: OMRSearchResult) -> List[ModelVariant]:
        """Get available variants for a model using Playwright."""
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            
            try:
                # Navigate to the model detail page with shorter timeout
                await page.goto(result.detail_url, wait_until='networkidle', timeout=15000)
                
                # Wait for the page to load
                await page.wait_for_timeout(1000)
                
                # Extract download links
                variants = await page.evaluate("""
                    () => {
                        const variants = [];
                        
                        // Look for download links
                        const downloadLinks = document.querySelectorAll('a[href*="download"], a[href*=".mpd"], a[href*=".zip"], button[onclick*="download"]');
                        
                        for (const link of downloadLinks) {
                            const href = link.href || link.getAttribute('onclick') || '';
                            const text = link.textContent?.trim() || '';
                            
                            if (href && (href.includes('download') || href.includes('.mpd') || href.includes('.zip'))) {
                                let fileType = 'mpd';
                                if (href.includes('.zip')) fileType = 'zip';
                                else if (href.includes('.mpd')) fileType = 'mpd';
                                
                                const variantName = text || 'Main Model';
                                
                                variants.push({
                                    name: variantName,
                                    download_url: href,
                                    file_type: fileType
                                });
                            }
                        }
                        
                        return variants;
                    }
                """)
                
                # Convert to ModelVariant objects
                model_variants = []
                for variant_data in variants:
                    relevance_score = self._calculate_variant_relevance(variant_data['name'])
                    
                    variant = ModelVariant(
                        name=variant_data['name'],
                        download_url=variant_data['download_url'],
                        file_type=variant_data['file_type'],
                        relevance_score=relevance_score
                    )
                    model_variants.append(variant)
                
                # Sort by relevance score
                model_variants.sort(key=lambda x: x.relevance_score, reverse=True)
                return model_variants
                
            except Exception as e:
                print(f"Error getting model variants: {e}")
                return []
            finally:
                await browser.close()
    
    def _calculate_variant_relevance(self, variant_name: str) -> float:
        """Calculate relevance score for a model variant."""
        name_lower = variant_name.lower()
        
        # Prefer main models
        if 'main' in name_lower:
            return 1.0
        elif 'small' in name_lower:
            return 0.8
        elif 'large' in name_lower:
            return 0.7
        elif 'alternate' in name_lower:
            return 0.5
        else:
            return 0.6  # Default score
    
    async def download_file(self, download_url: str, filename: str) -> str:
        """Download a file from the given URL and save it to the output directory."""
        try:
            # Ensure output directory exists
            self.config.output_dir.mkdir(parents=True, exist_ok=True)
            
            # Create file path
            file_path = self.config.output_dir / filename
            
            # Create SSL context that doesn't verify certificates (for development)
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            
            # Download the file
            connector = aiohttp.TCPConnector(ssl=ssl_context)
            async with aiohttp.ClientSession(connector=connector) as session:
                async with session.get(download_url) as response:
                    if response.status == 200:
                        content = await response.read()
                        
                        # Write to file
                        with open(file_path, 'wb') as f:
                            f.write(content)
                        
                        return str(file_path)
                    else:
                        raise Exception(f"Failed to download file: HTTP {response.status}")
                        
        except Exception as e:
            raise Exception(f"Error downloading file: {str(e)}")
