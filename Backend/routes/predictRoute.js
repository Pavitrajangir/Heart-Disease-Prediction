const express = require("express");
const router = express.Router();

const { predictHeart } = require("../controllers/predictController");

router.post("/predict", predictHeart);

module.exports = router;