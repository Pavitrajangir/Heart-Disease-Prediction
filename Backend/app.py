
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import joblib
import numpy as np
import os

# ── App setup ─────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(BASE_DIR, "dist")          # built React files

app = Flask(__name__, static_folder=DIST_DIR, static_url_path="/")
CORS(app)                                           # allow all origins

# ── Load model artifacts ──────────────────────────────────────────────────────
model            = joblib.load(os.path.join(BASE_DIR, "LogisticRegression_heart.pkl"))
scaler           = joblib.load(os.path.join(BASE_DIR, "scaler.pkl"))
expected_columns = joblib.load(os.path.join(BASE_DIR, "columns.pkl"))

print("✅ Model loaded:", type(model).__name__)
print("✅ Columns     :", list(expected_columns))

# ── Preprocessing constants ───────────────────────────────────────────────────
# Mean and std of numeric columns from the original UCI training data (n=918)
# The model was trained on pre-normalised numerics, so we must replicate that.
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

# ── Feature encoding ──────────────────────────────────────────────────────────
def encode_input(data: dict) -> np.ndarray:
    """
    Convert raw form data from the frontend into the 15-feature vector
    the Logistic Regression model expects.

    Preprocessing steps:
      1. Normalise numeric fields using UCI training set mean/std
      2. One-hot encode categorical fields
      3. Order columns exactly as in columns.pkl
      4. Apply StandardScaler (scaler.pkl)
    
    Frontend key   →  Model column
    ─────────────────────────────────────────────────────────
    age            →  Age              (normalised)
    restingBP      →  RestingBP        (normalised)
    cholesterol    →  Cholesterol      (normalised)
    fastingBS      →  FastingBS        (0/1, normalised)
    maxHR          →  MaxHR            (normalised)
    oldpeak        →  Oldpeak          (normalised)
    sex            →  Sex_M            (M=1, F=0)
    chestPainType  →  ChestPainType_ATA / _NAP / _TA   (ASY = all 0s)
    restingECG     →  RestingECG_Normal / _ST           (LVH = all 0s)
    exerciseAngina →  ExerciseAngina_Y (Y=1, N=0)
    stSlope        →  ST_Slope_Flat / _Up               (Down = all 0s)
    """

    # Step 1 — normalise numeric fields
    raw = {
        "Age":         float(data["age"]),
        "RestingBP":   float(data["restingBP"]),
        "Cholesterol": float(data["cholesterol"]),
        "FastingBS":   float(data.get("fastingBS", 0)),
        "MaxHR":       float(data["maxHR"]),
        "Oldpeak":     float(data["oldpeak"]),
    }
    normalized = {
        col: (raw[col] - NUMERIC_MEAN[col]) / NUMERIC_STD[col]
        for col in raw
    }

    # Step 2 — one-hot encode categorical fields
    row = {
        **normalized,

        # Sex
        "Sex_M": 1.0 if data["sex"] == "M" else 0.0,

        # Chest Pain Type  (reference = ASY → all zeros)
        "ChestPainType_ATA": 1.0 if data["chestPainType"] == "ATA" else 0.0,
        "ChestPainType_NAP": 1.0 if data["chestPainType"] == "NAP" else 0.0,
        "ChestPainType_TA":  1.0 if data["chestPainType"] == "TA"  else 0.0,

        # Resting ECG  (reference = LVH → all zeros)
        "RestingECG_Normal": 1.0 if data["restingECG"] == "Normal" else 0.0,
        "RestingECG_ST":     1.0 if data["restingECG"] == "ST"     else 0.0,

        # Exercise Angina
        "ExerciseAngina_Y": 1.0 if data["exerciseAngina"] == "Y" else 0.0,

        # ST Slope  (reference = Down → all zeros)
        "ST_Slope_Flat": 1.0 if data["stSlope"] == "Flat" else 0.0,
        "ST_Slope_Up":   1.0 if data["stSlope"] == "Up"   else 0.0,
    }

    # Step 3 — build array in the exact column order from columns.pkl
    X = np.array([[row.get(col, 0.0) for col in expected_columns]])

    # Step 4 — apply the saved StandardScaler
    return scaler.transform(X)


# ── Validation helper ─────────────────────────────────────────────────────────
REQUIRED_FIELDS = [
    "age", "restingBP", "cholesterol", "fastingBS",
    "maxHR", "oldpeak", "sex", "chestPainType",
    "restingECG", "exerciseAngina", "stSlope",
]

def validate(data: dict):
    missing = [f for f in REQUIRED_FIELDS if data.get(f) is None or data.get(f) == ""]
    return missing


# ── API route ─────────────────────────────────────────────────────────────────
@app.route("/api/predict", methods=["POST"])
def predict():
    data = request.get_json()

    if not data:
        return jsonify({"error": "No JSON body received."}), 400

    # Validate required fields
    missing = validate(data)
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    try:
        X           = encode_input(data)
        prediction  = int(model.predict(X)[0])
        probability = float(model.predict_proba(X)[0][1])

        return jsonify({
            "prediction":  prediction,            # 0 = Low Risk, 1 = High Risk
            "probability": round(probability, 4), # e.g. 0.8732
        })

    except KeyError as e:
        return jsonify({"error": f"Missing field in input: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500


# ── Serve React frontend ──────────────────────────────────────────────────────
# These two routes make Flask serve the built React app for every non-API URL.
# This means you can visit http://localhost:5000 and see the frontend.

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react(path):
    # If dist/ folder doesn't exist yet, show a helpful message
    if not os.path.exists(DIST_DIR):
        return (
            "<h2>⚠️ React build not found</h2>"
            "<p>Run <code>npm run build</code> in your Frontend folder, "
            "then copy the <code>dist/</code> folder into the Backend folder.</p>"
        ), 404

    # Serve the file if it exists (e.g. /assets/index-abc123.js)
    file_path = os.path.join(DIST_DIR, path)
    if path and os.path.exists(file_path):
        return send_from_directory(DIST_DIR, path)

    # Otherwise serve index.html (React Router handles the rest)
    return send_from_directory(DIST_DIR, "index.html")


# ── Run ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"\n🫀 CardioAI running at http://localhost:{port}\n")
    app.run(host="0.0.0.0", port=port, debug=False)
