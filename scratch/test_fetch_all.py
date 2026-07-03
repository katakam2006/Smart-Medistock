import requests

API_BASE = 'http://localhost:3000'
HOSPITAL_NAME = 'city medical clinic'

res = requests.get(f"{API_BASE}/api/medicines", params={
    'limit': 4000,
    'hospital_name': HOSPITAL_NAME
})
print("STATUS CODE:", res.status_code)
data = res.json()
print("TOTAL RETURNED ITEMS FROM API:", len(data))
if data:
    print("FIRST ITEM:", data[0])
    print("LAST ITEM:", data[-1])
