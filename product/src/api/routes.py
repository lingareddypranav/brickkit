"""FastAPI routes for Brick Kit API."""

import asyncio
import time
from typing import Dict, Any

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, StreamingResponse

from .models import (
    ModelRetrievalRequest,
    ModelRetrievalResponse,
    PromptAnalysisRequest,
    PromptAnalysisResponse,
    HealthResponse,
    WebSocketMessage,
    SearchResultResponse,
    ModelVariantResponse,
    InstructionGenerationRequest,
    InstructionGenerationResponse,
)
from ..agent import LegoModelRetrievalAgent
from ..config import Config


class ConnectionManager:
    """Manages WebSocket connections for real-time updates."""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
    
    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
    
    async def send_message(self, client_id: str, message: WebSocketMessage):
        if client_id in self.active_connections:
            websocket = self.active_connections[client_id]
            try:
                await websocket.send_json(message.model_dump())
            except Exception:
                # Connection might be closed, remove it
                self.disconnect(client_id)


# Global connection manager
manager = ConnectionManager()

# Create router
router = APIRouter()

# Global agent instance (will be initialized in main.py)
agent: LegoModelRetrievalAgent = None


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        version="0.1.0"
    )


@router.post("/analyze-prompt", response_model=PromptAnalysisResponse)
async def analyze_prompt(request: PromptAnalysisRequest):
    """Analyze a user prompt to extract structured information."""
    if not agent:
        raise HTTPException(status_code=503, detail="Agent not initialized")
    
    try:
        analysis = await agent.omr_service.analyze_prompt(request.prompt)
        return PromptAnalysisResponse(
            theme=analysis.theme,
            colors=analysis.colors,
            constraints=analysis.constraints,
            keywords=analysis.keywords
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing prompt: {str(e)}")


@router.post("/retrieve-model", response_model=ModelRetrievalResponse)
async def retrieve_model(request: ModelRetrievalRequest):
    """Retrieve a LEGO model based on user prompt."""
    if not agent:
        raise HTTPException(status_code=503, detail="Agent not initialized")
    
    start_time = time.time()
    
    try:
        # Run the agent
        result = await agent.retrieve_model(request.prompt)
        
        processing_time = time.time() - start_time
        
        # Convert to API response format
        search_results = [
            SearchResultResponse(
                set_number=r.set_number,
                name=r.name,
                theme=r.theme,
                year=r.year,
                detail_url=r.detail_url,
                relevance_score=r.relevance_score
            )
            for r in result.search_results[:request.max_results]
        ]
        
        selected_result = None
        if result.selected_result:
            selected_result = SearchResultResponse(
                set_number=result.selected_result.set_number,
                name=result.selected_result.name,
                theme=result.selected_result.theme,
                year=result.selected_result.year,
                detail_url=result.selected_result.detail_url,
                relevance_score=result.selected_result.relevance_score
            )
        
        variants_found = [
            ModelVariantResponse(
                name=v.name,
                download_url=v.download_url,
                file_type=v.file_type,
                relevance_score=v.relevance_score
            )
            for v in result.variants_found
        ]
        
        selected_variant = None
        if result.selected_variant:
            selected_variant = ModelVariantResponse(
                name=result.selected_variant.name,
                download_url=result.selected_variant.download_url,
                file_type=result.selected_variant.file_type,
                relevance_score=result.selected_variant.relevance_score
            )
        
        return ModelRetrievalResponse(
            success=result.success,
            message="Model found successfully" if result.success else result.error_message or "Unknown error",
            search_results=search_results,
            selected_result=selected_result,
            variants_found=variants_found,
            selected_variant=selected_variant,
            download_url=result.download_url,
            error_details=result.error_message if not result.success else None,
            processing_time_seconds=processing_time
        )
        
    except Exception as e:
        processing_time = time.time() - start_time
        raise HTTPException(
            status_code=500, 
            detail=f"Error retrieving model: {str(e)}",
            headers={"X-Processing-Time": str(processing_time)}
        )


@router.post("/retrieve-model-with-instructions", response_model=InstructionGenerationResponse)
async def retrieve_model_with_instructions(request: InstructionGenerationRequest):
    """Retrieve a LEGO model and generate instructions."""
    if not agent:
        raise HTTPException(status_code=503, detail="Agent not initialized")
    
    start_time = time.time()
    
    try:
        # Run the complete process
        result = await agent.retrieve_model_with_instructions(request.prompt)
        
        processing_time = time.time() - start_time
        
        # Convert to API response format
        search_results = [
            SearchResultResponse(
                set_number=r.set_number,
                name=r.name,
                theme=r.theme,
                year=r.year,
                detail_url=r.detail_url,
                relevance_score=r.relevance_score
            )
            for r in result.retrieval_result.search_results[:request.max_results]
        ]
        
        selected_result = None
        if result.retrieval_result.selected_result:
            selected_result = SearchResultResponse(
                set_number=result.retrieval_result.selected_result.set_number,
                name=result.retrieval_result.selected_result.name,
                theme=result.retrieval_result.selected_result.theme,
                year=result.retrieval_result.selected_result.year,
                detail_url=result.retrieval_result.selected_result.detail_url,
                relevance_score=result.retrieval_result.selected_result.relevance_score
            )
        
        variants_found = [
            ModelVariantResponse(
                name=v.name,
                download_url=v.download_url,
                file_type=v.file_type,
                relevance_score=v.relevance_score
            )
            for v in result.retrieval_result.variants_found
        ]
        
        selected_variant = None
        if result.retrieval_result.selected_variant:
            selected_variant = ModelVariantResponse(
                name=result.retrieval_result.selected_variant.name,
                download_url=result.retrieval_result.selected_variant.download_url,
                file_type=result.retrieval_result.selected_variant.file_type,
                relevance_score=result.retrieval_result.selected_variant.relevance_score
            )
        
        # Instruction results
        instruction_success = False
        instruction_error = None
        step_images = []
        bom_csv = None
        html_export = None
        pdf_instructions = None
        step_count = 0
        
        if result.instruction_result:
            instruction_success = result.instruction_result.success
            instruction_error = result.instruction_result.error_message
            step_images = result.instruction_result.step_images
            bom_csv = result.instruction_result.bom_csv
            html_export = result.instruction_result.html_export
            pdf_instructions = result.instruction_result.pdf_instructions
            step_count = result.instruction_result.step_count
        
        return InstructionGenerationResponse(
            success=result.retrieval_result.success and instruction_success,
            message="Model found and instructions generated successfully" if (result.retrieval_result.success and instruction_success) else result.retrieval_result.error_message or "Unknown error",
            summary=result.summary,
            search_results=search_results,
            selected_result=selected_result,
            variants_found=variants_found,
            selected_variant=selected_variant,
            download_url=result.retrieval_result.download_url,
            downloaded_file_path=result.retrieval_result.downloaded_file_path,
            instruction_success=instruction_success,
            instruction_error=instruction_error,
            step_images=step_images,
            bom_csv=bom_csv,
            html_export=html_export,
            pdf_instructions=pdf_instructions,
            step_count=step_count,
            error_details=result.retrieval_result.error_message if not result.retrieval_result.success else instruction_error,
            processing_time_seconds=processing_time
        )
        
    except Exception as e:
        processing_time = time.time() - start_time
        raise HTTPException(
            status_code=500, 
            detail=f"Error retrieving model with instructions: {str(e)}",
            headers={"X-Processing-Time": str(processing_time)}
        )


@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """WebSocket endpoint for real-time updates."""
    await manager.connect(websocket, client_id)
    
    try:
        while True:
            # Wait for messages from client
            data = await websocket.receive_json()
            
            # Handle different message types
            if data.get("type") == "retrieve_model":
                prompt = data.get("prompt", "")
                if prompt:
                    # Send progress updates
                    await manager.send_message(client_id, WebSocketMessage(
                        type="progress",
                        data={"message": "Analyzing prompt...", "step": 1, "total": 5}
                    ))
                    
                    # Run the agent with progress updates
                    result = await retrieve_model_with_progress(client_id, prompt)
                    
                    # Send final result
                    await manager.send_message(client_id, WebSocketMessage(
                        type="result",
                        data=result.model_dump()
                    ))
            
    except WebSocketDisconnect:
        manager.disconnect(client_id)
    except Exception as e:
        await manager.send_message(client_id, WebSocketMessage(
            type="error",
            data={"message": f"Error: {str(e)}"}
        ))
        manager.disconnect(client_id)


async def retrieve_model_with_progress(client_id: str, prompt: str):
    """Retrieve model with progress updates via WebSocket."""
    if not agent:
        raise HTTPException(status_code=503, detail="Agent not initialized")
    
    try:
        # Step 1: Analyze prompt
        await manager.send_message(client_id, WebSocketMessage(
            type="progress",
            data={"message": "Analyzing prompt...", "step": 1, "total": 5}
        ))
        
        analysis = await agent.omr_service.analyze_prompt(prompt)
        
        # Step 2: Search OMR
        await manager.send_message(client_id, WebSocketMessage(
            type="progress",
            data={"message": "Searching OMR database...", "step": 2, "total": 5}
        ))
        
        search_results = await agent.omr_service.search_omr(analysis)
        
        # Step 3: Get variants
        await manager.send_message(client_id, WebSocketMessage(
            type="progress",
            data={"message": "Finding model variants...", "step": 3, "total": 5}
        ))
        
        variants = []
        if search_results:
            variants = await agent.omr_service.get_model_variants(search_results[0])
        
        # Step 4: Download model
        await manager.send_message(client_id, WebSocketMessage(
            type="progress",
            data={"message": "Downloading model...", "step": 4, "total": 5}
        ))
        
        cached_file_path = None
        if variants:
            cached_file_path = await agent.omr_service.download_model(variants[0])
        
        # Step 5: Complete
        await manager.send_message(client_id, WebSocketMessage(
            type="progress",
            data={"message": "Processing complete!", "step": 5, "total": 5}
        ))
        
        # Return simplified result for WebSocket
        return {
            "success": bool(cached_file_path),
            "file_path": str(cached_file_path) if cached_file_path else None,
            "search_results_count": len(search_results),
            "variants_found": len(variants)
        }
        
    except Exception as e:
        await manager.send_message(client_id, WebSocketMessage(
            type="error",
            data={"message": f"Error: {str(e)}"}
        ))
        raise


@router.get("/download/{file_hash}")
async def download_cached_file(file_hash: str):
    """Download a cached model file."""
    if not agent:
        raise HTTPException(status_code=503, detail="Agent not initialized")
    
    try:
        # Look for files in the output directory
        output_dir = agent.config.output_dir
        files = list(output_dir.glob("*"))
        
        # Find file by hash or name
        target_file = None
        for file_path in files:
            if file_hash in file_path.name or file_path.name == file_hash:
                target_file = file_path
                break
        
        if not target_file or not target_file.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        # Determine media type based on file extension
        media_type = "application/octet-stream"
        if target_file.suffix == ".mpd":
            media_type = "text/plain"  # MPD files are text-based
        elif target_file.suffix == ".png":
            media_type = "image/png"
        elif target_file.suffix == ".csv":
            media_type = "text/csv"
        
        response = FileResponse(
            path=str(target_file),
            media_type=media_type,
            filename=target_file.name
        )
        
        # Add CORS headers for frontend access
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error downloading file: {str(e)}")


@router.post("/cleanup-outputs")
async def cleanup_outputs():
    """Clean up old output files to prevent interference between builds."""
    if not agent:
        raise HTTPException(status_code=503, detail="Agent not initialized")
    
    try:
        # Call the cleanup function from the LeoCAD service
        agent.leocad_service._cleanup_old_outputs()
        
        return {
            "success": True,
            "message": "Output files cleaned up successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error cleaning up files: {str(e)}")


@router.get("/download-pdf/{model_id}")
async def download_pdf(model_id: str):
    """Download PDF instructions for a specific model."""
    if not agent:
        raise HTTPException(status_code=503, detail="Agent not initialized")
    
    try:
        # Look for PDF files in the output directory
        output_dir = agent.config.output_dir / "instructions"
        pdf_files = list(output_dir.glob("*.pdf"))
        
        if not pdf_files:
            raise HTTPException(status_code=404, detail="No PDF instructions found")
        
        # Try to find a PDF that matches the model_id
        matching_pdf = None
        for pdf_file in pdf_files:
            if model_id in pdf_file.name:
                matching_pdf = pdf_file
                break
        
        # If no specific match, use the most recent PDF
        if not matching_pdf:
            matching_pdf = max(pdf_files, key=lambda f: f.stat().st_mtime)
        
        if not matching_pdf.exists():
            raise HTTPException(status_code=404, detail="PDF file not found")
        
        # Return the PDF file
        response = FileResponse(
            path=str(matching_pdf),
            media_type="application/pdf",
            filename=matching_pdf.name,
            headers={"Content-Disposition": f"attachment; filename={matching_pdf.name}"}
        )
        
        # Add CORS headers for frontend access
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error downloading PDF: {str(e)}")


def set_agent(agent_instance: LegoModelRetrievalAgent):
    """Set the global agent instance."""
    global agent
    agent = agent_instance
