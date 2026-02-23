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
        options.add_argument('--headless=new')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--window-size=1920,1080')
        try:
            self.driver = webdriver.Chrome(options=options)
        except Exception as e:
            self.skipTest(f"ChromeDriver not found or configured on host machine. Skipping Selenium UI test. ({e})")
            
        current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.file_path = f"file://{current_dir}/index.html"
        self.driver.get(self.file_path)

    def test_app_loads_successfully(self):
        self.assertIn("Payroll Management", self.driver.title)
        
    def test_end_to_end_employee_entry(self):
        driver = self.driver
        wait = WebDriverWait(driver, 10)
        
        # Turn off settings to ensure DOM elements are fully visible without feature tabs
        driver.execute_script("document.getElementById('empName').value = 'Selenium Test User';")
        driver.execute_script("document.getElementById('branchName').style.display = 'block';")
        driver.execute_script("document.getElementById('branchName').value = 'Automated HQ';")
        driver.execute_script("document.getElementById('workDate').value = '2026-05-15'")
        driver.execute_script("document.getElementById('s1start').value = '09:00'")
        driver.execute_script("document.getElementById('s1end').value = '17:00'")
        
        # We also need to force trigger any 'onchange' listeners manually if we inject via JS
        # Wait for any async initializations that might be pending
        time.sleep(1) 
        
        # Click save
        driver.execute_script("document.getElementById('mainBtn').click()")
        
        # Wait for the table row to appear dynamically
        table_body = wait.until(EC.presence_of_element_located((By.ID, "dailyTableBody")))
        
        def safe_check(driver):
            return "Selenium Test User" in driver.find_element(By.ID, "dailyTableBody").text
        
        wait.until(safe_check)

        self.assertTrue("Selenium Test User" in table_body.text, "Employee Name not found in row")

    def tearDown(self):
        if hasattr(self, 'driver'):
            self.driver.quit()

if __name__ == "__main__":
    unittest.main()
