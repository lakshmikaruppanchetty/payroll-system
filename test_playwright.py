import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto("file:///Users/aravindviswanathan/projects/payroll-system/index.html")
        await page.evaluate("localStorage.setItem('onboardingComplete_v20', 'true');")
        await page.reload()
        
        # Test toggling showBranchSummary
        is_employee_summary_visible = await page.evaluate("document.getElementById('employeeSummarySection').style.display !== 'none'")
        print("Initial employee summary visible:", is_employee_summary_visible)
        
        await page.evaluate("document.getElementById('toggleBranchSummary').checked = false; saveSettings();")
        
        is_branch_summary_visible = await page.evaluate("document.getElementById('branchSummarySection').style.display !== 'none'")
        print("After turning off toggleBranchSummary, branch summary visible:", is_branch_summary_visible)
        
        is_employee_summary_visible2 = await page.evaluate("document.getElementById('employeeSummarySection').style.display !== 'none'")
        print("After turning off toggleBranchSummary, employee summary visible:", is_employee_summary_visible2)
        
        await browser.close()

asyncio.run(run())
