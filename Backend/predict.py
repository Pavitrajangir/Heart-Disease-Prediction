#!/usr/bin/env python3
"""
predict.py — Heart Disease Risk Predictor
Uses a trained Logistic Regression model with StandardScaler.

Files required (same directory):
  - LogisticRegression_heart.pkl
  - scaler.pkl
  - columns.pkl

Preprocessing pipeline (discovered by reverse-engineering the pkl files):
  1. Normalize the 6 numeric features using UCI Heart Disease dataset statistics
     (mean & std from the original training set, n=918)
  2. One-hot encode categorical features (binary flags)
  3. Apply the saved StandardScaler (columns.pkl column order)
  4. Run Logistic Regression predict / predict_proba

Usage:
  python3 predict.py '<json_string>'

Example:
  python3 predict.py '{"age":63,"sex":"M","chestPainType":"ASY","restingBP":145,
                       "cholesterol":233,"fastingBS":1,"maxHR":150,"oldpeak":2.3,
                       "restingECG":"LVH","exerciseAngina":"Y","stSlope":"Flat"}'

Output (stdout, JSON):
  {"prediction": 1, "probability": 0.9718}
"""

import sys
import json
import os
import numpy as np
import joblib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ── Load model artifacts ─────────────────────────────────────────────────────
model            = joblib.load(os.path.join(BASE_DIR, "LogisticRegression_heart.pkl"))
scaler           = joblib.load(os.path.join(BASE_DIR, "scaler.pkl"))
expected_columns = joblib.load(os.path.join(BASE_DIR, "columns.pkl"))

# ── UCI Heart Disease dataset statistics used during training ─────────────────
# These are the mean and std of the numeric columns from the original training
# data (Fedesoriano 2021, n=918). The model expects pre-normalized numerics.
NUMERIC_MEAN = {
    "Age":         53.51,
    "RestingBP":  132.40,
    "Cholesterol": 198.80,
    "FastingBS":    0.233,
    "MaxHR":       136.81,
    "Oldpeak":      0.887,
}
NUMERIC_STD = {
    "Age":          9.43,
    "RestingBP":   18.51,
    "Cholesterol": 109.38,
    "FastingBS":    0.423,
    "MaxHR":       25.46,
    "Oldpeak":      1.067,
}


def encode_input(data: dict) -> np.ndarray:
    """
    Transform raw frontend form data into the feature vector the model expects.

    Frontend field   -> model column
    ─────────────────────────────────────────────────────────────────────────
    age              -> Age              (normalized)
    restingBP        -> RestingBP        (normalized)
    cholesterol      -> Cholesterol      (normalized)
    fastingBS        -> FastingBS        (0 or 1, normalized)
    maxHR            -> MaxHR            (normalized)
    oldpeak          -> Oldpeak          (normalized)
    sex              -> Sex_M            (M=1, F=0)
    chestPainType    -> ChestPainType_ATA / _NAP / _TA   (ASY = reference/all 0)
    restingECG       -> RestingECG_Normal / _ST           (LVH = reference/all 0)
    exerciseAngina   -> ExerciseAngina_Y  (Y=1, N=0)
    stSlope          -> ST_Slope_Flat / _Up               (Down = reference/all 0)
    """
    raw = {
        "Age":         float(data["age"]),
        "RestingBP":   float(data["restingBP"]),
        "Cholesterol": float(data["cholesterol"]),
        "FastingBS":   float(data.get("fastingBS", 0)),
        "MaxHR":       float(data["maxHR"]),
        "Oldpeak":     float(data["oldpeak"]),
    }

    # Step 1: normalize numeric columns
    normalized = {col: (raw[col] - NUMERIC_MEAN[col]) / NUMERIC_STD[col] for col in raw}

    # Step 2: encode categoricals (binary / one-hot)
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

    # Step 3: build numpy array in exact training column order
    X = np.array([[row.get(col, 0.0) for col in expected_columns]])

    # Step 4: apply saved StandardScaler
    X_scaled = scaler.transform(X)
    return X_scaled


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No input data provided. Pass JSON as first argument."}))
        sys.exit(1)

    try:
        data = json.loads(sys.argv[1])
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON input: {e}"}))
        sys.exit(1)

    try:
        X          = encode_input(data)
        prediction = int(model.predict(X)[0])
        probability = float(model.predict_proba(X)[0][1])

        print(json.dumps({
            "prediction":  prediction,
            "probability": round(probability, 4),
        }))

    except KeyError as e:
        print(json.dumps({"error": f"Missing required field: {e}"}))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
