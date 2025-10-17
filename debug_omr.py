"""Debug script to test OMR search directly."""

import asyncio
from playwright.async_api import async_playwright


async def debug_omr_search():
    """Debug the OMR search to see what's happening."""
    search_url = "https://library.ldraw.org/omr/sets?search=car"
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)  # Show browser for debugging
        page = await browser.new_page()
        
        try:
            print(f"Navigating to: {search_url}")
            await page.goto(search_url, wait_until='networkidle')
            
            print("Page loaded, waiting for content...")
            await page.wait_for_timeout(5000)  # Wait 5 seconds
            
            # Take a screenshot to see what we're getting
            await page.screenshot(path="omr_debug.png")
            print("Screenshot saved as omr_debug.png")
            
            # Check what elements are on the page
            print("\n=== Page Content Analysis ===")
            
            # Check for tables
            tables = await page.query_selector_all('table')
            print(f"Found {len(tables)} tables")
            
            # Check for any elements with "car" in them
            car_elements = await page.query_selector_all('*:has-text("car")')
            print(f"Found {len(car_elements)} elements containing 'car'")
            
            # Check for any result-like elements
            result_selectors = [
                'table tbody tr',
                '.table tbody tr', 
                '[data-testid="result"]',
                '.result-item',
                '.set-item',
                'tr',
                '.row'
            ]
            
            for selector in result_selectors:
                elements = await page.query_selector_all(selector)
                if elements:
                    print(f"Found {len(elements)} elements with selector: {selector}")
                    if len(elements) <= 5:  # Show first few
                        for i, elem in enumerate(elements[:3]):
                            text = await elem.text_content()
                            print(f"  Element {i+1}: {text[:100]}...")
            
            # Get page HTML to analyze
            html = await page.content()
            print(f"\nPage HTML length: {len(html)} characters")
            
            # Look for specific patterns
            if "No results" in html or "no results" in html:
                print("❌ Page contains 'No results' message")
            elif "car" in html.lower():
                print("✅ Page contains 'car' text")
            else:
                print("❓ Page doesn't contain 'car' text")
            
            # Check if it's a JavaScript app
            if "livewire" in html.lower() or "alpine" in html.lower():
                print("✅ Detected JavaScript framework (Livewire/Alpine)")
            
        except Exception as e:
            print(f"Error: {e}")
        finally:
            await browser.close()


if __name__ == "__main__":
    asyncio.run(debug_omr_search())
