"""Configuration management for Brick Kit."""

import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from pydantic import BaseModel, Field


class Config(BaseModel):
    """Configuration settings for the Brick Kit agent."""
    
    # API Keys
    openai_api_key: Optional[str] = Field(None, description="OpenAI API key")
    anthropic_api_key: Optional[str] = Field(None, description="Anthropic API key")
    google_api_key: Optional[str] = Field(None, description="Google API key")
    
    # Output settings
    output_dir: Path = Field(default=Path("omr_output"))
    
    # OMR settings
    omr_base_url: str = Field(default="https://library.ldraw.org/omr")
    omr_search_url: str = Field(default="https://library.ldraw.org/omr/sets")
    
    # Model settings
    default_model: str = Field(default="anthropic:claude-sonnet-4-5")
    temperature: float = Field(default=0.1, ge=0.0, le=2.0)
    max_tokens: int = Field(default=2000, gt=0)
    
    # LeoCAD settings
    ldraw_path: Optional[str] = Field(None, description="Path to LDraw library")
    leocad_timeout: int = Field(default=300, description="Timeout for LeoCAD operations in seconds (5 minutes)")
    
    # PDF generation settings
    generate_pdf: bool = Field(default=True, description="Whether to generate PDF instructions")
    pdf_page_size: str = Field(default="A4", description="PDF page size (A4, Letter)")
    pdf_image_width: float = Field(default=7.5, description="PDF image width in inches")
    pdf_image_height: float = Field(default=5.625, description="PDF image height in inches")
    
    @classmethod
    def from_env(cls) -> "Config":
        """Load configuration from environment variables."""
        load_dotenv()
        
        return cls(
            openai_api_key=os.getenv("OPENAI_API_KEY"),
            anthropic_api_key=os.getenv("ANTHROPIC_API_KEY"),
            google_api_key=os.getenv("GOOGLE_API_KEY"),
            output_dir=Path(os.getenv("OUTPUT_DIR", "omr_output")),
            omr_base_url=os.getenv("OMR_BASE_URL", "https://library.ldraw.org/omr"),
            omr_search_url=os.getenv("OMR_SEARCH_URL", "https://library.ldraw.org/omr/sets"),
            default_model=os.getenv("DEFAULT_MODEL", "anthropic:claude-sonnet-4-5"),
            temperature=float(os.getenv("TEMPERATURE", "0.1")),
            max_tokens=int(os.getenv("MAX_TOKENS", "2000")),
            ldraw_path=os.getenv("LDRAW_PATH"),
            leocad_timeout=int(os.getenv("LEOCAD_TIMEOUT", "60")),
            generate_pdf=os.getenv("GENERATE_PDF", "true").lower() == "true",
            pdf_page_size=os.getenv("PDF_PAGE_SIZE", "A4"),
            pdf_image_width=float(os.getenv("PDF_IMAGE_WIDTH", "7.5")),
            pdf_image_height=float(os.getenv("PDF_IMAGE_HEIGHT", "5.625")),
        )
    
    def ensure_output_dir(self) -> None:
        """Ensure the output directory exists."""
        self.output_dir.mkdir(parents=True, exist_ok=True)
