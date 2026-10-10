require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const { safeError } = require("./utils/errorMessage");

const authRoutes = require("./routes/authRoutes");
const eventRoutes = require("./routes/eventRoutes");
const registrationRoutes = require("./routes/registrationRoutes");
const adminRoutes = require("./routes/adminRoutes");
const clubRoutes = require("./routes/clubRoutes");
const clubMembershipRoutes = require("./routes/clubMembershipRoutes");
const contactRoutes = require("./routes/contactRoutes");
const statsRoutes = require("./routes/statsRoutes");

const app = express();

connectDB();

app.set("trust proxy", 1);

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({ message: "PCPS Connect API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/clubs", clubRoutes);
app.use("/api/club-memberships", clubMembershipRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/stats", statsRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
  const isUploadError =
    err.name === "MulterError" ||
    err.message === "Only image files (jpg, png, webp, gif) are allowed";
  if (isUploadError) {
    return res.status(err.status || 400).json({ message: err.message });
  }
  res.status(err.status || 500).json({ message: safeError(err, "Server error") });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`PCPS Connect API listening on http://localhost:${PORT}`);
});