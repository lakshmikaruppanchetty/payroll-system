import os, time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

options = webdriver.ChromeOptions()
options.add_argument('--headless')
options.set_capability('goog:loggingPrefs', {'browser': 'ALL'})
driver = webdriver.Chrome(options=options)

current_dir = os.path.dirname(os.path.abspath(__file__))
driver.get(f"file://{current_dir}/index.html")
time.sleep(2)
logs = driver.get_log('browser')
print("CONSOLE LOGS BEFORE ACTION:", logs)

driver.execute_script("document.getElementById('empName').value = 'Selenium Test User';")
driver.execute_script("if(document.getElementById('branchName')) { document.getElementById('branchName').style.display = 'block'; document.getElementById('branchName').value = 'Automated HQ'; }")
driver.execute_script("document.getElementById('workDate').value = '2026-05-15'")
driver.execute_script("document.getElementById('s1start').value = '09:00'")
driver.execute_script("document.getElementById('s1end').value = '17:00'")
time.sleep(1)
driver.execute_script("document.getElementById('mainBtn').click()")
time.sleep(1)

logs = driver.get_log('browser')
for l in logs:
    print(l)
