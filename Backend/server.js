// server.js — Heart Disease Prediction API
// Run: npm install express cors && node server.js

const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// Serve built React frontend
app.use(express.static(path.join(__dirname, "dist")));

/**
 * POST /api/predict
 * Body: { age, restingBP, cholesterol, maxHR, oldpeak, sex, chestPainType, restingECG, exerciseAngina, stSlope }
 * Returns: { prediction: 0|1, probability: float }
 */
app.post("/api/predict", (req, res) => {
  const {
    age, restingBP, cholesterol, maxHR, oldpeak,
    sex, chestPainType, restingECG, exerciseAngina, stSlope,
  } = req.body;

  // Basic validation
  const required = ["age", "restingBP", "cholesterol", "maxHR", "oldpeak", "sex", "chestPainType", "restingECG", "exerciseAngina", "stSlope"];
  for (const field of required) {
    if (req.body[field] === undefined || req.body[field] === "") {
      return res.status(400).json({ error: `Missing field: ${field}` });
    }
  }

  // Spawn Python subprocess with input data as JSON arg
  const inputData = JSON.stringify(req.body);
  const python = spawn("python3", ["predict.py", inputData]);

  let output = "";
  let errorOut = "";

  python.stdout.on("data", (data) => { output += data.toString(); });
  python.stderr.on("data", (data) => { errorOut += data.toString(); });

  python.on("close", (code) => {
    if (code !== 0) {
      console.error("Python error:", errorOut);
      return res.status(500).json({ error: "Model prediction failed", details: errorOut });
    }
    try {
      const result = JSON.parse(output.trim());
      return res.json(result);
    } catch (e) {
      return res.status(500).json({ error: "Failed to parse model output", raw: output });
    }
  });
});

// Catch-all: serve React app
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🫀 CardioAI Backend running at http://localhost:${PORT}`);
  console.log(`   POST /api/predict → Python ML model`);
});
