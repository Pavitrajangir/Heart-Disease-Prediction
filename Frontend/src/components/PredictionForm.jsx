import { useState } from "react";
import axios from "axios";

const PredictionForm = () => {
  const [formData, setFormData] = useState({
    Age: "",
    RestingBP: "",
    Cholesterol: "",
    FastingBS: 0,
    MaxHR: "",
    Oldpeak: "",
    Sex: "M",
    ChestPainType: "ATA",
    RestingECG: "Normal",
    ExerciseAngina: "N",
    ST_Slope: "Up",
  });

  const [result, setResult] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

const handleSubmit = async (e) => {
  e.preventDefault();

  console.log("Predict clicked");

  const data = {
    Age: Number(formData.Age),
    RestingBP: Number(formData.RestingBP),
    Cholesterol: Number(formData.Cholesterol),
    FastingBS: Number(formData.FastingBS),
    MaxHR: Number(formData.MaxHR),
    Oldpeak: Number(formData.Oldpeak),

    ["Sex_" + formData.Sex]: 1,
    ["ChestPainType_" + formData.ChestPainType]: 1,
    ["RestingECG_" + formData.RestingECG]: 1,
    ["ExerciseAngina_" + formData.ExerciseAngina]: 1,
    ["ST_Slope_" + formData.ST_Slope]: 1,
  };

  console.log("Sending data:", data);
  console.log("About to send request");

  try {
    const response = await axios.post(
      "http://localhost:5000/api/predict",
      data
    );

    console.log("Response:", response.data);

    setResult(response.data.prediction);

  } catch (error) {
    console.error("Error:", error);
  }
};

  return (
    <div className="form-container">
      <form onSubmit={handleSubmit}>
<input
  type="number"
  name="Age"
  value={formData.Age}
  placeholder="Age"
  onChange={handleChange}
  required
/>

<input
  type="number"
  name="RestingBP"
  value={formData.RestingBP}
  placeholder="Resting Blood Pressure"
  onChange={handleChange}
  required
/>

<input
  type="number"
  name="Cholesterol"
  value={formData.Cholesterol}
  placeholder="Cholesterol"
  onChange={handleChange}
  required
/>

<input
  type="number"
  name="MaxHR"
  value={formData.MaxHR}
  placeholder="Max Heart Rate"
  onChange={handleChange}
  required
/>

<input
  type="number"
  name="Oldpeak"
  value={formData.Oldpeak}
  placeholder="Oldpeak"
  onChange={handleChange}
  required
/>

        <label>Sex</label>
        <select name="Sex" value={formData.Sex} onChange={handleChange}>
          <option value="M">Male</option>
          <option value="F">Female</option>
        </select>

        <label>Chest Pain Type</label>
        <select name="ChestPainType" value={formData.ChestPainType} onChange={handleChange}>
          <option value="ATA">ATA</option>
          <option value="NAP">NAP</option>
          <option value="TA">TA</option>
          <option value="ASY">ASY</option>
        </select>

        <label>Resting ECG</label>
        <select name="RestingECG" value={formData.RestingECG} onChange={handleChange}>
          <option value="Normal">Normal</option>
          <option value="ST">ST</option>
          <option value="LVH">LVH</option>
        </select>

        <label>Exercise Angina</label>
<select name="ExerciseAngina" value={formData.ExerciseAngina} onChange={handleChange}>
          <option value="Y">Yes</option>
          <option value="N">No</option>
        </select>

        <label>ST Slope</label>
        <select name="ST_Slope" value={formData.ST_Slope} onChange={handleChange}>
          <option value="Up">Up</option>
          <option value="Flat">Flat</option>
          <option value="Down">Down</option>
        </select>

        <button type="submit">Predict</button>
      </form>

      {result !== null && (
        <div className="result">
          {result === 1 ? (
            <h2 className="high-risk">⚠ High Risk of Heart Disease</h2>
          ) : (
            <h2 className="low-risk">✓ Low Risk of Heart Disease</h2>
          )}
        </div>
      )}
    </div>
  );
};

export default PredictionForm;
