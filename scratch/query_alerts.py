import mysql.connector

try:
    conn = mysql.connector.connect(
        host="localhost",
        user="root",
        password="Hemasrikotha@07",
        database="smart_medistock"
    )
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM inventory_alerts")
    rows = cursor.fetchall()
    print("=== inventory_alerts ===")
    for row in rows:
        print(row)
    
    cursor.execute("SELECT * FROM medicines LIMIT 10")
    meds = cursor.fetchall()
    print("\n=== medicines (10) ===")
    for med in meds:
        print(med)
        
    conn.close()
except Exception as e:
    print("Error:", e)
