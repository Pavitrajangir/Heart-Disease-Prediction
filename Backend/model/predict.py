import sys
import json
import joblib
import pandas as pd
import os

# Get script directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Load files
model = joblib.load(os.path.join(BASE_DIR, "LogisticRegression_heart.pkl"))
scaler = joblib.load(os.path.join(BASE_DIR, "scaler.pkl"))
expected_columns = joblib.load(os.path.join(BASE_DIR, "columns.pkl"))

# Read input
try:
    raw_input = sys.argv[1]
    input_data = json.loads(raw_input)
except Exception as e:
    print("Error reading input:", e)
    sys.exit(1)

# Convert to DataFrame
input_df = pd.DataFrame([input_data])

# Fill missing columns
for col in expected_columns:
    if col not in input_df.columns:
        input_df[col] = 0

# Reorder columns
input_df = input_df[expected_columns]

# Scale
scaled_input = scaler.transform(input_df)

# Predict
prediction = model.predict(scaled_input)[0]

print(prediction)