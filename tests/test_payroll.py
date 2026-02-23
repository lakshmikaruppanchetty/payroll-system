import unittest
import os
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class TestPayrollManagement(unittest.TestCase):
    def setUp(self):
        options = webdriver.ChromeOptions()
        options.add_argument('--headless')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        try:
            self.driver = webdriver.Chrome(options=options)
        except Exception as e:
            self.skipTest(f"ChromeDriver not found or configured on host machine. Skipping Selenium UI test. ({e})")
            
        # Dynamically load the absolute path to your static HTML file
        current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.file_path = f"file://{current_dir}/index.html"
        self.driver.get(self.file_path)
        self.driver.implicitly_wait(5)

    def test_app_loads_successfully(self):
        # Verify document title mounted successfully
        self.assertIn("Payroll Management", self.driver.title)
        
    def test_end_to_end_employee_entry(self):
        driver = self.driver
        
        # 1. Fill Employee Data
        emp_name = driver.find_element(By.ID, "empName")
        emp_name.send_keys("Selenium Test User")
        
        # 2. Fill Branch Data
        branch_name = driver.find_element(By.ID, "branchName")
        branch_name.send_keys("Automated HQ")
        
        # 3. Simulate Setting a Date
        # Usually webdrivers execute JavaScript to forcefully inject dates into native widgets
        driver.execute_script("document.getElementById('workDate').value = '2026-05-15'")
        
        # 4. Fill Shifts
        driver.find_element(By.ID, "s1start").send_keys("09:00")
        driver.find_element(By.ID, "s1end").send_keys("17:00")
        
        # 5. Push Valid Payload
        driver.find_element(By.ID, "mainBtn").click()
        
        # 6. Verify Log Table Live Rendering
        table_body = driver.find_element(By.ID, "dailyTableBody")
        self.assertIn("Selenium Test User", table_body.text)
        self.assertIn("Automated HQ", table_body.text)
        
        # 7. Verify Summary Pivot Table Updating
        summary_table = driver.find_element(By.ID, "summaryTable")
        self.assertIn("Selenium Test User", summary_table.text)

    def tearDown(self):
        if hasattr(self, 'driver'):
            self.driver.quit()

if __name__ == "__main__":
    unittest.main()
