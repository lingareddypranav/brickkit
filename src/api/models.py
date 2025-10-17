"""API request and response models for Brick Kit."""

from datetime import datetime
from pathlib import Path
from typing import List, Optional

from pydantic import BaseModel, Field


class ModelRetrievalRequest(BaseModel):
    """Request model for LEGO model retrieval."""
    
    prompt: str = Field(..., description="Natural language description of desired LEGO model")
    max_results: int = Field(default=10, ge=1, le=50, description="Maximum number of search results to return")
    include_variants: bool = Field(default=True, description="Whether to include model variants in search")


class ModelRetrievalResponse(BaseModel):
    """Response model for LEGO model retrieval."""
    
    success: bool = Field(..., description="Whether the retrieval was successful")
    message: str = Field(..., description="Human-readable message about the result")
    search_results: List["SearchResultResponse"] = Field(default_factory=list, description="Search results found")
    selected_result: Optional["SearchResultResponse"] = Field(None, description="Selected result")
    variants_found: List["ModelVariantResponse"] = Field(default_factory=list, description="Available variants")
    selected_variant: Optional["ModelVariantResponse"] = Field(None, description="Selected variant")
    download_url: Optional[str] = Field(None, description="Download URL for the selected variant")
    error_details: Optional[str] = Field(None, description="Detailed error information if failed")
    processing_time_seconds: float = Field(..., description="Time taken to process the request")


class SearchResultResponse(BaseModel):
    """Response model for individual search results."""
    
    set_number: str = Field(..., description="LEGO set number")
    name: str = Field(..., description="Set name")
    theme: str = Field(..., description="Set theme")
    year: Optional[int] = Field(None, description="Release year")
    detail_url: str = Field(..., description="URL to set detail page")
    relevance_score: float = Field(..., description="Relevance score (0-1)")


class ModelVariantResponse(BaseModel):
    """Response model for model variants."""
    
    name: str = Field(..., description="Variant name")
    download_url: str = Field(..., description="Download URL")
    file_type: str = Field(..., description="File type (mpd, zip)")
    relevance_score: float = Field(..., description="Relevance score")


class PromptAnalysisRequest(BaseModel):
    """Request model for prompt analysis."""
    
    prompt: str = Field(..., description="Natural language prompt to analyze")


class PromptAnalysisResponse(BaseModel):
    """Response model for prompt analysis."""
    
    theme: str = Field(..., description="Main theme extracted from prompt")
    colors: List[str] = Field(..., description="Colors mentioned in prompt")
    constraints: List[str] = Field(..., description="Size or complexity constraints")
    keywords: List[str] = Field(..., description="All relevant keywords for search")


class HealthResponse(BaseModel):
    """Health check response."""
    
    status: str = Field(..., description="Service status")
    version: str = Field(..., description="Service version")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class WebSocketMessage(BaseModel):
    """WebSocket message model."""
    
    type: str = Field(..., description="Message type")
    data: dict = Field(..., description="Message data")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class InstructionGenerationRequest(BaseModel):
    """Request model for instruction generation."""
    
    prompt: str = Field(..., description="Natural language description of desired LEGO model")
    max_results: int = Field(default=10, ge=1, le=50, description="Maximum number of search results to return")


class InstructionGenerationResponse(BaseModel):
    """Response model for complete model retrieval with instructions."""
    
    success: bool = Field(..., description="Whether the complete process was successful")
    message: str = Field(..., description="Human-readable message about the result")
    summary: str = Field(..., description="Summary of the complete process")
    
    # Model retrieval results
    search_results: List["SearchResultResponse"] = Field(default_factory=list, description="Search results found")
    selected_result: Optional["SearchResultResponse"] = Field(None, description="Selected result")
    variants_found: List["ModelVariantResponse"] = Field(default_factory=list, description="Available variants")
    selected_variant: Optional["ModelVariantResponse"] = Field(None, description="Selected variant")
    download_url: Optional[str] = Field(None, description="Download URL for the selected variant")
    downloaded_file_path: Optional[str] = Field(None, description="Local path to downloaded MPD file")
    
    # Instruction generation results
    instruction_success: bool = Field(..., description="Whether instruction generation was successful")
    instruction_error: Optional[str] = Field(None, description="Instruction generation error message")
    step_images: List[str] = Field(default_factory=list, description="Paths to step instruction images")
    bom_csv: Optional[str] = Field(None, description="Path to BOM CSV file")
    html_export: Optional[str] = Field(None, description="Path to HTML export directory")
    pdf_instructions: Optional[str] = Field(None, description="Path to PDF instruction manual")
    step_count: int = Field(default=0, description="Number of steps found in the model")
    
    error_details: Optional[str] = Field(None, description="Detailed error information if failed")
    processing_time_seconds: float = Field(..., description="Time taken to process the request")


# Update forward references
ModelRetrievalResponse.model_rebuild()
