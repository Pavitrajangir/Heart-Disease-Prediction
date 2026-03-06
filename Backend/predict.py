import sys
import json
import os
import numpy as np
import joblib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Load model artifacts
model            = joblib.load(os.path.join(BASE_DIR, "LogisticRegression_heart.pkl"))
scaler           = joblib.load(os.path.join(BASE_DIR, "scaler.pkl"))
expected_columns = joblib.load(os.path.join(BASE_DIR, "columns.pkl"))

# UCI dataset statistics used during training (for normalizing numeric inputs)
NUMERIC_MEAN = { "Age": 53.51, "RestingBP": 132.40, "Cholesterol": 198.80, "FastingBS": 0.233, "MaxHR": 136.81, "Oldpeak": 0.887 }
NUMERIC_STD  = { "Age": 9.43,  "RestingBP": 18.51,  "Cholesterol": 109.38, "FastingBS": 0.423, "MaxHR": 25.46,  "Oldpeak": 1.067 }

def encode_input(data):
    # Normalize numeric fields
    raw = {
        "Age":         float(data["age"]),
        "RestingBP":   float(data["restingBP"]),
        "Cholesterol": float(data["cholesterol"]),
        "FastingBS":   float(data.get("fastingBS", 0)),
        "MaxHR":       float(data["maxHR"]),
        "Oldpeak":     float(data["oldpeak"]),
    }
    normalized = { col: (raw[col] - NUMERIC_MEAN[col]) / NUMERIC_STD[col] for col in raw }

    # One-hot encode categorical fields
    row = {
        **normalized,
        "Sex_M":             1.0 if data["sex"] == "M" else 0.0,
        "ChestPainType_ATA": 1.0 if data["chestPainType"] == "ATA" else 0.0,
        "ChestPainType_NAP": 1.0 if data["chestPainType"] == "NAP" else 0.0,
        "ChestPainType_TA":  1.0 if data["chestPainType"] == "TA"  else 0.0,
        "RestingECG_Normal": 1.0 if data["restingECG"] == "Normal" else 0.0,
        "RestingECG_ST":     1.0 if data["restingECG"] == "ST"     else 0.0,
        "ExerciseAngina_Y":  1.0 if data["exerciseAngina"] == "Y"  else 0.0,
        "ST_Slope_Flat":     1.0 if data["stSlope"] == "Flat" else 0.0,
        "ST_Slope_Up":       1.0 if data["stSlope"] == "Up"   else 0.0,
    }

    # Build feature array in the exact column order the model was trained on
    X = np.array([[row.get(col, 0.0) for col in expected_columns]])
    return scaler.transform(X)

try:
    # Read JSON from stdin (sent by Node.js server)
    data = json.loads(sys.stdin.read())

    X           = encode_input(data)
    prediction  = int(model.predict(X)[0])
    probability = float(model.predict_proba(X)[0][1])

    print(json.dumps({ "prediction": prediction, "probability": round(probability, 4) }))

except Exception as e:
    print(json.dumps({ "error": str(e) }))
    sys.exit(1)