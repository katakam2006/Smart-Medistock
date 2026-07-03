import mysql.connector

try:
    conn = mysql.connector.connect(
        host="localhost",
        user="root",
        password="Hemasrikotha@07",
        database="smart_medistock"
    )
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM purchase_orders")
    rows = cursor.fetchall()
    print("=== purchase_orders ===")
    for row in rows:
        print(row)
    conn.close()
except Exception as e:
    print("Error:", e)
