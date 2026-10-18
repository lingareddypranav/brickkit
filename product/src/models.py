"""Pydantic models for structured data in Brick Kit."""

from datetime import datetime
from pathlib import Path
from typing import List, Optional

from pydantic import BaseModel, Field


class PromptAnalysis(BaseModel):
    """Analysis of user prompt for LEGO model search."""
    
    theme: str = Field(..., description="Main theme (e.g., car, plane, house, spaceship)")
    colors: List[str] = Field(default_factory=list, description="Colors mentioned in prompt")
    constraints: List[str] = Field(default_factory=list, description="Size or complexity constraints")
    keywords: List[str] = Field(default_factory=list, description="All relevant keywords for search")
    related_concepts: List[str] = Field(default_factory=list, description="Related concepts from semantic analysis")
    search_hints: List[str] = Field(default_factory=list, description="Search hints from semantic analysis")


class OMRSearchResult(BaseModel):
    """Result from OMR search."""
    
    set_number: str = Field(..., description="LEGO set number")
    name: str = Field(..., description="Set name")
    theme: str = Field(..., description="Set theme")
    year: Optional[int] = Field(None, description="Release year")
    detail_url: str = Field(..., description="URL to set detail page")
    relevance_score: float = Field(default=0.0, description="Relevance score (0-1)")


class ModelVariant(BaseModel):
    """A variant of a LEGO model."""
    
    name: str = Field(..., description="Variant name (e.g., 'Main Model', 'Small Version')")
    download_url: str = Field(..., description="Direct download URL")
    file_type: str = Field(..., description="File type (mpd, zip)")
    relevance_score: float = Field(default=0.0, description="Relevance score for this variant")


class InstructionGenerationResult(BaseModel):
    """Result of instruction generation from LeoCAD."""
    
    success: bool = Field(..., description="Whether instruction generation was successful")
    error_message: Optional[str] = Field(None, description="Error message if failed")
    step_images: List[str] = Field(default_factory=list, description="Paths to step instruction images")
    bom_csv: Optional[str] = Field(None, description="Path to BOM CSV file")
    html_export: Optional[str] = Field(None, description="Path to HTML export directory")
    pdf_instructions: Optional[str] = Field(None, description="Path to PDF instruction manual")
    step_count: int = Field(default=0, description="Number of steps found in the model")


class ModelRetrievalResult(BaseModel):
    """Result of Part 1 - Model Retrieval."""
    
    success: bool = Field(..., description="Whether retrieval was successful")
    error_message: Optional[str] = Field(None, description="Error message if failed")
    search_results: List[OMRSearchResult] = Field(default_factory=list, description="Search results found")
    selected_result: Optional[OMRSearchResult] = Field(None, description="Selected result")
    variants_found: List[ModelVariant] = Field(default_factory=list, description="Available variants")
    selected_variant: Optional[ModelVariant] = Field(None, description="Selected variant")
    download_url: Optional[str] = Field(None, description="Download URL for the selected variant")
    downloaded_file_path: Optional[str] = Field(None, description="Local path to downloaded MPD file")


class CompleteModelResult(BaseModel):
    """Complete result including both model retrieval and instruction generation."""
    
    retrieval_result: ModelRetrievalResult = Field(..., description="Model retrieval results")
    instruction_result: Optional[InstructionGenerationResult] = Field(None, description="Instruction generation results")
    summary: str = Field(..., description="Human-readable summary of the complete process")
