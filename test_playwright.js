const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("file://" + __dirname + "/index.html");
  await page.evaluate("localStorage.setItem('onboardingComplete_v20', 'true');");
  await page.evaluate("let s = JSON.parse(localStorage.getItem('settings_v20') || '{}'); s.showBranch = true; localStorage.setItem('settings_v20', JSON.stringify(s));");
  await page.evaluate("localStorage.setItem('auditData_v20', '[{\"id\":1001,\"date\":\"2026-05-15\",\"branch\":\"\",\"opening\":\"10\",\"closing\":\"20\",\"sales\":[\"10\"],\"expenses\":\"0\"}]');");
  await page.reload();
  
  // Go to audit view
  await page.click('text=Cash & Tips Audit');
  await page.waitForTimeout(500);
  
  // Click edit
  await page.click('.btn-edit-small');
  await page.waitForTimeout(500);
  
  // Change branch to 'Branch X'
  await page.fill('#auditBranchName', 'Branch X');
  
  // Click update
  await page.click('#saveAuditBtn');
  await page.waitForTimeout(500);
  
  // Validate what happened
  const data = await page.evaluate("JSON.parse(localStorage.getItem('auditData_v20'))");
  console.log(data);
  await browser.close();
})();
