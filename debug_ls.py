import os, time
from selenium import webdriver

options = webdriver.ChromeOptions()
options.add_argument('--headless')
driver = webdriver.Chrome(options=options)

current_dir = os.path.dirname(os.path.abspath(__file__))
driver.get(f"file://{current_dir}/index.html")
time.sleep(1)

try:
    driver.execute_script("document.getElementById('empName').value = 'Selenium Test User';")
    driver.execute_script("document.getElementById('branchName').style.display = 'block'; document.getElementById('branchName').value = 'Automated HQ';")
    driver.execute_script("document.getElementById('workDate').value = '2026-05-15'")
    driver.execute_script("document.getElementById('s1start').value = '09:00'")
    driver.execute_script("document.getElementById('s1end').value = '17:00'")
    time.sleep(1)
    driver.execute_script("document.getElementById('mainBtn').click()")
    time.sleep(1)
    res = driver.execute_script("return localStorage.getItem('payroll_v20');")
    print("LOCAL STORAGE PAYROLL_V20:", res)
    bdy = driver.execute_script("return document.getElementById('dailyTableBody').innerText;")
    print("BODY TEXT:", bdy)
except Exception as e:
    print("PYTHON ERROR: ", e)
