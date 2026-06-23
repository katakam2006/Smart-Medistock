import os
import subprocess
import json
from typing import Any
import mysql.connector

# DB Connection details
db_config = {
    "host": "localhost",
    "user": "root",
    "password": "Hemasrikotha@07",
    "database": "smart_medistock"
}

def run_forecast():
    # Runs the forecast command
    python_cmd = r"C:\Users\KOTHAS\AppData\Local\Programs\Python\Python313\python.exe"
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)
    result = subprocess.run([python_cmd, "train_model.py", "forecast", "1000"], capture_output=True, text=True, cwd=project_dir)
    if result.returncode != 0:
        print("Forecast failed:", result.stderr)
        return None
    try:
        # Strip output to avoid any leading/trailing extra text
        stdout_str = result.stdout.strip()
        # Find start of JSON array
        start_idx = stdout_str.find("[")
        if start_idx != -1:
            stdout_str = stdout_str[start_idx:]
        return json.loads(stdout_str)
    except Exception as e:
        print("JSON parse error on stdout:", e)
        print("Stdout was:", result.stdout)
        return None

def get_forecast_for_medicine(forecasts, name):
    for f in forecasts:
        if f["name"].lower() == name.lower():
            return f
    return None

def main():
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()

    # Pick a medicine that exists
    cursor.execute("SELECT medicine_name, no_of_units, stock_out_units FROM medicines LIMIT 1")
    med: Any = cursor.fetchone()
    if not med:
        print("No medicines found in the database!")
        conn.close()
        return
    
    if isinstance(med, dict):
        med_name = str(med.get("medicine_name", ""))
        original_units = int(med.get("no_of_units") or 0)
        original_stock_out = int(med.get("stock_out_units") or 0)
    else:
        med_name = str(med[0])
        original_units = int(med[1] if med[1] is not None else 0)
        original_stock_out = int(med[2] if med[2] is not None else 0)
    print(f"Testing medicine: {med_name}")
    print(f"Original Stock: {original_units}, Original Stock Out Units: {original_stock_out}")

    # Step 1: Run original forecast
    forecasts_orig = run_forecast()
    if not forecasts_orig:
        conn.close()
        return
    
    orig_f = get_forecast_for_medicine(forecasts_orig, med_name)
    if orig_f:
        print(f"Original Prediction - Daily: {orig_f['daily_demand']}, Weekly: {orig_f['weekly_demand']}, Monthly: {orig_f['monthly_demand']}")
    else:
        print("Medicine not in forecast list, let's proceed with check anyway.")

    # Step 2: Simulate stock out by setting no_of_units to 0 and stock_out_units to a very high value (e.g. original + 500)
    simulated_stock_out = original_stock_out + 500
    print(f"Updating database: setting no_of_units = 0 and stock_out_units = {simulated_stock_out}")
    cursor.execute(
        "UPDATE medicines SET no_of_units = 0, stock_out_units = %s WHERE medicine_name = %s",
        (simulated_stock_out, med_name)
    )
    conn.commit()

    try:
        # Step 3: Run forecast again
        forecasts_new = run_forecast()
        if forecasts_new:
            new_f = get_forecast_for_medicine(forecasts_new, med_name)
            if new_f:
                print(f"New Prediction - Daily: {new_f['daily_demand']}, Weekly: {new_f['weekly_demand']}, Monthly: {new_f['monthly_demand']}")
                if orig_f:
                    diff_weekly = new_f['weekly_demand'] - orig_f['weekly_demand']
                    print(f"Weekly demand changed by: {diff_weekly}")
                    if diff_weekly > 0:
                        print("SUCCESS: The prediction increased dynamically when medicine went out of stock with high demand!")
                    else:
                        print("ERROR: The prediction did not increase.")
            else:
                print("Could not find medicine in new forecast list.")
    finally:
        # Step 4: Restore database
        print(f"Restoring database: resetting no_of_units = {original_units}, stock_out_units = {original_stock_out}")
        cursor.execute(
            "UPDATE medicines SET no_of_units = %s, stock_out_units = %s WHERE medicine_name = %s",
            (original_units, original_stock_out, med_name)
        )
        conn.commit()
        conn.close()

if __name__ == "__main__":
    main()
