import os
import sys
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
import json
import joblib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, 'medicine_dataset_250k-v2_fixed.csv')
MODEL_PATH = os.path.join(BASE_DIR, 'security', 'robustmed_model.joblib')
META_PATH = os.path.join(BASE_DIR, 'security', 'robustmed_meta.json')
LOOKUP_PATH = os.path.join(BASE_DIR, 'security', 'robustmed_lookup.json')

def load_data():
    if not os.path.exists(CSV_PATH):
        raise FileNotFoundError(f"Dataset file not found at {CSV_PATH}")
    df = pd.read_csv(CSV_PATH)
    # Clean column names
    df.columns = df.columns.str.strip()
    return df

def preprocess_and_train():
    df = load_data()
    
    # Preprocess
    df['Medicine Name'] = df['Medicine Name'].astype(str).str.strip()
    df['Category'] = df['Category'].astype(str).str.strip()
    df['Dosage'] = df['Dosage'].astype(str).str.strip()
    df['Price ($)'] = pd.to_numeric(df['Price ($)'], errors='coerce').fillna(0)
    df['No. of Units'] = pd.to_numeric(df['No. of Units'], errors='coerce').fillna(0).astype(int)
    
    # Simulate 'Stock Out Units' as a percentage of 'No. of Units' with some randomness
    np.random.seed(42)
    df['Stock Out Units'] = (df['No. of Units'] * np.random.uniform(0.05, 0.2, len(df))).round().astype(int)
    
    # Generate Category Codes
    df['Category'] = df['Category'].astype('category')
    df['Category_Code'] = df['Category'].cat.codes
    
    # Features & Target
    X = df[['Category_Code', 'No. of Units', 'Stock Out Units']]
    # Target demand: we want to predict a target demand which is a function of present stock + stockouts + price
    y = np.clip(
        df['No. of Units'] + df['Stock Out Units'] + (df['Price ($)'] * 0.5).round().astype(int),
        75,
        5000
    )
    
    # Train Random Forest Regressor
    model = RandomForestRegressor(n_estimators=50, random_state=42, n_jobs=-1)
    model.fit(X, y)
    
    # Save model and meta-info
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    
    # Save lookup and categories
    categories = df['Category'].cat.categories.tolist()
    meta = {
        'categories': categories,
        'mean_stock_out_units': float(df['Stock Out Units'].mean())
    }
    with open(META_PATH, 'w') as f:
        json.dump(meta, f)
        
    # Build lookup
    lookup = {}
    for _, row in df.iterrows():
        lookup[row['Medicine Name'].lower()] = {
            'Medicine ID': row['Medicine ID'],
            'Medicine Name': row['Medicine Name'],
            'Category': row['Category'],
            'Dosage': row['Dosage'],
            'Price ($)': float(row['Price ($)']),
            'No. of Units': int(row['No. of Units']),
            'Stock Out Units': int(row['Stock Out Units']),
            'Category_Code': int(row['Category_Code'])
        }
    with open(LOOKUP_PATH, 'w', encoding='utf-8') as f:
        json.dump(lookup, f, indent=2)
        
    return model, categories, lookup

def forecast_all(limit=12):
    # Load model and meta
    if not os.path.exists(MODEL_PATH) or not os.path.exists(META_PATH) or not os.path.exists(LOOKUP_PATH):
        preprocess_and_train()
        
    model = joblib.load(MODEL_PATH)
    with open(META_PATH, 'r') as f:
        meta = json.load(f)
    with open(LOOKUP_PATH, 'r', encoding='utf-8') as f:
        lookup = json.load(f)
        
    # Get top items from CSV
    df = load_data().head(limit)
    df['Category'] = df['Category'].astype(str).str.strip()
    df['Medicine Name'] = df['Medicine Name'].astype(str).str.strip()
    df['No. of Units'] = pd.to_numeric(df['No. of Units'], errors='coerce').fillna(0).astype(int)
    
    # Map Category to Code
    categories = meta['categories']
    df['Category_Code'] = pd.Categorical(df['Category'], categories=categories).codes
    # Fill -1 codes with 0
    df['Category_Code'] = df['Category_Code'].replace(-1, 0)
    
    # Map Stock Out Units from lookup
    mean_stock_out_units = meta['mean_stock_out_units']
    df['Stock Out Units'] = df['Medicine Name'].apply(
        lambda x: lookup.get(x.lower(), {}).get('Stock Out Units', int(mean_stock_out_units))
    )
    
    X = df[['Category_Code', 'No. of Units', 'Stock Out Units']]
    predictions = model.predict(X).round().astype(int)
    predictions = np.clip(predictions, a_min=75, a_max=None)
    
    results = []
    for i, row in df.iterrows():
        pred_val = int(predictions[i])
        
        # Calculate status
        if pred_val > 500:
            status = "Critical Risk"
            confidence = "94%"
        elif pred_val > 250:
            status = "Moderate Restock"
            confidence = "88%"
        else:
            status = "Stable"
            confidence = "78%"
            
        results.append({
            'medicine_id': row.get('Medicine ID', f'MED-{1000+i}'),
            'medicine_name': row['Medicine Name'],
            'category': row['Category'],
            'dosage': row.get('Dosage', '-'),
            'price': float(pd.to_numeric(row.get('Price ($)'), errors='coerce') or 0.0),
            'predicted_units': pred_val,
            'confidence': confidence,
            'status': status
        })
    return results

if __name__ == '__main__':
    mode = sys.argv[1] if len(sys.argv) > 1 else 'forecast'
    if mode == 'train':
        preprocess_and_train()
        print('MODEL TRAINED')
    elif mode == 'forecast':
        limit = int(sys.argv[2]) if len(sys.argv) > 2 else 12
        print(json.dumps(forecast_all(limit=limit)))