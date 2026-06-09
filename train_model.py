import json
import os
import sys
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import OneHotEncoder
import joblib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, 'medicine_dataset_250k-v2_fixed.csv')
MODEL_PATH = os.path.join(BASE_DIR, 'security', 'robustmed_model.joblib')
ENCODER_CAT_PATH = os.path.join(BASE_DIR, 'security', 'encoder_cat.joblib')
ENCODER_DOSE_PATH = os.path.join(BASE_DIR, 'security', 'encoder_dose.joblib')
LOOKUP_PATH = os.path.join(BASE_DIR, 'security', 'robustmed_lookup.json')


def build_training_frame(df):
    df = df.copy()
    df['Medicine Name'] = df['Medicine Name'].astype(str).str.strip()
    df['Category'] = df['Category'].astype(str).str.strip()
    df['Dosage'] = df['Dosage'].astype(str).str.strip()
    df['Price ($)'] = pd.to_numeric(df['Price ($)'], errors='coerce').fillna(0)

    category_weight = df['Category'].astype(str).str.len().astype(float)
    dosage_weight = df['Dosage'].astype(str).str.len().astype(float)
    df['TargetQty'] = np.clip(
        np.round(df['Price ($)'] * 4.8 + category_weight * 18 + dosage_weight * 5),
        50,
        5000
    ).astype(int)
    return df


def train_model():
    df = pd.read_csv(CSV_PATH)
    df = build_training_frame(df)

    cat_encoder = OneHotEncoder(handle_unknown='ignore', sparse_output=False)
    dose_encoder = OneHotEncoder(handle_unknown='ignore', sparse_output=False)

    cat_encoded = cat_encoder.fit_transform(df[['Category']])
    dose_encoded = dose_encoder.fit_transform(df[['Dosage']])

    X = np.hstack([
        cat_encoded,
        dose_encoded,
        df[['Price ($)']].to_numpy()
    ])
    y = df['TargetQty'].to_numpy()

    model = RandomForestRegressor(n_estimators=120, random_state=42)
    model.fit(X, y)

    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    joblib.dump(cat_encoder, ENCODER_CAT_PATH)
    joblib.dump(dose_encoder, ENCODER_DOSE_PATH)

    lookup = {}
    for _, row in df.iterrows():
        lookup[row['Medicine Name'].strip().lower()] = {
            'Medicine Name': row['Medicine Name'],
            'Category': row['Category'],
            'Dosage': row['Dosage'],
            'Price ($)': float(row['Price ($)'])
        }

    with open(LOOKUP_PATH, 'w', encoding='utf-8') as f:
        json.dump(lookup, f, indent=2)

    return model, cat_encoder, dose_encoder, df


def predict_for_name(medicine_name_input):
    if not os.path.exists(MODEL_PATH) or not os.path.exists(ENCODER_CAT_PATH) or not os.path.exists(ENCODER_DOSE_PATH):
        train_model()

    model = joblib.load(MODEL_PATH)
    encoder_cat = joblib.load(ENCODER_CAT_PATH)
    encoder_dose = joblib.load(ENCODER_DOSE_PATH)
    with open(LOOKUP_PATH, 'r', encoding='utf-8') as f:
        lookup = json.load(f)

    key = medicine_name_input.strip().lower()
    if key not in lookup:
        return {'error': f"'{medicine_name_input}' was not found in the dataset."}

    med = lookup[key]
    encoded_cat = encoder_cat.transform(pd.DataFrame({'Category': [med['Category']]}))
    encoded_dose = encoder_dose.transform(pd.DataFrame({'Dosage': [med['Dosage']]}))
    input_features = np.hstack([
        encoded_cat,
        encoded_dose,
        np.array([[float(med['Price ($)'])]])
    ])
    predicted_qty = int(model.predict(input_features)[0])

    return {
        'medicine_name': med['Medicine Name'],
        'category': med['Category'],
        'dosage': med['Dosage'],
        'price': med['Price ($)'],
        'predicted_qty': predicted_qty,
        'mode': 'robustmed'
    }


def forecast_all(limit=12):
    df = pd.read_csv(CSV_PATH).head(limit)
    results = []
    for _, row in df.iterrows():
        prediction = predict_for_name(row['Medicine Name'])
        if 'error' not in prediction:
            results.append({
                'medicine_name': prediction['medicine_name'],
                'category': prediction['category'],
                'dosage': prediction['dosage'],
                'price': round(prediction['price'], 2),
                'predicted_units': prediction['predicted_qty'],
                'confidence': 'AI Model'
            })
    return results


if __name__ == '__main__':
    mode = sys.argv[1] if len(sys.argv) > 1 else 'forecast'

    if mode == 'train':
        train_model()
        print('MODEL TRAINED')
    elif mode == 'predict':
        name = sys.argv[2] if len(sys.argv) > 2 else ''
        print(json.dumps(predict_for_name(name)))
    else:
        limit = int(sys.argv[2]) if len(sys.argv) > 2 else 12
        print(json.dumps(forecast_all(limit=limit)))
