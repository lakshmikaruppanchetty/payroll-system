import os, time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.common.exceptions import UnexpectedAlertPresentException

options = webdriver.ChromeOptions()
options.add_argument('--headless')
driver = webdriver.Chrome(options=options)

current_dir = os.path.dirname(os.path.abspath(__file__))
driver.get(f"file://{current_dir}/index.html")
time.sleep(1)

# do the same steps
driver.execute_script("document.getElementById('empName').value = 'Selenium Test User';")
driver.execute_script("if(document.getElementById('branchName')) { document.getElementById('branchName').style.display = 'block'; document.getElementById('branchName').value = 'Automated HQ'; }")
driver.execute_script("document.getElementById('workDate').value = '2026-05-15'")
driver.execute_script("document.getElementById('s1start').value = '09:00'")
driver.execute_script("document.getElementById('s1end').value = '17:00'")
time.sleep(1)

try:
    driver.execute_script("document.getElementById('mainBtn').click()")
    time.sleep(1)
    print("BODY TEXT:", driver.find_element(By.ID, "dailyTableBody").text)
except UnexpectedAlertPresentException as e:
    print("ALERT WAS PRESENT!", e.alert_text)
except Exception as e:
    print("OTHER ERROR", e)
