const express = require("express");
const { getNotice } = require("../controllers/noticeController");

const router = express.Router();

router.get("/", getNotice);

module.exports = router;
