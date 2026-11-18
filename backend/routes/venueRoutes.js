const express = require("express");
const { listVenues } = require("../controllers/venueController");

const router = express.Router();

router.get("/", listVenues);

module.exports = router;
