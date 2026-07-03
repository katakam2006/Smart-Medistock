import requests

url = "http://localhost:3000/api/login"
payload = {
    "username": "pandu",
    "password": "pandu@07"
}

try:
    response = requests.post(url, json=payload)
    print("Status Code:", response.status_code)
    print("Response JSON:", response.json())
except Exception as e:
    print("Error:", e)
