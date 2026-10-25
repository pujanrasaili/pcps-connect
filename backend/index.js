require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const { safeError } = require("./utils/errorMessage");
const { requireCsrfHeader } = require("./middleware/csrf");
const { checkEnv } = require("./utils/envCheck");
const { clientRequestError } = require("./utils/requestErrors");

const authRoutes = require("./routes/authRoutes");
const eventRoutes = require("./routes/eventRoutes");
const registrationRoutes = require("./routes/registrationRoutes");
const adminRoutes = require("./routes/adminRoutes");
const clubRoutes = require("./routes/clubRoutes");
const clubMembershipRoutes = require("./routes/clubMembershipRoutes");
const contactRoutes = require("./routes/contactRoutes");
const statsRoutes = require("./routes/statsRoutes");
const noticeRoutes = require("./routes/noticeRoutes");
const leaderRoutes = require("./routes/leaderRoutes");
const waitlistRoutes = require("./routes/waitlistRoutes");
const certificateRoutes = require("./routes/certificateRoutes");
const healthRoutes = require("./routes/healthRoutes");

const app = express();

const { fatal, warnings } = checkEnv();
warnings.forEach((w) => console.warn("Config warning:", w));
if (fatal.length > 0) {
  fatal.forEach((f) => console.error("Config error:", f));
  process.exit(1);
}

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

// Runs before every route (multer parses multipart bodies per-route
// further down, which is unaffected -- this only reads the header).
app.use(requireCsrfHeader);

app.get("/", (req, res) => {
  res.json({ message: "PCPS Connect API is running" });
});

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/clubs", clubRoutes);
app.use("/api/club-memberships", clubMembershipRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/notice", noticeRoutes);
app.use("/api/leader", leaderRoutes);
app.use("/api/waitlist", waitlistRoutes);
app.use("/api/certificates", certificateRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
  const clientError = clientRequestError(err);
  if (clientError) return res.status(clientError.status).json({ message: clientError.message });
  const isUploadError =
    err.name === "MulterError" ||
    err.message === "Only image files (jpg, png, webp, gif) are allowed";
  if (isUploadError) {
    return res.status(err.status || 400).json({ message: err.message });
  }
  res.status(err.status || 500).json({ message: safeError(err, "Server error") });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`PCPS Connect API listening on http://localhost:${PORT}`);
});

// Render stops the old copy with SIGTERM on every deploy. Finish the requests
// already in flight (a registration, an email being sent) before exiting,
// rather than cutting them off mid-way; give up after 10 seconds.
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down...");
  setTimeout(() => process.exit(0), 10000).unref();
  server.close(() => {
    require("mongoose").connection.close().finally(() => process.exit(0));
  });
});