const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// Serve built React frontend
app.use(express.static(path.join(__dirname, "dist")));

app.post("/api/predict", (req, res) => {
  // Validate all required fields are present
  const required = [
    "age",
    "restingBP",
    "cholesterol",
    "fastingBS",
    "maxHR",
    "oldpeak",
    "sex",
    "chestPainType",
    "restingECG",
    "exerciseAngina",
    "stSlope",
  ];

  for (const field of required) {
    if (req.body[field] === undefined || req.body[field] === "") {
      return res.status(400).json({ error: `Missing field: ${field}` });
    }
  }

  // Use "python" on Windows, "python3" on Mac/Linux
  const pythonCmd = process.platform === "win32" ? "python" : "python3";
  const scriptPath = path.join(__dirname, "predict.py");

  // Spawn Python and send JSON via stdin (avoids Windows shell quoting issues)
  const python = spawn(pythonCmd, [scriptPath]);

  let output = "";
  let errorOut = "";

  python.stdout.on("data", (data) => {
    output += data.toString();
  });
  python.stderr.on("data", (data) => {
    errorOut += data.toString();
  });

  python.on("close", (code) => {
    if (code !== 0) {
      console.error("Python stderr:", errorOut);
      return res
        .status(500)
        .json({ error: "Model prediction failed.", details: errorOut });
    }
    try {
      const result = JSON.parse(output.trim());
      return res.json(result);
    } catch {
      return res
        .status(500)
        .json({ error: "Failed to parse model output.", raw: output });
    }
  });

  python.on("error", (err) => {
    console.error("Failed to start Python:", err.message);
    return res.status(500).json({
      error:
        "Could not start Python. Make sure Python is installed and added to PATH.",
    });
  });

  // Send the form data to Python via stdin and close the pipe
  python.stdin.write(JSON.stringify(req.body));
  python.stdin.end();
});

// Catch-all: serve React app (Express v5 compatible)
app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🫀 CardioAI running at http://localhost:${PORT}`);
  console.log(`   Platform : ${process.platform}`);
  console.log(
    `   Python   : ${process.platform === "win32" ? "python" : "python3"}\n`,
  );
});
