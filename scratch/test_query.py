import mysql.connector
import pandas as pd

try:
    conn = mysql.connector.connect(
        host="localhost",
        user="root",
        password="Hemasrikotha@07",
        database="smart_medistock"
    )
    query = """
        SELECT 
            MIN(medicine_id) AS 'Medicine ID', 
            medicine_name AS 'Medicine Name', 
            MAX(category) AS 'Category', 
            MAX(dosage) AS 'Dosage', 
            MAX(manufacture_date) AS 'Manufacture Date', 
            MAX(expiry_date) AS 'Expiry Date', 
            AVG(price) AS 'Price ($)', 
            SUM(no_of_units) AS 'No. of Units', 
            SUM(stock_out_units) AS 'Stock Out Units' 
        FROM medicines 
        GROUP BY medicine_name
    """
    df = pd.read_sql(query, conn)
    print("Columns:", df.columns.tolist())
    print("Shape:", df.shape)
    print("First 3 rows:")
    print(df.head(3))
    conn.close()
except Exception as e:
    print("Error:", e)
