from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
import time
import os

options = Options()
options.add_argument('--headless')
driver = webdriver.Chrome(options=options)
url = "file://" + os.path.abspath("index.html")
driver.get(url)

driver.execute_script("localStorage.setItem('onboardingComplete_v20', 'true');")
driver.execute_script("localStorage.setItem('payroll_v20', '[{\"id\":1,\"date\":\"2026-05-15\",\"name\":\"Alice\",\"branch\":\"Branch A\",\"s1s\":\"10:00\",\"s1e\":\"11:00\",\"rate\":25,\"total\":1,\"pay\":\"25.00\"}]');")
driver.refresh()
time.sleep(1)

# Turn off the branch summary
driver.execute_script("document.getElementById('toggleBranchSummary').checked = false; saveSettings();")
time.sleep(1)
emp_vis = driver.find_element(By.ID, "employeeSummarySection").is_displayed()
branch_vis = driver.find_element(By.ID, "branchSummarySection").is_displayed()
print(f"Off -> Employee Table: {emp_vis}, Branch Table: {branch_vis}")

# Turn on Branch Summary
driver.execute_script("document.getElementById('toggleBranchSummary').checked = true; saveSettings();")
time.sleep(1)
emp_vis2 = driver.find_element(By.ID, "employeeSummarySection").is_displayed()
branch_vis2 = driver.find_element(By.ID, "branchSummarySection").is_displayed()
print(f"On -> Employee Table: {emp_vis2}, Branch Table: {branch_vis2}")

driver.quit()
