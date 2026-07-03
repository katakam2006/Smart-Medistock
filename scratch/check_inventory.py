import mysql.connector

try:
    conn = mysql.connector.connect(
        host="localhost",
        user="root",
        password="Hemasrikotha@07",
        database="smart_medistock"
    )
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("SELECT COUNT(*) AS count, SUM(no_of_units) as total_units FROM medicines")
    row = cursor.fetchone()
    print("TOTAL MEDICINES IN DB:", row)
    
    # Check by hospital block offset ranges
    # 1. Sai Hospital: 1 to 4000
    cursor.execute("SELECT COUNT(*) AS count, SUM(no_of_units) as total_units FROM medicines WHERE CAST(SUBSTRING(medicine_id, 5) AS UNSIGNED) BETWEEN 1 AND 4000")
    print("SAI HOSPITAL (1-4000) IN DB:", cursor.fetchone())
    
    # 2. City Medical Clinic: 4001 to 8000
    cursor.execute("SELECT COUNT(*) AS count, SUM(no_of_units) as total_units FROM medicines WHERE CAST(SUBSTRING(medicine_id, 5) AS UNSIGNED) BETWEEN 4001 AND 8000")
    print("CITY MEDICAL CLINIC (4001-8000) IN DB:", cursor.fetchone())
    
    # 3. Pules Hospital: 8001 to 12000
    cursor.execute("SELECT COUNT(*) AS count, SUM(no_of_units) as total_units FROM medicines WHERE CAST(SUBSTRING(medicine_id, 5) AS UNSIGNED) BETWEEN 8001 AND 12000")
    print("PULES HOSPITAL (8001-12000) IN DB:", cursor.fetchone())

    cursor.close()
    conn.close()
except Exception as e:
    print("Error:", e)
