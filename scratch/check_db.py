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
    alerts = cursor.fetchall()
    print("ALL ALERTS:")
    for a in alerts:
        print(a)
        
    cursor.close()
    conn.close()
except Exception as e:
    print("Error:", e)
