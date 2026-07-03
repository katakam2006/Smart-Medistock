import json
import os
import sys
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.model_selection import train_test_split
import joblib
import mysql.connector

# Configuration
excel_path = "FINAL DATA SET WITH STOCK OUT.xlsx"
csv_path = "medicine_dataset_250k-v2_fixed.csv"
html_template_path = "Stocker With prediction.html"
output_file_name = "Smart_MediStock_Final_Dashboard.html"

def load_data_from_db(unique_only=False, hospital_name=""):
    """Attempts to connect to MySQL and load medicine records."""
    try:
        conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password="Hemasrikotha@07",
            database="smart_medistock"
        )
        
        # Determine hospital block offset
        hospital_block_offset = 0
        if hospital_name:
            name_lower = hospital_name.lower().strip()
            if "sai hospital" in name_lower or name_lower == "sai hospital":
                hospital_block_offset = 0
                print(f"📊 Hospital '{hospital_name}' found. Using static offset {hospital_block_offset}.", file=sys.stderr)
            elif "city medical clinic" in name_lower or name_lower == "city medical clinic":
                hospital_block_offset = 4000
                print(f"📊 Hospital '{hospital_name}' found. Using static offset {hospital_block_offset}.", file=sys.stderr)
            elif "pulse hospital" in name_lower or name_lower == "pulse hospital":
                hospital_block_offset = 8000
                print(f"📊 Hospital '{hospital_name}' found. Using static offset {hospital_block_offset}.", file=sys.stderr)
            else:
                hospital_block_offset = 0
                print(f"⚠️ Hospital '{hospital_name}' not mapped statically. Using default offset 0.", file=sys.stderr)

        if unique_only:
            # FIX: Aggregate stock_out_units across ALL rows for each medicine name
            # This gives us the TOTAL historical stock-out demand for each unique medicine,
            # which is what the model needs to make accurate predictions.
            query = (
                "SELECT "
                "    t.min_id AS 'Medicine ID', "
                "    t.medicine_name AS 'Medicine Name', "
                "    m2.category AS 'Category', "
                "    m2.dosage AS 'Dosage', "
                "    m2.manufacture_date AS 'Manufacture Date', "
                "    m2.expiry_date AS 'Expiry Date', "
                "    m2.price AS 'Price ($)', "
                "    m2.no_of_units AS 'No. of Units', "
                "    t.total_stock_out AS 'Stock Out Units', "
                "    t.record_count AS 'Record Count' "
                "FROM ( "
                "    SELECT "
                "        MIN(medicine_id) AS min_id, "
                "        medicine_name, "
                "        SUM(stock_out_units) AS total_stock_out, "
                "        COUNT(*) AS record_count "
                "    FROM ( "
                "        SELECT * FROM medicines ORDER BY medicine_id ASC LIMIT 4000 OFFSET {offset} "
                "    ) block "
                "    GROUP BY medicine_name "
                ") t "
                "JOIN medicines m2 ON m2.medicine_id = t.min_id"
            ).format(offset=hospital_block_offset)
        else:
            query = (
                "SELECT "
                "    medicine_id AS 'Medicine ID', "
                "    medicine_name AS 'Medicine Name', "
                "    category AS 'Category', "
                "    dosage AS 'Dosage', "
                "    manufacture_date AS 'Manufacture Date', "
                "    expiry_date AS 'Expiry Date', "
                "    price AS 'Price ($)', "
                "    no_of_units AS 'No. of Units', "
                "    stock_out_units AS 'Stock Out Units' "
                "FROM medicines "
                "ORDER BY medicine_id ASC "
                "LIMIT 4000 OFFSET {offset}"
            ).format(offset=hospital_block_offset)
        df = pd.read_sql(query, conn)
        conn.close()
        if len(df) > 0:
            print(f"✅ Successfully loaded dataset (unique_only={unique_only}, hospital={hospital_name}) from MySQL database.", file=sys.stderr)
            return df
        else:
            print("⚠️ MySQL database table 'medicines' is empty.", file=sys.stderr)
            return None
    except Exception as e:
        print(f"⚠️ MySQL connection or query failed: {e}", file=sys.stderr)
        return None

def load_data(unique_only=False, hospital_name=""):
    """Loads dataset from DB or CSV fallback, and fills missing values."""
    df = load_data_from_db(unique_only=unique_only, hospital_name=hospital_name)
    
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
    if "Record Count" not in df.columns:
        df["Record Count"] = 1
    
    return df

def train_and_save_model(df):
    """Trains the model using aggregated stock-out data per unique medicine."""
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

    # FIX: Aggregate stock_out_units before computing Future_Demand.
    # When training on the full (non-unique) dataset, aggregate by medicine name first,
    # then compute the demand signal from those aggregated values.
    print("🔄 Aggregating stock-out data per unique medicine for training...", file=sys.stderr)
    agg_df = (
        df.groupby("Medicine Name", as_index=False)
        .agg(
            total_stock_out=("Stock Out Units", "sum"),
            avg_units=("No. of Units", "mean"),
            record_count=("Medicine Name", "count"),
            Category_Code=("Category_Code", "first"),
            Medicine_Code=("Medicine_Code", "first"),
            Price=("Price ($)", "mean"),
            Day=("Day", "first"),
            Month=("Month", "first"),
            Year=("Year", "first"),
        )
    )
    agg_df.rename(columns={"Price": "Price ($)", "avg_units": "No. of Units"}, inplace=True)

    # FIX: Future_Demand formula using aggregated stock_out so model learns
    # that high total demand = high future needs.
    # We normalize by record_count so the scale is per-record-block,
    # making it comparable to what we feed at inference time.
    agg_df["Future_Demand"] = agg_df["No. of Units"] + (agg_df["total_stock_out"] / agg_df["record_count"]) * 2

    features = [
        "Medicine_Code",
        "Category_Code",
        "Price ($)",
        "Avg_Stock_Out",
        "Day",
        "Month",
        "Year",
    ]

    # Create the Avg_Stock_Out feature (per-record normalised)
    agg_df["Avg_Stock_Out"] = agg_df["total_stock_out"] / agg_df["record_count"]

    X = agg_df[features]
    y = agg_df["Future_Demand"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    print("🔄 Training Robust Med AI Model (n_estimators=100)...", file=sys.stderr)
    ai_agent = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1, max_depth=15)
    ai_agent.fit(X_train, y_train)

    score = ai_agent.score(X_test, y_test)
    print(f"🎯 Model R² score on test set: {score:.4f}", file=sys.stderr)
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
    """Runs predictions using aggregated (per-medicine) stock-out totals."""
    print(f"🔮 Running vectorized predictions for {len(df_predict)} unique medicines...", file=sys.stderr)
    
    from datetime import datetime, timedelta
    now = datetime.now()
    tomorrow = now + timedelta(days=1)
    next_week = now + timedelta(days=7)
    next_month = now + timedelta(days=30)
    
    input_rows = []
    metadata = []
    
    for idx, row in df_predict.iterrows():
        med_name = str(row["Medicine Name"])
        category = str(row["Category"])
        price = float(row["Price ($)"])
        available_units = int(row["No. of Units"])

        # FIX: Use aggregated stock_out if available (from unique_only=True query),
        # otherwise fall back to per-row value.
        raw_stock_out = float(row.get("Stock Out Units", 0))
        record_count = float(row.get("Record Count", 1))
        if record_count <= 0:
            record_count = 1.0

        # avg_stock_out is per-record normalised — matches what model was trained on
        avg_stock_out = raw_stock_out / record_count

        dosage = str(row.get("Dosage", "-"))

        med_code = medicine_mapping.get(med_name, 0)
        cat_code = category_mapping.get(category, 0)

        # Batch inputs for tomorrow, next week, next month
        input_rows.append([med_code, cat_code, price, avg_stock_out, tomorrow.day, tomorrow.month, tomorrow.year])
        input_rows.append([med_code, cat_code, price, avg_stock_out, next_week.day, next_week.month, next_week.year])
        input_rows.append([med_code, cat_code, price, avg_stock_out, next_month.day, next_month.month, next_month.year])
        
        metadata.append({
            "id": str(row["Medicine ID"]),
            "name": med_name,
            "category": category,
            "dosage": dosage,
            "current_stock": available_units,
            "stock_out_history": int(raw_stock_out),
            "record_count": int(record_count)
        })

    input_df = pd.DataFrame(input_rows, columns=features)
    all_predictions = ai_agent.predict(input_df)
    
    prediction_list = []
    for i, meta in enumerate(metadata):
        daily_pred = max(0, int(round(all_predictions[i * 3])))
        weekly_pred = max(0, int(round(all_predictions[i * 3 + 1])))
        monthly_pred = max(0, int(round(all_predictions[i * 3 + 2])))
        
        prediction_list.append({
            "id": meta["id"],
            "name": meta["name"],
            "category": meta["category"],
            "dosage": meta["dosage"],
            "current_stock": meta["current_stock"],
            "stock_out_history": meta["stock_out_history"],
            "daily_demand": daily_pred,
            "weekly_demand": weekly_pred,
            "monthly_demand": monthly_pred
        })
        
    return prediction_list

def generate_forecast(limit, hospital_name=""):
    """Generates predictions using loaded model or trains a new one if missing."""
    if not os.path.exists("model.joblib"):
        print("⚠️ Model file 'model.joblib' not found. Training model first...", file=sys.stderr)
        df = load_data(unique_only=False, hospital_name=hospital_name)
        ai_agent, category_mapping, medicine_mapping, features = train_and_save_model(df)
        df_predict = load_data(unique_only=True, hospital_name=hospital_name)
    else:
        print("💾 Loading trained model from 'model.joblib'...", file=sys.stderr)
        save_data = joblib.load("model.joblib")
        ai_agent = save_data["model"]
        category_mapping = save_data["category_mapping"]
        medicine_mapping = save_data["medicine_mapping"]
        features = save_data["features"]
        df_predict = load_data(unique_only=True, hospital_name=hospital_name)

    prediction_list = run_vectorized_predictions(df_predict, ai_agent, category_mapping, medicine_mapping, features)

    # Sort predictions by weekly demand (descending)
    prediction_list = sorted(prediction_list, key=lambda x: x["weekly_demand"], reverse=True)
    return prediction_list[:limit]

def main():
    mode = "train"
    limit = 12
    hospital_name = ""
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "forecast":
            mode = "forecast"
            if len(sys.argv) > 2:
                try:
                    limit = int(sys.argv[2])
                except ValueError:
                    pass
            if len(sys.argv) > 3:
                hospital_name = sys.argv[3]

    if mode == "forecast":
        try:
            forecasts = generate_forecast(limit, hospital_name=hospital_name)
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
            df_predict = load_data(unique_only=True)
            real_prediction_data = run_vectorized_predictions(df_predict, ai_agent, category_mapping, medicine_mapping, features)

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