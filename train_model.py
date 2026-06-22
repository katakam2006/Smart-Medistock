import json
import os
import sys
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
import joblib
import mysql.connector

# Configuration
excel_path = "FINAL DATA SET WITH STOCK OUT.xlsx"
csv_path = "medicine_dataset_250k-v2_fixed.csv"
html_template_path = "Stocker With prediction.html"
output_file_name = "Smart_MediStock_Final_Dashboard.html"

def load_data_from_db(unique_only=False):
    """Attempts to connect to MySQL and load medicine records."""
    try:
        conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password="Hemasrikotha@07",
            database="smart_medistock"
        )
        if unique_only:
            # Optimized query returning only unique medicine names (aggregated)
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
        else:
            query = """
                SELECT 
                    medicine_id AS 'Medicine ID', 
                    medicine_name AS 'Medicine Name', 
                    category AS 'Category', 
                    dosage AS 'Dosage', 
                    manufacture_date AS 'Manufacture Date', 
                    expiry_date AS 'Expiry Date', 
                    price AS 'Price ($)', 
                    no_of_units AS 'No. of Units', 
                    stock_out_units AS 'Stock Out Units' 
                FROM medicines
            """
        df = pd.read_sql(query, conn)
        conn.close()
        if len(df) > 0:
            print(f"✅ Successfully loaded dataset (unique_only={unique_only}) from MySQL database.", file=sys.stderr)
            return df
        else:
            print("⚠️ MySQL database table 'medicines' is empty.", file=sys.stderr)
            return None
    except Exception as e:
        print(f"⚠️ MySQL connection or query failed: {e}", file=sys.stderr)
        return None

def load_data(unique_only=False):
    """Loads dataset from DB or CSV fallback, and fills missing values."""
    df = load_data_from_db(unique_only=unique_only)
    
    if df is None or len(df) == 0:
        if os.path.exists(excel_path):
            print(f"📖 Loading dataset from Excel: {excel_path}...", file=sys.stderr)
            df = pd.read_excel(excel_path)
        elif os.path.exists(csv_path):
            print(f"📖 Loading dataset from CSV: {csv_path}...", file=sys.stderr)
            df = pd.read_csv(csv_path)
        else:
            raise FileNotFoundError(
                f"❌ Error: Could not locate database records, '{excel_path}', or '{csv_path}' in the current folder."
            )
            
        # If fallback to CSV/Excel is used and unique_only is requested, drop duplicates
        if unique_only:
            df = df.drop_duplicates(subset=["Medicine Name"])
            
    # Clean and fill missing values
    df = df.fillna(0)
    df["Category"] = df["Category"].astype(str)
    df["Medicine Name"] = df["Medicine Name"].astype(str)
    
    return df

def train_and_save_model(df):
    """Trains the Random Forest model and saves it to a joblib file."""
    print("🔄 Processing time and category features...", file=sys.stderr)
    df["Manufacture Date"] = pd.to_datetime(df["Manufacture Date"])
    df["Day"] = df["Manufacture Date"].dt.day
    df["Month"] = df["Manufacture Date"].dt.month
    df["Year"] = df["Manufacture Date"].dt.year

    # Sorted encoding mappings for consistency
    category_list = sorted(df["Category"].unique())
    medicine_list = sorted(df["Medicine Name"].unique())

    category_mapping = {cat: idx for idx, cat in enumerate(category_list)}
    medicine_mapping = {med: idx for idx, med in enumerate(medicine_list)}

    df["Category_Code"] = df["Category"].map(category_mapping)
    df["Medicine_Code"] = df["Medicine Name"].map(medicine_mapping)

    # Calculate Future Demand (High Stock Out = High Future Demand baseline)
    df["Future_Demand"] = df["No. of Units"] + (df["Stock Out Units"] * 2)

    features = [
        "Medicine_Code",
        "Category_Code",
        "Price ($)",
        "Stock Out Units",
        "Day",
        "Month",
        "Year",
    ]
    
    X = df[features]
    y = df["Future_Demand"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    print("🔄 Training Robust Med AI Model (n_estimators=50)...", file=sys.stderr)
    ai_agent = RandomForestRegressor(n_estimators=50, random_state=42, n_jobs=-1, max_depth=15)
    ai_agent.fit(X_train, y_train)
    print("🎉 AI Model Training Complete!", file=sys.stderr)

    # Save trained model and categorical encoder mappings
    save_data = {
        "model": ai_agent,
        "category_mapping": category_mapping,
        "medicine_mapping": medicine_mapping,
        "features": features
    }
    
    joblib.dump(save_data, "model.joblib")
    print("💾 Model saved to 'model.joblib'.", file=sys.stderr)
    return ai_agent, category_mapping, medicine_mapping, features

def run_vectorized_predictions(df_predict, ai_agent, category_mapping, medicine_mapping, features):
    """Runs predictions in a single vectorized batch call to maximize execution speed."""
    print(f"🔮 Running vectorized predictions for {len(df_predict)} unique medicines...", file=sys.stderr)
    
    input_rows = []
    metadata = []
    
    for idx, row in df_predict.iterrows():
        med_name = str(row["Medicine Name"])
        category = str(row["Category"])
        price = float(row["Price ($)"])
        available_units = int(row["No. of Units"])
        historical_stock_out = min(float(row["Stock Out Units"]), float(available_units))

        med_code = medicine_mapping.get(med_name, 0)
        cat_code = category_mapping.get(category, 0)

        # Batch inputs: Daily (Day=5, Month=1), Weekly (Day=12, Month=1), Monthly (Day=5, Month=2)
        input_rows.append([med_code, cat_code, price, historical_stock_out, 5, 1, 2026])
        input_rows.append([med_code, cat_code, price, historical_stock_out, 12, 1, 2026])
        input_rows.append([med_code, cat_code, price, historical_stock_out, 5, 2, 2026])
        
        metadata.append({
            "id": str(row["Medicine ID"]),
            "name": med_name,
            "category": category,
            "current_stock": available_units,
            "stock_out_history": int(historical_stock_out)
        })

    input_df = pd.DataFrame(input_rows, columns=features)
    all_predictions = ai_agent.predict(input_df)
    
    prediction_list = []
    for i, meta in enumerate(metadata):
        daily_pred = int(round(all_predictions[i * 3]))
        weekly_pred = int(round(all_predictions[i * 3 + 1]))
        monthly_pred = int(round(all_predictions[i * 3 + 2]))
        
        prediction_list.append({
            "id": meta["id"],
            "name": meta["name"],
            "category": meta["category"],
            "current_stock": meta["current_stock"],
            "stock_out_history": meta["stock_out_history"],
            "daily_demand": daily_pred,
            "weekly_demand": weekly_pred,
            "monthly_demand": monthly_pred
        })
        
    return prediction_list

def generate_forecast(limit):
    """Generates predictions using loaded model or trains a new one if missing."""
    if not os.path.exists("model.joblib"):
        print("⚠️ Model file 'model.joblib' not found. Training model first...", file=sys.stderr)
        df = load_data(unique_only=False)
        ai_agent, category_mapping, medicine_mapping, features = train_and_save_model(df)
        df_predict = df.drop_duplicates(subset=["Medicine Name"])
    else:
        print("💾 Loading trained model from 'model.joblib'...", file=sys.stderr)
        save_data = joblib.load("model.joblib")
        ai_agent = save_data["model"]
        category_mapping = save_data["category_mapping"]
        medicine_mapping = save_data["medicine_mapping"]
        features = save_data["features"]
        df_predict = load_data(unique_only=True)

    prediction_list = run_vectorized_predictions(df_predict, ai_agent, category_mapping, medicine_mapping, features)

    # Sort predictions by weekly demand (descending)
    prediction_list = sorted(prediction_list, key=lambda x: x["weekly_demand"], reverse=True)
    return prediction_list[:limit]

def main():
    mode = "train"
    limit = 12
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "forecast":
            mode = "forecast"
            if len(sys.argv) > 2:
                try:
                    limit = int(sys.argv[2])
                except ValueError:
                    pass

    if mode == "forecast":
        try:
            forecasts = generate_forecast(limit)
            # Output ONLY the valid JSON list to sys.stdout
            print(json.dumps(forecasts))
        except Exception as e:
            print(f"❌ Error during forecast execution: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        try:
            print("🚀 Starting model training mode...", file=sys.stderr)
            df = load_data(unique_only=False)
            ai_agent, category_mapping, medicine_mapping, features = train_and_save_model(df)
            
            # Generate dashboard prediction inputs
            unique_meds = df.drop_duplicates(subset=["Medicine Name"])
            real_prediction_data = run_vectorized_predictions(unique_meds, ai_agent, category_mapping, medicine_mapping, features)

            # Injected dashboard builder fallback
            if os.path.exists(html_template_path):
                print(f"💾 Injecting real predictions into '{html_template_path}'...", file=sys.stderr)
                with open(html_template_path, "r", encoding="utf-8") as file:
                    html_content = file.read()

                old_array_marker = "let predictionData = ["
                array_start_idx = html_content.find(old_array_marker)

                if array_start_idx != -1:
                    clean_html_base = html_content[:array_start_idx]
                    injected_data_script = f"let predictionData = {json.dumps(real_prediction_data)};\n    </script>\n</body>\n</html>"
                    final_dashboard_html = clean_html_base + injected_data_script
                else:
                    final_dashboard_html = html_content

                with open(output_file_name, "w", encoding="utf-8") as out_file:
                    out_file.write(final_dashboard_html)
                print(f"✨ SUCCESS! Final dashboard HTML built: '{output_file_name}'", file=sys.stderr)
            else:
                print(f"⚠️ Warning: HTML template '{html_template_path}' not found. Skipping HTML dashboard generation.", file=sys.stderr)

            print("🎉 Model training process completed successfully!", file=sys.stderr)
        except Exception as e:
            print(f"❌ Error during training process: {e}", file=sys.stderr)
            sys.exit(1)

if __name__ == "__main__":
    main()