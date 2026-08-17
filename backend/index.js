require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const eventRoutes = require("./routes/eventRoutes");
const registrationRoutes = require("./routes/registrationRoutes");
const adminRoutes = require("./routes/adminRoutes");
const clubRoutes = require("./routes/clubRoutes");
const clubMembershipRoutes = require("./routes/clubMembershipRoutes");

const app = express();

connectDB();

// CORS must allow the frontend's exact origin AND credentials, or the
// browser will silently refuse to send/receive the auth cookie.
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Serve uploaded event images statically at /uploads/<filename>
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.json({ message: "PCPS Connect API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/clubs", clubRoutes);
app.use("/api/club-memberships", clubMembershipRoutes);

// 404 handler for unmatched API routes
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Central error handler -- catches multer errors (bad file type, size limit)
// and anything else thrown/passed to next(err)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`PCPS Connect API listening on http://localhost:${PORT}`);
});
