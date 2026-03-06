import { useState } from "react";

const NUMBER_FIELDS = [
  {
    key: "age",
    label: "Age",
    unit: "yrs",
    min: 1,
    max: 120,
    placeholder: "e.g. 52",
  },
  {
    key: "restingBP",
    label: "Resting Blood Pressure",
    unit: "mmHg",
    min: 60,
    max: 250,
    placeholder: "e.g. 120",
  },
  {
    key: "cholesterol",
    label: "Cholesterol",
    unit: "mg/dL",
    min: 0,
    max: 700,
    placeholder: "e.g. 210",
  },
  {
    key: "maxHR",
    label: "Max Heart Rate",
    unit: "bpm",
    min: 50,
    max: 220,
    placeholder: "e.g. 150",
  },
  {
    key: "oldpeak",
    label: "Oldpeak (ST Depression)",
    unit: "mm",
    min: -5,
    max: 10,
    placeholder: "e.g. 1.2",
    step: 0.1,
  },
];

const SELECT_FIELDS = [
  {
    key: "sex",
    label: "Sex",
    options: [
      { value: "", label: "Select…" },
      { value: "M", label: "Male" },
      { value: "F", label: "Female" },
    ],
  },
  {
    key: "chestPainType",
    label: "Chest Pain Type",
    options: [
      { value: "", label: "Select…" },
      { value: "ASY", label: "Asymptomatic (ASY)" },
      { value: "ATA", label: "Atypical Angina (ATA)" },
      { value: "NAP", label: "Non-Anginal Pain (NAP)" },
      { value: "TA", label: "Typical Angina (TA)" },
    ],
  },
  {
    key: "restingECG",
    label: "Resting ECG",
    options: [
      { value: "", label: "Select…" },
      { value: "Normal", label: "Normal" },
      { value: "ST", label: "ST-T Abnormality" },
      { value: "LVH", label: "Left Ventricular Hypertrophy" },
    ],
  },
  {
    key: "fastingBS",
    label: "Fasting Blood Sugar > 120 mg/dL",
    options: [
      { value: "", label: "Select…" },
      { value: "0", label: "No  (≤ 120 mg/dL)" },
      { value: "1", label: "Yes (> 120 mg/dL)" },
    ],
  },
  {
    key: "exerciseAngina",
    label: "Exercise-Induced Angina",
    options: [
      { value: "", label: "Select…" },
      { value: "N", label: "No" },
      { value: "Y", label: "Yes" },
    ],
  },
  {
    key: "stSlope",
    label: "ST Slope",
    options: [
      { value: "", label: "Select…" },
      { value: "Up", label: "Upsloping" },
      { value: "Flat", label: "Flat" },
      { value: "Down", label: "Downsloping" },
    ],
  },
];

const EMPTY_FORM = {
  age: "",
  restingBP: "",
  cholesterol: "",
  maxHR: "",
  oldpeak: "",
  sex: "",
  chestPainType: "",
  restingECG: "",
  fastingBS: "",
  exerciseAngina: "",
  stSlope: "",
};

export default function App() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  function validate() {
    const e = {};
    NUMBER_FIELDS.forEach(({ key, min, max }) => {
      if (form[key] === "") {
        e[key] = "Required";
        return;
      }
      const n = parseFloat(form[key]);
      if (isNaN(n)) e[key] = "Enter a valid number";
      else if (n < min) e[key] = `Min is ${min}`;
      else if (n > max) e[key] = `Max is ${max}`;
    });
    SELECT_FIELDS.forEach(({ key }) => {
      if (!form[key]) e[key] = "Required";
    });
    return e;
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          age: parseFloat(form.age),
          restingBP: parseFloat(form.restingBP),
          cholesterol: parseFloat(form.cholesterol),
          maxHR: parseFloat(form.maxHR),
          oldpeak: parseFloat(form.oldpeak),
          fastingBS: parseInt(form.fastingBS),
        }),
      });
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({
        error:
          "Could not connect to the server. Make sure the backend is running.",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleChange(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function handleReset() {
    setForm(EMPTY_FORM);
    setErrors({});
    setResult(null);
  }

  const isHigh = result?.prediction === 1;
  const riskPct = result ? Math.round(result.probability * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <header className="bg-white border-b border-blue-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center shadow">
            <span className="text-white text-lg">♥</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-blue-900">
              Heart Disease Risk Prediction System
            </h1>
            <p className="text-xs text-gray-400">
              Powered by Machine Learning · UCI Heart Disease Dataset
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-blue-900 mb-3">
            Assess Your Cardiac Risk
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-sm leading-relaxed">
            Fill in your clinical measurements below. Our machine learning model
            will instantly predict your risk of heart disease based on 11 key
            health indicators.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Form card */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-blue-100 p-6">
            {/* Numeric fields */}
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
              Vital Measurements
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {NUMBER_FIELDS.map(
                ({ key, label, unit, min, max, placeholder, step }) => (
                  <div
                    key={key}
                    className={key === "oldpeak" ? "sm:col-span-2" : ""}
                  >
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      {label}{" "}
                      <span className="text-gray-400 font-normal">
                        ({unit})
                      </span>
                    </label>
                    <input
                      type="number"
                      min={min}
                      max={max}
                      step={step || 1}
                      placeholder={placeholder}
                      value={form[key]}
                      onChange={(e) => handleChange(key, e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition
                      ${errors[key] ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50"}`}
                    />
                    {errors[key] && (
                      <p className="text-xs text-red-500 mt-1">
                        ⚠ {errors[key]}
                      </p>
                    )}
                  </div>
                ),
              )}
            </div>

            {/* Select fields */}
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
              Clinical Indicators
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {SELECT_FIELDS.map(({ key, label, options }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    {label}
                  </label>
                  <select
                    value={form[key]}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition cursor-pointer
                      ${errors[key] ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50"}`}
                  >
                    {options.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  {errors[key] && (
                    <p className="text-xs text-red-500 mt-1">⚠ {errors[key]}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold text-sm transition flex items-center justify-center gap-2 shadow"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{" "}
                  Analyzing…
                </>
              ) : (
                "♥  Predict Heart Disease Risk"
              )}
            </button>
          </div>

          {/* Right panel */}
          <div className="flex flex-col gap-4">
            {/* Result card */}
            {result && !result.error && (
              <div
                className={`bg-white rounded-2xl border-2 shadow-sm p-6 text-center ${isHigh ? "border-red-300" : "border-green-300"}`}
              >
                <div className="text-5xl mb-3">{isHigh ? "⚠️" : "✅"}</div>

                <span
                  className={`inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3
                  ${isHigh ? "bg-red-50 text-red-600 border border-red-200" : "bg-green-50 text-green-600 border border-green-200"}`}
                >
                  {isHigh ? "High Risk" : "Low Risk"}
                </span>

                <h3
                  className={`text-lg font-bold mb-2 ${isHigh ? "text-red-600" : "text-green-600"}`}
                >
                  {isHigh
                    ? "High Risk of Heart Disease"
                    : "Low Risk of Heart Disease"}
                </h3>

                <p className="text-sm text-gray-500 leading-relaxed mb-5">
                  {isHigh
                    ? "Your profile suggests elevated cardiac risk. Please consult a cardiologist promptly."
                    : "Your profile looks healthy. Keep up a heart-healthy lifestyle and have regular check-ups."}
                </p>

                {/* Risk bar */}
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Risk Score</span>
                  <span
                    className={`font-bold ${isHigh ? "text-red-500" : "text-green-500"}`}
                  >
                    {riskPct}%
                  </span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-5">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${isHigh ? "bg-red-400" : "bg-green-400"}`}
                    style={{ width: `${riskPct}%` }}
                  />
                </div>

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
                <p className="text-red-600 font-medium text-sm mb-3">
                  {result.error}
                </p>
                <button
                  onClick={handleReset}
                  className="text-sm text-red-400 underline"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Disclaimer */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-xs text-yellow-700 leading-relaxed">
                <strong>⚕ Disclaimer:</strong> This tool is for informational
                purposes only. It is not a substitute for professional medical
                advice, diagnosis, or treatment.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-gray-400 border-t border-blue-100 mt-10">
        CardioAI © 2026 · React + Vite + Node.js + Python
      </footer>
    </div>
  );
}
