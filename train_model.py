import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import json
import sys
import os
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

# Load the dataset
def load_data():
    # Try to load from CSV, if not found create synthetic data
    csv_path = 'medicine_dataset_250k-v2_fixed.csv'
    if os.path.exists(csv_path):
        df = pd.read_csv(csv_path)
        print(f"Loaded {len(df)} records from {csv_path}")
    else:
        print("CSV not found, creating synthetic training data...")
        df = create_synthetic_data()
    return df

def create_synthetic_data():
    np.random.seed(42)
    medicines = [
        'Paracetamol', 'Amoxicillin', 'Pantoprazole', 'Furosemide', 
        'Escitalopram', 'Metformin', 'Lisinopril', 'Atorvastatin',
        'Omeprazole', 'Vitamin C', 'Ibuprofen', 'Cetirizine'
    ]
    categories = ['Antipyretic', 'Antibiotic', 'Antacid', 'Antihypertensive', 
                  'Antidepressant', 'Antidiabetic', 'Cholesterol', 'Antihistamine']
    
    data = []
    for med in medicines:
        cat = np.random.choice(categories)
        base_demand = np.random.randint(50, 400)
        for week in range(104):  # 2 years of weekly data
            seasonality = 1 + 0.3 * np.sin(week / 52 * 2 * np.pi)
            trend = 1 + week * 0.002
            noise = 1 + np.random.normal(0, 0.1)
            demand = int(base_demand * seasonality * trend * noise)
            data.append({
                'Medicine Name': med,
                'Medicine ID': f'MED-{np.random.randint(1000, 9999)}',
                'Category': cat,
                'Week': week,
                'Month': week // 4,
                'Year': 2024 + (week // 52),
                'Demand': max(10, demand),
                'Current Stock': max(20, int(demand * (0.5 + np.random.random() * 0.5)))
            })
    
    df = pd.DataFrame(data)
    return df

class DemandPredictor:
    def __init__(self):
        self.model = None
        self.label_encoders = {}
        self.feature_columns = []
        self.train()
    
    def prepare_features(self, df):
        # Encode categorical variables
        for col in ['Medicine Name', 'Category']:
            le = LabelEncoder()
            if col not in self.label_encoders:
                # Fit on full dataset
                all_values = df[col].unique()
                le.fit(all_values)
                self.label_encoders[col] = le
            else:
                le = self.label_encoders[col]
                # Handle unseen labels
                df[col] = df[col].apply(lambda x: x if x in le.classes_ else le.classes_[0])
            
            df[f'{col}_encoded'] = le.transform(df[col])
        
        # Add temporal features
        df['Month_sin'] = np.sin(2 * np.pi * df['Month'] / 12)
        df['Month_cos'] = np.cos(2 * np.pi * df['Month'] / 12)
        df['Week_sin'] = np.sin(2 * np.pi * df['Week'] / 52)
        df['Week_cos'] = np.cos(2 * np.pi * df['Week'] / 52)
        
        self.feature_columns = ['Medicine Name_encoded', 'Category_encoded', 
                               'Month_sin', 'Month_cos', 'Week_sin', 'Week_cos',
                               'Current Stock']
        return df
    
    def train(self):
        df = load_data()
        df = self.prepare_features(df)
        
        X = df[self.feature_columns]
        y = df['Demand']
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        self.model = RandomForestRegressor(n_estimators=100, random_state=42, max_depth=15)
        self.model.fit(X_train, y_train)
        
        score = self.model.score(X_test, y_test)
        print(f"Model trained with R² score: {score:.3f}")
    
    def predict_future(self, medicine_name, current_stock, weeks_ahead=4):
        """Predict demand for a specific medicine for future weeks"""
        predictions = []
        
        # Get the medicine's category
        df = load_data()
        med_data = df[df['Medicine Name'] == medicine_name]
        if len(med_data) == 0:
            # Fallback
            category = 'General'
        else:
            category = med_data['Category'].iloc[0]
        
        # Get current week/month
        current_week = datetime.now().isocalendar()[1]
        current_month = datetime.now().month
        
        for week_offset in range(1, weeks_ahead + 1):
            future_week = current_week + week_offset
            future_month = (current_month + (week_offset // 4)) % 12 or 12
            
            # Prepare features
            features = {
                'Medicine Name_encoded': self.label_encoders['Medicine Name'].transform([medicine_name])[0],
                'Category_encoded': self.label_encoders['Category'].transform([category])[0],
                'Month_sin': np.sin(2 * np.pi * future_month / 12),
                'Month_cos': np.cos(2 * np.pi * future_month / 12),
                'Week_sin': np.sin(2 * np.pi * future_week / 52),
                'Week_cos': np.cos(2 * np.pi * future_week / 52),
                'Current Stock': current_stock
            }
            
            X_pred = pd.DataFrame([features])
            pred = self.model.predict(X_pred)[0]
            predictions.append({
                'week': week_offset,
                'predicted_demand': max(10, int(pred))
            })
        
        return predictions
    
    def get_all_predictions(self, limit=12):
        """Get predictions for all medicines with their current stock"""
        df = load_data()
        results = []
        
        # Get unique medicines with their latest stock
        latest = df.groupby('Medicine Name').agg({
            'Medicine ID': 'first',
            'Category': 'first',
            'Current Stock': 'last',
            'Demand': 'mean'
        }).reset_index()
        
        # Sort by demand to show critical items first
        latest = latest.sort_values('Demand', ascending=False)
        latest = latest.head(limit)
        
        for _, row in latest.iterrows():
            medicine_name = row['Medicine Name']
            current_stock = row['Current Stock']
            avg_demand = row['Demand']
            
            # Predict 4 weeks ahead
            future = self.predict_future(medicine_name, current_stock, weeks_ahead=4)
            predicted_demand = int(np.mean([f['predicted_demand'] for f in future]))
            
            # Calculate confidence and status
            confidence = min(95, int(80 + (1 - abs(predicted_demand - avg_demand) / max(avg_demand, 1)) * 15))
            
            if predicted_demand > current_stock * 1.5:
                status = "Critical Risk"
            elif predicted_demand > current_stock * 1.1:
                status = "Moderate Restock"
            else:
                status = "Stable"
            
            results.append({
                'medicine_id': row['Medicine ID'],
                'medicine_name': medicine_name,
                'category': row['Category'],
                'current_stock': current_stock,
                'predicted_demand': predicted_demand,
                'confidence': confidence,
                'status': status,
                'weeks': len(future)
            })
        
        return results

# CLI Interface
if __name__ == "__main__":
    predictor = DemandPredictor()
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == 'forecast':
            limit = int(sys.argv[2]) if len(sys.argv) > 2 else 12
            results = predictor.get_all_predictions(limit)
            print(json.dumps(results))
        elif command == 'predict_single':
            medicine = sys.argv[2] if len(sys.argv) > 2 else 'Paracetamol'
            weeks = int(sys.argv[3]) if len(sys.argv) > 3 else 4
            stock = int(sys.argv[4]) if len(sys.argv) > 4 else 100
            predictions = predictor.predict_future(medicine, stock, weeks)
            print(json.dumps(predictions))
        else:
            print(json.dumps({"error": "Unknown command"}))
    else:
        # Default: print all predictions
        results = predictor.get_all_predictions(12)
        print(json.dumps(results))