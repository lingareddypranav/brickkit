# PDF Instruction Generation

This document describes the PDF instruction generation feature for Brick Kit, which consolidates all LEGO building instructions into a single, professional PDF file.

## Overview

The PDF generation feature creates a comprehensive instruction manual that includes:
- **Step-by-step instructions** with high-quality images (starts immediately)
- **Bill of Materials (BOM)** with part inventory
- **Professional formatting** suitable for printing

## Architecture

### Components

1. **PDFInstructionService** (`src/pdf_instruction_service.py`)
   - Core PDF generation logic
   - Handles image resizing and layout
   - Creates professional document structure

2. **LeoCADService Integration** (`src/leocad_service.py`)
   - Integrated PDF generation into instruction workflow
   - Passes model information to PDF service

3. **Configuration** (`src/config.py`)
   - PDF generation settings
   - Page size and image dimension options

4. **Data Models** (`src/models.py`, `src/api/models.py`)
   - Updated to include PDF path in results

## Features

### PDF Content
- **Step Pages**: Each step on its own page with clear numbering (starts immediately)
- **BOM Table**: Organized parts list with colors and quantities
- **Professional Styling**: Clean, focused formatting for easy building

### Configuration Options
- `generate_pdf`: Enable/disable PDF generation (default: true)
- `pdf_page_size`: Page size - "A4" or "Letter" (default: "A4")
- `pdf_image_width`: Image width in inches (default: 7.5)
- `pdf_image_height`: Image height in inches (default: 5.625)

### Environment Variables
```bash
GENERATE_PDF=true
PDF_PAGE_SIZE=A4
PDF_IMAGE_WIDTH=7.5
PDF_IMAGE_HEIGHT=5.625
```

## Usage

### Frontend Integration
The PDF generation is fully integrated with the API and ready for frontend download functionality. The API response includes the `pdf_instructions` path that can be used to serve the PDF file to users.

### Automatic Generation
PDFs are automatically generated when using the complete instruction generation endpoint:

```bash
curl -X POST "http://localhost:8000/api/v1/retrieve-model-with-instructions" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "red race car"}'
```

The response will include:
```json
{
  "pdf_instructions": "/path/to/instructions/1477-1_Red_Race_Car_Instructions.pdf",
  "step_images": [...],
  "bom_csv": "/path/to/instructions/bom.csv"
}
```

### Manual Testing
Test PDF generation with existing step images:

```bash
python test_pdf_generation.py
```

### Installation and Setup
Install dependencies and run tests:

```bash
python install_and_test_pdf.py
```

## File Structure

```
omr_output/
├── instructions/
│   ├── steps/
│   │   ├── step01.png
│   │   ├── step02.png
│   │   └── ...
│   ├── bom.csv
│   └── 1477-1_Red_Race_Car_Instructions.pdf  # Generated PDF
└── 1477-1_Red_Race_Car.mpd
```

## Technical Details

### Dependencies
- `reportlab>=4.0.0`: PDF generation library
- `Pillow>=10.0.0`: Image processing

### Image Processing
- Automatic resizing to fit page dimensions
- Aspect ratio preservation
- Quality optimization for print

### Error Handling
- Graceful fallback if PDF generation fails
- Detailed error messages
- Continues with other instruction formats

### Performance
- Asynchronous PDF generation
- Efficient image processing
- Minimal memory footprint

## Troubleshooting

### Common Issues

1. **PDF not generated**
   - Check `generate_pdf` configuration
   - Verify step images exist
   - Check file permissions

2. **Empty or corrupted PDF**
   - Verify image files are valid
   - Check available disk space
   - Review error logs

3. **Large file sizes**
   - Adjust image dimensions in config
   - Consider image compression
   - Use different page size

### Debug Mode
Enable detailed logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Future Enhancements

### Planned Features
- **Interactive PDFs**: Clickable navigation
- **3D Model Integration**: Embed 3D viewer
- **Custom Templates**: User-defined layouts
- **Batch Processing**: Multiple models at once
- **Cloud Storage**: Direct upload to cloud services

### Advanced Options
- **Watermarking**: Add custom watermarks
- **Multi-language**: Support for different languages
- **Accessibility**: Screen reader compatibility
- **Print Optimization**: Bleed marks and crop lines

## API Reference

### PDFInstructionService

#### `generate_pdf_instructions()`
```python
async def generate_pdf_instructions(
    step_images: List[str],
    bom_csv_path: Optional[str],
    model_info: Optional[OMRSearchResult] = None,
    output_dir: Path = None
) -> Dict[str, Any]
```

**Parameters:**
- `step_images`: List of step image file paths
- `bom_csv_path`: Path to BOM CSV file
- `model_info`: Model information for cover page
- `output_dir`: Output directory for PDF

**Returns:**
- `success`: Boolean indicating success
- `pdf_path`: Path to generated PDF file
- `error_message`: Error details if failed

## Contributing

### Development Setup
1. Install dependencies: `pip install -r requirements.txt`
2. Run tests: `python test_pdf_generation.py`
3. Test with real data: Use existing step images

### Code Style
- Follow existing code patterns
- Add comprehensive error handling
- Include docstrings for all methods
- Write tests for new features

### Testing
- Test with various image sizes
- Verify PDF content and formatting
- Test error conditions
- Validate file permissions
