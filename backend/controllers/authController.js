const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

function sendTokenCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    studentId: user.studentId || "",
    program: user.program || "",
    semester: user.semester || "",
    phone: user.phone || "",
    favoriteClub: user.favoriteClub || null,
    avatar: user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}&backgroundColor=4F46E5`,
  };
}

const ALLOWED_EMAIL_DOMAIN = "@patancollege.edu.np";

// POST /api/auth/register
async function register(req, res) {
  try {
    const { name, email, password, role, studentId, program, semester, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    // Restricted to real PCPS accounts. This only applies at registration
    // time -- existing accounts (including ones created before this rule
    // existed) can still log in with whatever email they already have.
    if (!email.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN)) {
      return res.status(400).json({
        message: `Registration is limited to PCPS email addresses (${ALLOWED_EMAIL_DOMAIN})`,
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role === "admin" ? "admin" : "user",
      studentId: studentId || "",
      program: program || "",
      semester: semester || "",
      phone: phone || "",
    });

    res.status(201).json({ message: "User registered successfully", user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ message: err.message || "Registration failed" });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = signToken(user._id);
    sendTokenCookie(res, token);

    res.status(200).json({ message: "Login successful", user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ message: err.message || "Login failed" });
  }
}

// POST /api/auth/logout
async function logout(req, res) {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
  res.status(200).json({ message: "Logged out successfully" });
}

// GET /api/auth/me  -- lets the frontend check "am I still logged in" on page load
async function getMe(req, res) {
  res.status(200).json({ user: publicUser(req.user) });
}

// PUT /api/auth/profile  -- update your own profile (requires login)
async function updateProfile(req, res) {
  try {
    const allowedFields = ["name", "studentId", "program", "semester", "phone", "avatar"];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ message: "Profile updated", user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to update profile" });
  }
}

// PUT /api/auth/favorite-club  -- set or clear your one favorite club
// (requires login). Deliberately independent of ClubMembership: favoriting
// a club is just a bookmark and never implies joining it.
async function toggleFavoriteClub(req, res) {
  try {
    const { clubId } = req.body;
    if (!clubId) return res.status(400).json({ message: "clubId is required" });

    const Club = require("../models/Club");
    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ message: "Club not found" });

    const isSameFavorite = req.user.favoriteClub?.toString() === clubId;
    req.user.favoriteClub = isSameFavorite ? null : clubId;
    await req.user.save();

    res.status(200).json({ message: "Favorite updated", user: publicUser(req.user) });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to update favorite" });
  }
}

// POST /api/auth/forgot-password
// Always responds with the same generic message whether or not the email
// is registered -- this prevents someone from using this endpoint to
// discover which emails have accounts (a common security consideration).
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const genericResponse = {
      message: "If an account exists for that email, a reset link has been sent.",
    };

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(200).json(genericResponse);

    const resetToken = jwt.sign(
      { id: user._id, purpose: "password-reset" },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const resetUrl = `${process.env.CLIENT_ORIGIN}/reset-password?token=${resetToken}`;

    try {
      await sendEmail({
        to: user.email,
        subject: "Reset your PCPS Connect password",
        html: `
          <p>Hi ${user.name},</p>
          <p>Someone requested a password reset for your PCPS Connect account. If this was you, click the link below to set a new password. This link expires in 15 minutes.</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>If you didn't request this, you can safely ignore this email -- your password won't be changed.</p>
        `,
      });
    } catch (emailErr) {
      // Log for debugging but still return the generic response -- the
      // person shouldn't learn anything about the underlying failure.
      console.error("Failed to send password reset email:", emailErr.message);
    }

    res.status(200).json(genericResponse);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to process request" });
  }
}

// POST /api/auth/reset-password
async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ message: "This reset link is invalid or has expired" });
    }

    if (decoded.purpose !== "password-reset") {
      return res.status(400).json({ message: "This reset link is invalid or has expired" });
    }

    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "Account not found" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ message: "Password reset successfully. You can now log in." });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to reset password" });
  }
}

module.exports = {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  toggleFavoriteClub,
  forgotPassword,
  resetPassword,
};
