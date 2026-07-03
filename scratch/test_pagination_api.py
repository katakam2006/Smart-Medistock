import requests  # type: ignore

API_BASE = 'http://localhost:3000'

def test_api():
    print("Testing /api/medicines with limit=10 and offset=0...")
    res = requests.get(f"{API_BASE}/api/medicines", params={
        'limit': 10,
        'offset': 0,
        'hospital_name': 'sai hospital'
    })
    print(f"Status: {res.status_code}")
    print(f"Headers: {dict(res.headers)}")
    data = res.json()
    print(f"Returned items: {len(data)}")
    if data:
        print("First item sample:")
        print(data[0])

    print("\nTesting /api/medicines with limit=10 and offset=10...")
    res2 = requests.get(f"{API_BASE}/api/medicines", params={
        'limit': 10,
        'offset': 10,
        'hospital_name': 'sai hospital'
    })
    data2 = res2.json()
    print(f"Returned items: {len(data2)}")
    if data2:
        print("First item sample (page 2):")
        print(data2[0])

    print("\nTesting search query on medicines...")
    res3 = requests.get(f"{API_BASE}/api/medicines", params={
        'limit': 10,
        'offset': 0,
        'search': 'Amox',
        'hospital_name': 'sai hospital'
    })
    data3 = res3.json()
    print(f"Search results for 'Amox': {len(data3)}")
    if data3:
        print("First search item:")
        print(data3[0])

if __name__ == '__main__':
    test_api()
