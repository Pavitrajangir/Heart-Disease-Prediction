const { PythonShell } = require("python-shell");
const path = require("path");

exports.predictHeart = async (req, res) => {

  const inputData = req.body;

  let options = {
    mode: "text",
    pythonOptions: ["-u"],
    scriptPath: path.join(__dirname, "../model"),
    args: [JSON.stringify(inputData)]
  };

  PythonShell.run("predict.py", options, function (err, results) {

    if (err) {
      console.log(err);
      return res.status(500).json({ error: "Prediction failed" });
    }

    const prediction = results[0];

      // console.log("Prediction result:", prediction);

    res.json({
      prediction: prediction
    });

  });

};