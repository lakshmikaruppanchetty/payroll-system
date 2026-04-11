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
        self.driver = webdriver.Chrome(options=options)
            
        current_dir = os.path.dirname(os.path.abspath(__file__))
        self.file_path = f"file://{current_dir}/index.html"
        self.driver.get(self.file_path)
        self.driver.execute_script("window.localStorage.clear(); window.localStorage.setItem('onboardingComplete_v20', 'true');")
        self.driver.refresh()

    def test_end_to_end_employee_entry(self):
        driver = self.driver
        # Turn off settings to ensure DOM elements are fully visible without feature tabs
        driver.execute_script("document.getElementById('empName').value = 'Selenium Test User';")
        driver.execute_script("if(document.getElementById('branchName')) { document.getElementById('branchName').style.display = 'block'; document.getElementById('branchName').value = 'Automated HQ'; }")
        driver.execute_script("document.getElementById('workDate').value = '2026-05-15'")
        driver.execute_script("document.getElementById('s1start').value = '09:00'")
        driver.execute_script("document.getElementById('s1end').value = '17:00'")
        
        time.sleep(1) 
        driver.execute_script("document.getElementById('mainBtn').click()")
        
        time.sleep(1)
        res = driver.execute_script("return localStorage.getItem('payroll_v20');")
        print("LS DUMP:", res)
        filters = driver.execute_script("return { eS: document.getElementById('empSelect').value, vF: document.getElementById('viewFilter').value, sD: document.getElementById('filterStartDate').value, eD: document.getElementById('filterEndDate').value };")
        print("FILTERS IN DOM:", filters)
        print("BODY HTML:", driver.find_element(By.ID, "dailyTableBody").get_attribute("innerHTML"))
        print("LOGS:", driver.get_log('browser'))

if __name__ == '__main__':
    unittest.main()
