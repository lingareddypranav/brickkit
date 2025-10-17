"""LeoCAD integration service for generating LEGO model instructions."""

import asyncio
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import List, Optional, Tuple

from .config import Config
from .models import InstructionGenerationResult
from .pdf_instruction_service import PDFInstructionService


class LeoCADService:
    """Service for generating instructions using LeoCAD CLI."""
    
    def __init__(self, config: Config):
        self.config = config
        self.ldraw_path = config.ldraw_path or self._find_ldraw_path()
        self._leocad_executable = None
        self.pdf_service = PDFInstructionService(config)
        
    def _find_ldraw_path(self) -> Optional[str]:
        """Find the LDraw library path on the system."""
        # Common LDraw installation paths on macOS
        possible_paths = [
            "/Applications/LDraw",
            "/usr/local/share/LDraw",
            "/opt/homebrew/share/LDraw",
            "/usr/share/LDraw",
            os.path.expanduser("~/LDraw"),
            os.path.expanduser("~/Library/Application Support/LDraw"),
            "/Users/pranavlingareddy/Desktop/ldraw",  # User's specific path
        ]
        
        for path in possible_paths:
            if os.path.exists(path) and os.path.exists(os.path.join(path, "parts")):
                return path
                
        # Try to find via environment variable
        ldraw_env = os.getenv("LDRAW_PATH")
        if ldraw_env and os.path.exists(ldraw_env):
            return ldraw_env
            
        return None
    
    def _check_leocad_available(self) -> bool:
        """Check if LeoCAD CLI is available."""
        # Try different LeoCAD executable paths
        leocad_paths = [
            "leocad",  # If in PATH
            "/Applications/LeoCAD.app/Contents/MacOS/LeoCAD",  # macOS app bundle
            "/usr/local/bin/leocad",  # Homebrew
            "/opt/homebrew/bin/leocad",  # Apple Silicon Homebrew
        ]
        
        for leocad_path in leocad_paths:
            try:
                result = subprocess.run(
                    [leocad_path, "--version"], 
                    capture_output=True, 
                    text=True, 
                    timeout=10
                )
                if result.returncode == 0:
                    # Store the working path for later use
                    self._leocad_executable = leocad_path
                    return True
            except (subprocess.TimeoutExpired, FileNotFoundError):
                continue
        
        return False
    
    def _check_mpd_has_steps(self, mpd_path: str) -> Tuple[bool, int]:
        """Check if MPD file has step markers and count them."""
        try:
            with open(mpd_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                step_markers = content.count('0 STEP')
                # Also count part placements (lines starting with "1 ")
                part_placements = content.count('\n1 ')
                print(f"   MPD analysis: {step_markers} step markers, {part_placements} part placements")
                return step_markers > 0, step_markers
        except Exception as e:
            print(f"Error reading MPD file: {e}")
            return False, 0
    
    def _cleanup_old_outputs(self, current_mpd_path: str = None):
        """Clean up old output files to prevent interference between builds."""
        try:
            print(f"🧹 Cleaning up old output files...")
            
            # Clean up instructions directory
            instructions_dir = self.config.output_dir / "instructions"
            if instructions_dir.exists():
                # Remove all PDF files
                for pdf_file in instructions_dir.glob("*.pdf"):
                    pdf_file.unlink()
                    print(f"   🗑️  Removed old PDF: {pdf_file.name}")
                
                # Remove BOM CSV
                bom_file = instructions_dir / "bom.csv"
                if bom_file.exists():
                    bom_file.unlink()
                    print(f"   🗑️  Removed old BOM: {bom_file.name}")
                
                # Clean up steps directory
                steps_dir = instructions_dir / "steps"
                if steps_dir.exists():
                    for step_file in steps_dir.glob("*.png"):
                        step_file.unlink()
                    print(f"   🗑️  Removed old step images")
            
            # Clean up ALL old MPD files (remove all previous models)
            # But don't remove the current model file if it's being processed
            mpd_files = list(self.config.output_dir.glob("*.mpd"))
            if current_mpd_path:
                current_mpd_path_obj = Path(current_mpd_path)
                for mpd_file in mpd_files:
                    # Don't remove the current model file if it's the one being processed
                    if mpd_file.resolve() != current_mpd_path_obj.resolve():
                        mpd_file.unlink()
                        print(f"   🗑️  Removed old MPD: {mpd_file.name}")
                    else:
                        print(f"   ⏭️  Keeping current MPD: {mpd_file.name}")
            else:
                # If no current MPD path provided, remove all MPD files
                for mpd_file in mpd_files:
                    mpd_file.unlink()
                    print(f"   🗑️  Removed old MPD: {mpd_file.name}")
            
            # Also clean up frontend model files
            frontend_models_dir = Path(__file__).parent.parent.parent / "brick-linkfrontend" / "public" / "ldraw" / "models"
            frontend_models_dir = frontend_models_dir.resolve()  # Use absolute path
            if frontend_models_dir.exists():
                for frontend_mpd in frontend_models_dir.glob("*.mpd"):
                    # Keep the original demo files and recently generated files
                    protected_names = ("red_race_car", "geometric_test", "simple_test", "single_part_test", "ultra_simple")
                    if not frontend_mpd.name.startswith(protected_names):
                        # Check if this is a recently generated file (less than 1 hour old)
                        file_age_hours = (time.time() - frontend_mpd.stat().st_mtime) / 3600
                        if file_age_hours > 1:  # Only delete files older than 1 hour
                            try:
                                frontend_mpd.unlink()
                                print(f"   🗑️  Removed old frontend MPD: {frontend_mpd.name}")
                            except Exception as e:
                                print(f"   ⚠️  Could not remove {frontend_mpd.name}: {e}")
                        else:
                            print(f"   ⏭️  Keeping recent frontend MPD: {frontend_mpd.name}")
            
            print(f"   ✅ Cleanup completed")
            
        except Exception as e:
            print(f"   ⚠️  Cleanup warning: {e}")

    def _clean_filename(self, filename: str) -> str:
        """Clean filename to be safe for file systems and URLs."""
        import re
        
        # Remove or replace problematic characters
        clean = filename
        
        # Remove special characters that cause issues
        clean = re.sub(r'[{}()\[\]<>:"/\\|?*]', '', clean)
        
        # Replace spaces and common separators with single underscores
        clean = re.sub(r'[\s,;]+', '_', clean)
        
        # Remove apostrophes and quotes
        clean = clean.replace("'", "").replace('"', '')
        
        # Remove exclamation marks and other punctuation
        clean = clean.replace("!", "").replace("?", "").replace(".", "")
        
        # Remove multiple consecutive underscores
        clean = re.sub(r'_+', '_', clean)
        
        # Remove leading/trailing underscores
        clean = clean.strip('_')
        
        # Ensure it's not empty and not too long
        if not clean:
            clean = "model"
        elif len(clean) > 50:
            clean = clean[:50].rstrip('_')
        
        return clean

    async def generate_instructions(self, mpd_path: str, model_info=None) -> InstructionGenerationResult:
        """Generate instructions from an MPD file using LeoCAD."""
        print(f"🚀 Starting instruction generation for: {mpd_path}")
        
        # Don't cleanup during instruction generation - only on refresh button
        
        result = InstructionGenerationResult(
            success=False,
            error_message=None,
            step_images=[],
            bom_csv=None,
            html_export=None,
            step_count=0
        )
        
        # Check if LeoCAD is available
        if not self._check_leocad_available():
            result.error_message = "LeoCAD CLI not found. Please install LeoCAD and ensure it's in your PATH."
            return result
        
        # Check if LDraw library is available
        if not self.ldraw_path:
            result.error_message = "LDraw library not found. Please install LDraw or set LDRAW_PATH environment variable."
            return result
        
        # Check if MPD file exists
        if not os.path.exists(mpd_path):
            result.error_message = f"MPD file not found: {mpd_path}"
            return result
        
        # Check if MPD has steps
        print(f"🔍 Checking MPD file for steps...")
        has_steps, step_count = self._check_mpd_has_steps(mpd_path)
        result.step_count = step_count
        print(f"   Found {step_count} steps in MPD file")
        
        if not has_steps:
            print(f"   ⚠️  No steps found - will only generate BOM")
            result.error_message = "Instructions not possible: model has no steps (0 STEP markers)."
            # Still try to generate BOM
            bom_result = await self._export_bom(mpd_path)
            if bom_result["success"]:
                result.bom_csv = bom_result["bom_csv"]
                result.success = True  # Partial success
            
            # Copy model to frontend regardless of instruction success
            self._copy_model_to_frontend(mpd_path)
            
            print(f"\n🎉 === INSTRUCTION GENERATION COMPLETE ===")
            return result
        
        # Create instructions directory
        print(f"📁 Creating output directories...")
        instructions_dir = self.config.output_dir / "instructions"
        steps_dir = instructions_dir / "steps"
        steps_dir.mkdir(parents=True, exist_ok=True)
        print(f"   Instructions dir: {instructions_dir}")
        print(f"   Steps dir: {steps_dir}")
        
        # Export step images
        print(f"\n🎨 === STEP IMAGE GENERATION ===")
        step_result = await self._export_step_images(mpd_path, str(steps_dir), step_count)
        if step_result["success"]:
            result.step_images = step_result["step_images"]
            print(f"✅ Generated {len(result.step_images)} step images")
        else:
            result.error_message = step_result["error_message"]
            print(f"❌ Step image generation failed: {result.error_message}")
            return result
        
        # Export BOM
        print(f"\n📋 === BOM GENERATION ===")
        bom_result = await self._export_bom(mpd_path)
        if bom_result["success"]:
            result.bom_csv = bom_result["bom_csv"]
        
        # Generate PDF instructions
        if self.config.generate_pdf:
            print(f"\n📄 === PDF GENERATION ===")
            pdf_result = await self.pdf_service.generate_pdf_instructions(
                step_images=result.step_images,
                bom_csv_path=result.bom_csv,
                model_info=model_info,
                output_dir=instructions_dir
            )
            if pdf_result["success"]:
                result.pdf_instructions = pdf_result["pdf_path"]
                print(f"   ✅ PDF instructions created: {result.pdf_instructions}")
            else:
                print(f"   ⚠️  PDF generation failed: {pdf_result['error_message']}")
        else:
            print(f"\n📄 === PDF GENERATION ===")
            print(f"   ⏭️  PDF generation disabled in configuration")
        
        # Skip HTML export - it causes infinite hanging
        print(f"\n🌐 === HTML EXPORT ===")
        print(f"   ⏭️  Skipping HTML export (causes infinite hanging)")
        result.html_export = None
        
        # Copy model to frontend public directory for immediate display
        if mpd_path:
            print(f"🔄 About to copy model to frontend: {mpd_path}")
            copy_result = self._copy_model_to_frontend(mpd_path)
            if copy_result:
                print(f"✅ Model copy successful: {copy_result}")
            else:
                print(f"❌ Model copy failed")
        
        print(f"\n🎉 === INSTRUCTION GENERATION COMPLETE ===")
        result.success = True
        return result
    
    def _copy_model_to_frontend(self, mpd_path: str):
        """Copy the generated MPD file to the frontend's public directory for immediate display."""
        print(f"🔄 Starting model copy to frontend: {mpd_path}")
        print(f"   Source file exists: {os.path.exists(mpd_path)}")
        print(f"   Current working directory: {os.getcwd()}")
        print(f"   __file__ location: {__file__}")
        
        # Add a simple test to verify this function is being called
        print(f"   🧪 FUNCTION CALLED - This should appear in logs")
        
        try:
            # Define frontend public directory path
            frontend_public_dir = Path(__file__).parent.parent.parent / "brick-linkfrontend" / "public" / "ldraw" / "models"
            
            print(f"   Calculated frontend dir: {frontend_public_dir}")
            print(f"   Frontend dir absolute: {frontend_public_dir.absolute()}")
            print(f"   Frontend dir exists: {frontend_public_dir.exists()}")
            
            # Ensure the directory exists
            frontend_public_dir.mkdir(parents=True, exist_ok=True)
            print(f"   Directory created/verified: {frontend_public_dir.exists()}")
            
            # Create a clean filename for the frontend
            source_file = Path(mpd_path)
            print(f"   Source file absolute: {source_file.absolute()}")
            print(f"   Source file exists: {source_file.exists()}")
            
            clean_name = self._clean_filename(source_file.stem)
            frontend_filename = f"{clean_name}.mpd"
            frontend_path = frontend_public_dir / frontend_filename
            
            print(f"   Clean name: {clean_name}")
            print(f"   Target path: {frontend_path}")
            print(f"   Target absolute: {frontend_path.absolute()}")
            
            # Check if target already exists
            if frontend_path.exists():
                print(f"   ⚠️  Target file already exists, removing...")
                frontend_path.unlink()
            
            # Copy the file
            print(f"   📋 Executing copy operation...")
            print(f"   Source: {source_file}")
            print(f"   Target: {frontend_path}")
            
            try:
                shutil.copy2(source_file, frontend_path)
                print(f"   ✅ shutil.copy2 completed without exception")
            except Exception as copy_error:
                print(f"   ❌ shutil.copy2 failed: {copy_error}")
                raise copy_error
            
            # Verify the copy
            print(f"   ✅ Copy operation completed")
            print(f"   Target exists after copy: {frontend_path.exists()}")
            if frontend_path.exists():
                print(f"   Target file size: {frontend_path.stat().st_size} bytes")
                print(f"   Source file size: {source_file.stat().st_size} bytes")
            else:
                print(f"   ❌ CRITICAL: Target file does not exist after copy!")
            
            print(f"📁 Copied model to frontend: {frontend_path}")
            print(f"   Frontend URL: /ldraw/models/{frontend_filename}")
            
            return str(frontend_path)
            
        except Exception as e:
            print(f"⚠️  Failed to copy model to frontend: {e}")
            print(f"   Exception type: {type(e).__name__}")
            import traceback
            print(f"   Traceback: {traceback.format_exc()}")
            return None
    
    async def _monitor_step_generation(self, output_dir: str, expected_steps: int):
        """Monitor step image generation progress."""
        last_count = 0
        start_time = asyncio.get_event_loop().time()
        
        while True:
            try:
                # Count step images
                step_files = [f for f in os.listdir(output_dir) if f.startswith('step') and f.endswith('.png')]
                current_count = len(step_files)
                
                if current_count > last_count:
                    elapsed = asyncio.get_event_loop().time() - start_time
                    print(f"   📸 Generated step {current_count}: {step_files[-1] if step_files else 'unknown'} (elapsed: {elapsed:.1f}s)")
                    last_count = current_count
                elif current_count > 0:
                    # Show progress every 10 seconds even if no new steps
                    elapsed = asyncio.get_event_loop().time() - start_time
                    if int(elapsed) % 10 == 0 and int(elapsed) > 0:
                        print(f"   ⏳ Still processing... {current_count} steps generated so far (elapsed: {elapsed:.1f}s)")
                
                await asyncio.sleep(2)  # Check every 2 seconds
            except asyncio.CancelledError:
                break
            except Exception:
                # Ignore errors in monitoring
                await asyncio.sleep(2)
    
    async def _export_step_images(self, mpd_path: str, output_dir: str, step_count: int) -> dict:
        """Export step images from LeoCAD."""
        result = {"success": False, "error_message": None, "step_images": []}
        
        try:
            print(f"🎨 Starting step image generation...")
            print(f"   Input: {mpd_path}")
            print(f"   Output: {output_dir}")
            print(f"   LeoCAD: {self._leocad_executable}")
            print(f"   LDraw: {self.ldraw_path}")
            
            # LeoCAD command for exporting step images
            # Use a reasonable limit that allows natural completion
            # Based on testing: step 10 is usually the final step, so 20 is a safe upper bound
            cmd = [
                self._leocad_executable,
                "-l", self.ldraw_path,
                mpd_path,
                "-i", os.path.join(output_dir, "step.png"),
                "-w", "1280",
                "-h", "720", 
                "-f", "1",
                "-t", "15",  # Limit to 15 steps (step 10 is final, so 15 is safe)
                "--fade-steps",
                "--highlight",
                "--viewpoint", "home"
            ]
            
            print(f"🚀 Running LeoCAD command...")
            print(f"   Command: {' '.join(cmd)}")
            
            # Run LeoCAD command with real-time output and timeout
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            # Stream output in real-time
            print(f"⏳ LeoCAD is processing... (timeout: {self.config.leocad_timeout}s)")
            print(f"   Monitoring step generation progress...")
            
            # Start monitoring step files for progress updates (lightweight)
            step_monitor_task = asyncio.create_task(self._monitor_step_generation(output_dir, step_count))
            
            # Read output line by line
            stdout_lines = []
            stderr_lines = []
            
            async def read_stdout():
                while True:
                    line = await process.stdout.readline()
                    if not line:
                        break
                    line_str = line.decode().strip()
                    stdout_lines.append(line_str)
                    if line_str:  # Only print non-empty lines
                        if "Saved '" in line_str and ".png'" in line_str:
                            # This is a completion message from LeoCAD
                            print(f"   ✅ {line_str}")
                        else:
                            print(f"   📝 {line_str}")
            
            async def read_stderr():
                while True:
                    line = await process.stderr.readline()
                    if not line:
                        break
                    line_str = line.decode().strip()
                    stderr_lines.append(line_str)
                    if line_str:  # Only print non-empty lines
                        print(f"   ⚠️  {line_str}")
            
            try:
                # Read both streams concurrently with timeout
                await asyncio.wait_for(
                    asyncio.gather(read_stdout(), read_stderr()),
                    timeout=self.config.leocad_timeout
                )
                
                # Cancel the monitoring task
                step_monitor_task.cancel()
                
                # Wait for process to complete - this is crucial!
                print(f"   ⏳ Waiting for LeoCAD to complete...")
                return_code = await process.wait()
                print(f"   ✅ LeoCAD process completed with exit code: {return_code}")
                
            except asyncio.TimeoutError:
                print(f"   ⏰ LeoCAD process timed out after {self.config.leocad_timeout}s")
                print(f"   🔪 Terminating LeoCAD process...")
                process.terminate()
                try:
                    await asyncio.wait_for(process.wait(), timeout=5)
                except asyncio.TimeoutError:
                    print(f"   💀 Force killing LeoCAD process...")
                    process.kill()
                    await process.wait()
                
                step_monitor_task.cancel()
                result["error_message"] = f"LeoCAD process timed out after {self.config.leocad_timeout} seconds"
                return result
            
            stdout = '\n'.join(stdout_lines)
            stderr = '\n'.join(stderr_lines)
            
            if process.returncode != 0:
                error_msg = stderr.decode() if stderr else "Unknown error"
                result["error_message"] = f"LeoCAD export failed: {error_msg}"
                return result
            
            # Check for generated images
            step_images = []
            for file in os.listdir(output_dir):
                if file.startswith("step") and file.endswith(".png"):
                    step_images.append(os.path.join(output_dir, file))
            
            if not step_images:
                result["error_message"] = "No instructions exported—this usually means the MPD has no steps."
                return result
            
            # Sort images by name to ensure correct order
            step_images.sort()
            
            # Check for minimum file size (1KB)
            valid_images = []
            for img_path in step_images:
                if os.path.getsize(img_path) > 1024:  # 1KB
                    valid_images.append(img_path)
            
            if not valid_images:
                result["error_message"] = "All exported images are empty or corrupted."
                return result
            
            result["success"] = True
            result["step_images"] = valid_images
            
        except Exception as e:
            result["error_message"] = f"Error exporting step images: {str(e)}"
        
        return result
    
    async def _export_bom(self, mpd_path: str) -> dict:
        """Export BOM CSV from LeoCAD."""
        result = {"success": False, "error_message": None, "bom_csv": None}
        
        try:
            print(f"📋 Generating BOM CSV...")
            
            instructions_dir = self.config.output_dir / "instructions"
            instructions_dir.mkdir(parents=True, exist_ok=True)
            
            bom_path = instructions_dir / "bom.csv"
            
            cmd = [
                self._leocad_executable,
                "-l", self.ldraw_path,
                mpd_path,
                "--export-csv", str(bom_path)
            ]
            
            print(f"   Command: {' '.join(cmd)}")
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                error_msg = stderr.decode() if stderr else "Unknown error"
                result["error_message"] = f"LeoCAD BOM export failed: {error_msg}"
                return result
            
            if os.path.exists(bom_path) and os.path.getsize(bom_path) > 0:
                result["success"] = True
                result["bom_csv"] = str(bom_path)
                print(f"   ✅ BOM CSV created: {bom_path}")
            else:
                result["error_message"] = "BOM CSV file was not created or is empty"
                print(f"   ❌ BOM CSV creation failed")
                
        except Exception as e:
            result["error_message"] = f"Error exporting BOM: {str(e)}"
        
        return result
    
    async def _export_html(self, mpd_path: str, output_dir: str) -> dict:
        """Export HTML package from LeoCAD (optional)."""
        result = {"success": False, "error_message": None, "html_export": None}
        
        try:
            print(f"🌐 Generating HTML export...")
            
            html_dir = os.path.join(output_dir, "html")
            
            cmd = [
                self._leocad_executable,
                "-l", self.ldraw_path,
                mpd_path,
                "--export-html", html_dir
            ]
            
            print(f"   Command: {' '.join(cmd)}")
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            # Use a shorter timeout for HTML export since it tends to hang
            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=25  # 25 second timeout
                )
            except asyncio.TimeoutError:
                print(f"   ⏰ HTML export process timed out - terminating")
                process.terminate()
                try:
                    await asyncio.wait_for(process.wait(), timeout=5)
                except asyncio.TimeoutError:
                    process.kill()
                    await process.wait()
                result["error_message"] = "HTML export timed out"
                return result
            
            if process.returncode != 0:
                # HTML export is optional, so we don't fail the whole process
                result["error_message"] = f"HTML export failed: {stderr.decode() if stderr else 'Unknown error'}"
                return result
            
            if os.path.exists(html_dir):
                result["success"] = True
                result["html_export"] = html_dir
                print(f"   ✅ HTML export created: {html_dir}")
            else:
                print(f"   ❌ HTML export creation failed")
                
        except Exception as e:
            result["error_message"] = f"Error exporting HTML: {str(e)}"
        
        return result
