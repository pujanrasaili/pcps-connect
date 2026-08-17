const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

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

// POST /api/auth/register
async function register(req, res) {
  try {
    const { name, email, password, role, studentId, program, semester, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
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

module.exports = { register, login, logout, getMe, updateProfile, toggleFavoriteClub };
