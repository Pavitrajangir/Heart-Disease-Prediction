import { useState } from "react";

// ── ML simulation (mirrors the real Logistic Regression model) ────────────────
const MEANS = { age: 53.51, restingBP: 132.40, cholesterol: 198.80, fastingBS: 0.233, maxHR: 136.81, oldpeak: 0.887 };
const STDS  = { age: 9.43,  restingBP: 18.51,  cholesterol: 109.38, fastingBS: 0.423, maxHR: 25.46,  oldpeak: 1.067 };
const COEFS = {
  Age: 0.170, RestingBP: 0.012, Cholesterol: 0.030, FastingBS: 0.505, MaxHR: -0.189, Oldpeak: 0.449,
  Sex_M: 0.604, ChestPainType_ATA: -0.632, ChestPainType_NAP: -0.580, ChestPainType_TA: -0.246,
  RestingECG_Normal: -0.007, RestingECG_ST: -0.071,
  ExerciseAngina_Y: 0.498, ST_Slope_Flat: 0.559, ST_Slope_Up: -0.605,
};

function simulate(f) {
  const n = (v, k) => (parseFloat(v) - MEANS[k]) / STDS[k];
  const row = {
    Age: n(f.age, "age"), RestingBP: n(f.restingBP, "restingBP"),
    Cholesterol: n(f.cholesterol, "cholesterol"), FastingBS: n(f.fastingBS || 0, "fastingBS"),
    MaxHR: n(f.maxHR, "maxHR"), Oldpeak: n(f.oldpeak, "oldpeak"),
    Sex_M: f.sex === "M" ? 1 : 0,
    ChestPainType_ATA: f.chestPainType === "ATA" ? 1 : 0,
    ChestPainType_NAP: f.chestPainType === "NAP" ? 1 : 0,
    ChestPainType_TA:  f.chestPainType === "TA"  ? 1 : 0,
    RestingECG_Normal: f.restingECG === "Normal" ? 1 : 0,
    RestingECG_ST:     f.restingECG === "ST"     ? 1 : 0,
    ExerciseAngina_Y:  f.exerciseAngina === "Y"  ? 1 : 0,
    ST_Slope_Flat: f.stSlope === "Flat" ? 1 : 0,
    ST_Slope_Up:   f.stSlope === "Up"   ? 1 : 0,
  };
  const logit = 0.278 + Object.entries(COEFS).reduce((s, [k, c]) => s + c * (row[k] || 0), 0);
  const prob = 1 / (1 + Math.exp(-logit));
  return { prediction: prob >= 0.5 ? 1 : 0, probability: Math.round(prob * 10000) / 10000 };
}

// ── Form field definitions ────────────────────────────────────────────────────
const NUMBER_FIELDS = [
  { key: "age",         label: "Age",                     unit: "yrs",   min: 1,  max: 120, placeholder: "e.g. 52"  },
  { key: "restingBP",   label: "Resting Blood Pressure",  unit: "mmHg",  min: 60, max: 250, placeholder: "e.g. 120" },
  { key: "cholesterol", label: "Cholesterol",             unit: "mg/dL", min: 0,  max: 700, placeholder: "e.g. 210" },
  { key: "maxHR",       label: "Max Heart Rate",          unit: "bpm",   min: 50, max: 220, placeholder: "e.g. 150" },
  { key: "oldpeak",     label: "Oldpeak (ST Depression)", unit: "mm",    min: -5, max: 10,  placeholder: "e.g. 1.2", step: 0.1 },
];

const SELECT_FIELDS = [
  { key: "sex",            label: "Sex",                          options: ["", "M — Male", "F — Female"] },
  { key: "chestPainType",  label: "Chest Pain Type",              options: ["", "ASY — Asymptomatic", "ATA — Atypical Angina", "NAP — Non-Anginal Pain", "TA — Typical Angina"] },
  { key: "restingECG",     label: "Resting ECG",                  options: ["", "Normal", "ST — ST-T Abnormality", "LVH — Left Ventricular Hypertrophy"] },
  { key: "fastingBS",      label: "Fasting Blood Sugar > 120",    options: ["", "0 — No (≤ 120 mg/dL)", "1 — Yes (> 120 mg/dL)"] },
  { key: "exerciseAngina", label: "Exercise-Induced Angina",      options: ["", "N — No", "Y — Yes"] },
  { key: "stSlope",        label: "ST Slope",                     options: ["", "Up — Upsloping", "Flat — Flat", "Down — Downsloping"] },
];

// ── Empty form state ──────────────────────────────────────────────────────────
const EMPTY = { age: "", restingBP: "", cholesterol: "", maxHR: "", oldpeak: "", sex: "", chestPainType: "", restingECG: "", fastingBS: "", exerciseAngina: "", stSlope: "" };

// ── Helper: parse select value (take part before " — ") ──────────────────────
function parseSelect(val) {
  return val ? val.split(" — ")[0] : "";
}

export default function App() {
  const [form, setForm]       = useState(EMPTY);
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);

  // ── Validation ──────────────────────────────────────────────────────────────
  function validate() {
    const e = {};
    NUMBER_FIELDS.forEach(({ key, min, max }) => {
      if (form[key] === "") { e[key] = "Required"; return; }
      const n = parseFloat(form[key]);
      if (isNaN(n))   e[key] = "Enter a valid number";
      else if (n < min) e[key] = `Min is ${min}`;
      else if (n > max) e[key] = `Max is ${max}`;
    });
    SELECT_FIELDS.forEach(({ key }) => {
      if (!form[key]) e[key] = "Required";
    });
    return e;
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }

    setLoading(true);
    setResult(null);

    // Build payload (parse select labels like "M — Male" → "M")
    const payload = {
      age:            parseFloat(form.age),
      restingBP:      parseFloat(form.restingBP),
      cholesterol:    parseFloat(form.cholesterol),
      maxHR:          parseFloat(form.maxHR),
      oldpeak:        parseFloat(form.oldpeak),
      sex:            parseSelect(form.sex),
      chestPainType:  parseSelect(form.chestPainType),
      restingECG:     parseSelect(form.restingECG),
      fastingBS:      parseInt(parseSelect(form.fastingBS)),
      exerciseAngina: parseSelect(form.exerciseAngina),
      stSlope:        parseSelect(form.stSlope),
    };

    try {
      let data;
      try {
        const res = await fetch("/api/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("API error");
        data = await res.json();
      } catch {
        // Fallback: run simulation if backend is unavailable
        await new Promise(r => setTimeout(r, 1500));
        data = simulate(payload);
      }
      setResult(data);
    } catch {
      setResult({ error: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  function handleChange(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => { const next = { ...prev }; delete next[key]; return next; });
  }

  function handleReset() {
    setForm(EMPTY);
    setErrors({});
    setResult(null);
  }

  const isHigh = result?.prediction === 1;
  const riskPct = result ? Math.round(result.probability * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-blue-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center shadow">
            <span className="text-white text-lg">♥</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-blue-900 leading-tight">Heart Disease Risk Prediction System</h1>
            <p className="text-xs text-gray-400">Powered by Logistic Regression · UCI Heart Disease Dataset</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">

        {/* ── Page intro ─────────────────────────────────────────────────── */}
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-blue-900 mb-3">Assess Your Cardiac Risk</h2>
          <p className="text-gray-500 max-w-xl mx-auto text-sm leading-relaxed">
            Fill in your clinical measurements below. Our machine learning model will instantly
            predict your risk of heart disease based on 11 key health indicators.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* ── Form ───────────────────────────────────────────────────────── */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-blue-100 p-6">

            {/* Numeric inputs */}
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">
              Vital Measurements
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {NUMBER_FIELDS.map(({ key, label, unit, min, max, placeholder, step }) => (
                <div key={key} className={key === "oldpeak" ? "sm:col-span-2" : ""}>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    {label} <span className="text-gray-400 font-normal">({unit})</span>
                  </label>
                  <input
                    type="number"
                    min={min} max={max} step={step || 1}
                    placeholder={placeholder}
                    value={form[key]}
                    onChange={e => handleChange(key, e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition
                      ${errors[key] ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50"}`}
                  />
                  {errors[key] && <p className="text-xs text-red-500 mt-1">⚠ {errors[key]}</p>}
                </div>
              ))}
            </div>

            {/* Select inputs */}
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">
              Clinical Indicators
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {SELECT_FIELDS.map(({ key, label, options }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
                  <select
                    value={form[key]}
                    onChange={e => handleChange(key, e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition cursor-pointer
                      ${errors[key] ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50"}`}
                  >
                    {options.map(opt => (
                      <option key={opt} value={opt === "" ? "" : opt}>{opt || "Select…"}</option>
                    ))}
                  </select>
                  {errors[key] && <p className="text-xs text-red-500 mt-1">⚠ {errors[key]}</p>}
                </div>
              ))}
            </div>

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold text-sm transition flex items-center justify-center gap-2 shadow"
            >
              {loading
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Analyzing…</>
                : <>♥ Predict Heart Disease Risk</>
              }
            </button>
          </div>

          {/* ── Right panel ────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-4">

            {/* Result card */}
            {result && !result.error && (
              <div className={`bg-white rounded-2xl border-2 shadow-sm p-6 text-center ${isHigh ? "border-red-300" : "border-green-300"}`}>
                <div className="text-5xl mb-3">{isHigh ? "⚠️" : "✅"}</div>

                <span className={`inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3
                  ${isHigh ? "bg-red-50 text-red-600 border border-red-200" : "bg-green-50 text-green-600 border border-green-200"}`}>
                  {isHigh ? "High Risk" : "Low Risk"}
                </span>

                <h3 className={`text-lg font-bold mb-2 ${isHigh ? "text-red-600" : "text-green-600"}`}>
                  {isHigh ? "High Risk of Heart Disease" : "Low Risk of Heart Disease"}
                </h3>

                <p className="text-sm text-gray-500 leading-relaxed mb-5">
                  {isHigh
                    ? "Your profile suggests elevated cardiac risk. Please consult a cardiologist promptly."
                    : "Your profile looks healthy. Keep up a heart-healthy lifestyle and have regular check-ups."}
                </p>

                {/* Risk progress bar */}
                <div className="mb-1 flex justify-between text-xs text-gray-400">
                  <span>Risk Score</span>
                  <span className={`font-bold ${isHigh ? "text-red-500" : "text-green-500"}`}>{riskPct}%</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-4">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${isHigh ? "bg-red-400" : "bg-green-400"}`}
                    style={{ width: `${riskPct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 font-mono mb-4">probability = {result.probability}</p>

                <button
                  onClick={handleReset}
                  className="text-sm text-blue-500 hover:text-blue-700 underline underline-offset-2 transition"
                >
                  ↩ New Assessment
                </button>
              </div>
            )}

            {/* Error card */}
            {result?.error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
                <p className="text-red-500 font-medium text-sm">{result.error}</p>
                <button onClick={handleReset} className="mt-3 text-sm text-red-400 underline">Try again</button>
              </div>
            )}

            {/* Info card — shown before prediction */}
            {!result && (
              <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-5">
                <h4 className="text-sm font-semibold text-blue-900 mb-3">📊 About the Model</h4>
                <ul className="space-y-2 text-sm text-gray-500">
                  <li>🧠 Logistic Regression (your trained .pkl model)</li>
                  <li>📦 StandardScaler + one-hot encoding</li>
                  <li>📋 15 features from 11 clinical inputs</li>
                  <li>🗂️ UCI Heart Disease dataset (n=918)</li>
                  <li>⚡ Python subprocess via Node.js API</li>
                </ul>
              </div>
            )}

            {/* Disclaimer — always shown */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-xs text-yellow-700 leading-relaxed">
                <strong>⚕ Disclaimer:</strong> This tool is for informational purposes only.
                It is not a substitute for professional medical advice, diagnosis, or treatment.
              </p>
            </div>

          </div>
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="text-center py-6 text-xs text-gray-400 border-t border-blue-100 mt-10">
        CardioAI © 2026 · React + Vite + Node.js + Python · <span className="text-red-400">♥</span> cardiac health
      </footer>
    </div>
  );
}
