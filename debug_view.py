import os, time
from selenium import webdriver
from selenium.webdriver.common.by import By

options = webdriver.ChromeOptions()
options.add_argument('--headless=new')
driver = webdriver.Chrome(options=options)
current_dir = os.path.dirname(os.path.abspath(__file__))
driver.get(f"file://{current_dir}/index.html")
driver.execute_script("window.localStorage.clear(); window.localStorage.setItem('onboardingComplete_v20', 'true');")
driver.refresh()
time.sleep(1)

driver.execute_script("document.getElementById('empName').value = 'Selenium Test User';")
driver.execute_script("document.getElementById('workDate').value = '2026-05-15'")
driver.execute_script("document.getElementById('s1start').value = '09:00'")
driver.execute_script("document.getElementById('s1end').value = '17:00'")
time.sleep(1)
driver.execute_script("document.getElementById('mainBtn').click()")
time.sleep(1)

display = driver.execute_script("return window.getComputedStyle(document.getElementById('payrollView')).display;")
print("DISPLAY OF PAYROLLVIEW: ", display)
print("BODY HTML:", driver.find_element(By.ID, "dailyTableBody").get_attribute("innerHTML"))
print("BODY TEXT (len):", len(driver.find_element(By.ID, "dailyTableBody").text))
