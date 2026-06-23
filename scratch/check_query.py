import mysql.connector
import pandas as pd
import sys

try:
    conn = mysql.connector.connect(
        host="localhost",
        user="root",
        password="Hemasrikotha@07",
        database="smart_medistock"
    )
    query = """
        SELECT 
            m.medicine_id AS 'Medicine ID', 
            m.medicine_name AS 'Medicine Name', 
            m.category AS 'Category', 
            m.dosage AS 'Dosage', 
            m.manufacture_date AS 'Manufacture Date', 
            m.expiry_date AS 'Expiry Date', 
            m.price AS 'Price ($)', 
            m.no_of_units AS 'No. of Units', 
            m.stock_out_units AS 'Stock Out Units',
            t.record_count AS 'Record Count'
        FROM medicines m
        JOIN (
            SELECT MIN(medicine_id) as min_id, COUNT(*) as record_count 
            FROM medicines 
            GROUP BY medicine_name
        ) t ON m.medicine_id = t.min_id
        LIMIT 5
    """
    df = pd.read_sql(query, conn)
    print(df)
    conn.close()
except Exception as e:
    print(f"Error: {e}")
