"""PDF instruction generation service for LEGO models."""

import asyncio
import os
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any

from PIL import Image
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image as RLImage, Table, TableStyle, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

from .config import Config
from .models import InstructionGenerationResult, OMRSearchResult


class PDFInstructionService:
    """Service for generating PDF instruction manuals from step images and BOM."""
    
    def __init__(self, config: Config):
        self.config = config
        self.page_size = A4  # Use A4 for better international compatibility
        self.margin = 0.75 * inch
        self.image_width = 7.5 * inch  # Leave room for margins
        self.image_height = 5.625 * inch  # 16:9 aspect ratio
        
    async def generate_pdf_instructions(
        self,
        step_images: List[str],
        bom_csv_path: Optional[str],
        model_info: Optional[OMRSearchResult] = None,
        output_dir: Path = None
    ) -> Dict[str, Any]:
        """
        Generate a PDF instruction manual from step images and BOM.
        
        Args:
            step_images: List of paths to step instruction images
            bom_csv_path: Path to BOM CSV file
            model_info: Model information for cover page
            output_dir: Output directory for the PDF
            
        Returns:
            Dict with success status, PDF path, and error message if any
        """
        result = {
            "success": False,
            "pdf_path": None,
            "error_message": None
        }
        
        try:
            # Validate inputs
            if not step_images:
                result["error_message"] = "No step images provided"
                return result
                
            # Use provided output_dir or default
            if output_dir is None:
                output_dir = self.config.output_dir / "instructions"
            
            # Ensure output directory exists
            output_dir.mkdir(parents=True, exist_ok=True)
            
            # Generate PDF filename
            pdf_filename = self._generate_pdf_filename(model_info)
            pdf_path = output_dir / pdf_filename
            
            print(f"📄 Generating PDF instructions...")
            print(f"   Output: {pdf_path}")
            print(f"   Steps: {len(step_images)}")
            print(f"   BOM: {'Yes' if bom_csv_path else 'No'}")
            
            # Create PDF document
            doc = SimpleDocTemplate(
                str(pdf_path),
                pagesize=self.page_size,
                rightMargin=self.margin,
                leftMargin=self.margin,
                topMargin=self.margin,
                bottomMargin=self.margin
            )
            
            # Build PDF content
            story = []
            
            # Skip cover page - go directly to step images
            # story.extend(self._create_cover_page(model_info))
            # story.append(PageBreak())
            
            # Add step images
            story.extend(self._create_step_pages(step_images))
            
            # Add BOM if available
            if bom_csv_path and os.path.exists(bom_csv_path):
                story.append(PageBreak())
                story.extend(self._create_bom_page(bom_csv_path))
            
            # Build PDF
            print(f"   📝 Building PDF document...")
            doc.build(story)
            
            # Verify PDF was created successfully
            if pdf_path.exists() and pdf_path.stat().st_size > 0:
                result["success"] = True
                result["pdf_path"] = str(pdf_path)
                print(f"   ✅ PDF created successfully: {pdf_path}")
                print(f"   📊 File size: {pdf_path.stat().st_size / 1024:.1f} KB")
            else:
                result["error_message"] = "PDF file was not created or is empty"
                
        except Exception as e:
            result["error_message"] = f"Error generating PDF: {str(e)}"
            print(f"   ❌ PDF generation failed: {result['error_message']}")
            
        return result
    
    def _generate_pdf_filename(self, model_info: Optional[OMRSearchResult]) -> str:
        """Generate a descriptive filename for the PDF."""
        if model_info:
            # Clean filename: remove special characters and limit length
            name = model_info.name.replace(" ", "_").replace("/", "_").replace("\\", "_")
            name = "".join(c for c in name if c.isalnum() or c in "_-")
            name = name[:50]  # Limit length
            return f"{model_info.set_number}_{name}_Instructions.pdf"
        else:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            return f"LEGO_Instructions_{timestamp}.pdf"
    
    def _create_cover_page(self, model_info: Optional[OMRSearchResult]) -> List:
        """Create the cover page content."""
        story = []
        styles = getSampleStyleSheet()
        
        # Title style
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Title'],
            fontSize=24,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=colors.red
        )
        
        # Subtitle style
        subtitle_style = ParagraphStyle(
            'CustomSubtitle',
            parent=styles['Heading2'],
            fontSize=16,
            spaceAfter=20,
            alignment=TA_CENTER,
            textColor=colors.darkblue
        )
        
        # Add spacing from top
        story.append(Spacer(1, 2 * inch))
        
        # Add LEGO logo/branding
        story.append(Paragraph("🧱", title_style))
        story.append(Spacer(1, 0.5 * inch))
        
        # Add title
        if model_info:
            story.append(Paragraph(f"LEGO {model_info.set_number}", title_style))
            story.append(Paragraph(model_info.name, subtitle_style))
            story.append(Paragraph(f"Theme: {model_info.theme}", styles['Normal']))
            if model_info.year:
                story.append(Paragraph(f"Year: {model_info.year}", styles['Normal']))
        else:
            story.append(Paragraph("LEGO Building Instructions", title_style))
        
        story.append(Spacer(1, 1 * inch))
        
        # Add generation info
        generated_style = ParagraphStyle(
            'GeneratedInfo',
            parent=styles['Normal'],
            fontSize=10,
            alignment=TA_CENTER,
            textColor=colors.grey
        )
        
        story.append(Paragraph(
            f"Generated by Brick Kit on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}",
            generated_style
        ))
        
        return story
    
    def _create_step_pages(self, step_images: List[str]) -> List:
        """Create pages for each step image."""
        story = []
        styles = getSampleStyleSheet()
        
        # Step title style
        step_style = ParagraphStyle(
            'StepTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=20,
            alignment=TA_CENTER,
            textColor=colors.darkblue
        )
        
        for i, image_path in enumerate(step_images, 1):
            try:
                # Add step title
                story.append(Paragraph(f"Step {i}", step_style))
                story.append(Spacer(1, 0.2 * inch))
                
                # Add step image
                if os.path.exists(image_path):
                    # Resize image to fit page while maintaining aspect ratio
                    img = self._resize_image_for_pdf(image_path)
                    story.append(img)
                else:
                    story.append(Paragraph(f"Image not found: {image_path}", styles['Normal']))
                
                # Add spacing between steps
                if i < len(step_images):
                    story.append(Spacer(1, 0.5 * inch))
                    
            except Exception as e:
                print(f"   ⚠️  Error processing step {i}: {e}")
                story.append(Paragraph(f"Error loading step {i} image", styles['Normal']))
        
        return story
    
    def _create_bom_page(self, bom_csv_path: str) -> List:
        """Create the Bill of Materials page."""
        story = []
        styles = getSampleStyleSheet()
        
        # BOM title
        bom_title_style = ParagraphStyle(
            'BOMTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=20,
            alignment=TA_CENTER,
            textColor=colors.darkblue
        )
        
        story.append(Paragraph("Bill of Materials", bom_title_style))
        story.append(Spacer(1, 0.3 * inch))
        
        try:
            # Read BOM CSV
            bom_data = self._read_bom_csv(bom_csv_path)
            
            if bom_data:
                # Create table
                table_data = [["Part Name", "Color", "Quantity", "Part ID"]]
                table_data.extend(bom_data)
                
                # Create table with proper styling
                table = Table(table_data, colWidths=[3*inch, 1*inch, 0.8*inch, 1.2*inch])
                table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 10),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                    ('FONTSIZE', (0, 1), (-1, -1), 8),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black)
                ]))
                
                story.append(table)
            else:
                story.append(Paragraph("No BOM data available", styles['Normal']))
                
        except Exception as e:
            print(f"   ⚠️  Error reading BOM: {e}")
            story.append(Paragraph(f"Error loading BOM: {str(e)}", styles['Normal']))
        
        return story
    
    def _resize_image_for_pdf(self, image_path: str) -> RLImage:
        """Resize image to fit PDF page while maintaining aspect ratio."""
        try:
            # Open image to get dimensions
            with Image.open(image_path) as img:
                img_width, img_height = img.size
                
            # Calculate scaling factor
            scale_x = self.image_width / img_width
            scale_y = self.image_height / img_height
            scale = min(scale_x, scale_y)  # Use smaller scale to fit both dimensions
            
            # Calculate final dimensions
            final_width = img_width * scale
            final_height = img_height * scale
            
            # Create ReportLab Image
            rl_img = RLImage(image_path, width=final_width, height=final_height)
            
            return rl_img
            
        except Exception as e:
            print(f"   ⚠️  Error resizing image {image_path}: {e}")
            # Return a placeholder if image processing fails
            return RLImage(image_path, width=self.image_width, height=self.image_height)
    
    def _read_bom_csv(self, csv_path: str) -> List[List[str]]:
        """Read BOM CSV and return data as list of lists."""
        try:
            import csv
            bom_data = []
            
            with open(csv_path, 'r', encoding='utf-8') as f:
                reader = csv.reader(f)
                next(reader)  # Skip header row
                
                for row in reader:
                    if len(row) >= 4:  # Ensure we have at least the required columns
                        # Truncate part names that are too long
                        part_name = row[0][:40] + "..." if len(row[0]) > 40 else row[0]
                        bom_data.append([part_name, row[1], row[2], row[3]])
            
            return bom_data
            
        except Exception as e:
            print(f"   ⚠️  Error reading BOM CSV: {e}")
            return []
