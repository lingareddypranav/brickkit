#!/usr/bin/env python3
"""Test script for LeoCAD integration."""

import asyncio
import os
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from src.config import Config
from src.leocad_service import LeoCADService


async def test_leocad_service():
    """Test the LeoCAD service functionality."""
    print("🧪 Testing LeoCAD Service Integration")
    print("=" * 50)
    
    # Load configuration
    config = Config.from_env()
    service = LeoCADService(config)
    
    # Test 1: Check if LeoCAD is available
    print("1. Checking LeoCAD availability...")
    leocad_available = service._check_leocad_available()
    print(f"   LeoCAD CLI available: {'✅' if leocad_available else '❌'}")
    
    if leocad_available:
        print(f"   LeoCAD executable: {service._leocad_executable}")
    else:
        print("   ⚠️  LeoCAD CLI not found. Please install LeoCAD and ensure it's in your PATH.")
        print("   On macOS: brew install leocad")
        return False
    
    # Test 2: Check LDraw library
    print("\n2. Checking LDraw library...")
    ldraw_path = service.ldraw_path
    print(f"   LDraw path: {ldraw_path or 'Not found'}")
    
    if ldraw_path:
        # Check if parts directory exists
        parts_dir = os.path.join(ldraw_path, "parts")
        parts_exists = os.path.exists(parts_dir)
        print(f"   Parts directory exists: {'✅' if parts_exists else '❌'}")
        if parts_exists:
            try:
                part_count = len([f for f in os.listdir(parts_dir) if f.endswith('.dat')])
                print(f"   Number of part files: {part_count}")
            except PermissionError:
                print("   ⚠️  Permission denied accessing parts directory")
    
    if not ldraw_path:
        print("   ⚠️  LDraw library not found. Please install LDraw or set LDRAW_PATH environment variable.")
        print("   Download from: https://www.ldraw.org/")
        return False
    
    # Test 3: Check if we have any existing MPD files to test with
    print("\n3. Looking for existing MPD files to test...")
    output_dir = config.output_dir
    mpd_files = list(output_dir.glob("*.mpd"))
    
    if not mpd_files:
        print("   No MPD files found in output directory.")
        print("   Please run the model retrieval first to download a model.")
        return False
    
    # Test with the first MPD file
    test_mpd = mpd_files[0]
    print(f"   Testing with: {test_mpd.name}")
    
    # Test 4: Check if MPD has steps
    print("\n4. Checking MPD file for steps...")
    has_steps, step_count = service._check_mpd_has_steps(str(test_mpd))
    print(f"   Has steps: {'✅' if has_steps else '❌'}")
    print(f"   Step count: {step_count}")
    
    if not has_steps:
        print("   ⚠️  This MPD file has no steps, so instruction generation will be limited.")
    
    # Test 5: Try to generate instructions
    print("\n5. Testing instruction generation...")
    try:
        result = await service.generate_instructions(str(test_mpd))
        
        print(f"   Success: {'✅' if result.success else '❌'}")
        
        if result.success:
            print(f"   Step images: {len(result.step_images)} files")
            print(f"   BOM CSV: {'✅' if result.bom_csv else '❌'}")
            print(f"   HTML export: {'✅' if result.html_export else '❌'}")
            print(f"   Step count: {result.step_count}")
            
            if result.step_images:
                print(f"   Step images location: {os.path.dirname(result.step_images[0])}")
        else:
            print(f"   Error: {result.error_message}")
            
    except Exception as e:
        print(f"   ❌ Error during instruction generation: {e}")
        return False
    
    print("\n✅ LeoCAD integration test completed!")
    return True


async def main():
    """Main test function."""
    success = await test_leocad_service()
    
    if success:
        print("\n🎉 All tests passed! LeoCAD integration is working.")
        print("\nYou can now use the --instructions flag with the CLI:")
        print("python -m src.cli 'small red car' --instructions")
    else:
        print("\n❌ Some tests failed. Please check the requirements:")
        print("1. Install LeoCAD: brew install leocad")
        print("2. Install LDraw library from https://www.ldraw.org/")
        print("3. Set LDRAW_PATH environment variable if needed")
        print("4. Download a model first: python -m src.cli 'small red car'")


if __name__ == "__main__":
    asyncio.run(main())
