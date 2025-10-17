"""Detailed debug script to see exactly what's in the OMR table."""

import asyncio
from playwright.async_api import async_playwright


async def debug_detailed():
    """Debug the OMR search to see exactly what's in the table."""
    search_url = "https://library.ldraw.org/omr/sets?search=car"
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()
        
        try:
            print(f"Navigating to: {search_url}")
            await page.goto(search_url, wait_until='networkidle')
            
            print("Page loaded, waiting for content...")
            await page.wait_for_timeout(5000)
            
            # Get detailed table information
            table_info = await page.evaluate("""
                () => {
                    const table = document.querySelector('table');
                    if (!table) {
                        return { error: 'No table found' };
                    }
                    
                    const tbody = table.querySelector('tbody');
                    if (!tbody) {
                        return { error: 'No tbody found' };
                    }
                    
                    const rows = tbody.querySelectorAll('tr');
                    console.log('Found', rows.length, 'rows in tbody');
                    
                    const results = [];
                    for (let i = 0; i < Math.min(rows.length, 5); i++) {
                        const row = rows[i];
                        const cells = row.querySelectorAll('td');
                        
                        const rowData = {
                            rowIndex: i,
                            cellCount: cells.length,
                            cells: []
                        };
                        
                        for (let j = 0; j < cells.length; j++) {
                            const cell = cells[j];
                            rowData.cells.push({
                                index: j,
                                text: cell.textContent?.trim() || '',
                                html: cell.innerHTML,
                                hasLink: !!cell.querySelector('a')
                            });
                        }
                        
                        results.push(rowData);
                    }
                    
                    return {
                        totalRows: rows.length,
                        sampleRows: results
                    };
                }
            """)
            
            print(f"\n=== Table Analysis ===")
            if 'error' in table_info:
                print(f"❌ {table_info['error']}")
            else:
                print(f"✅ Found {table_info['totalRows']} rows in table")
                print(f"Sample of first {len(table_info['sampleRows'])} rows:")
                
                for row in table_info['sampleRows']:
                    print(f"\nRow {row['rowIndex']} ({row['cellCount']} cells):")
                    for cell in row['cells']:
                        print(f"  Cell {cell['index']}: '{cell['text']}' (has link: {cell['hasLink']})")
                        if cell['text'] and len(cell['text']) > 50:
                            print(f"    Full text: {cell['text'][:100]}...")
            
        except Exception as e:
            print(f"Error: {e}")
        finally:
            await browser.close()


if __name__ == "__main__":
    asyncio.run(debug_detailed())
