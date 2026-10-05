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
    emailVerified: user.emailVerified,
    approvalStatus: user.approvalStatus,
    avatar: user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}&backgroundColor=4F46E5`,
  };
}

const ALLOWED_EMAIL_DOMAIN = "@patancollege.edu.np";

async function sendVerificationEmail(user) {
  const verifyToken = jwt.sign(
    { id: user._id, purpose: "email-verify" },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );
  const verifyUrl = `${process.env.CLIENT_ORIGIN}/verify-email?token=${verifyToken}`;

  await sendEmail({
    to: user.email,
    subject: "Verify your PCPS Connect account",
    html: `
      <p>Hi ${user.name},</p>
      <p>Thanks for registering for PCPS Connect. Click the link below to verify your email address. This link expires in 24 hours.</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p>After verifying, an admin will need to approve your account before you can log in -- you'll be able to log in as soon as that happens.</p>
    `,
  });
}

// POST /api/auth/register
async function register(req, res) {
  try {
    const { name, email, password, studentId, program, semester, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
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
      // Deliberately never reads a role from the request body -- otherwise
      // anyone calling this endpoint directly (bypassing the UI, which never
      // offers a role field) could self-register as "admin" and later gain
      // full admin access the moment any admin approved what looked like an
      // ordinary pending student account. Admins are only ever created by
      // promoting an existing user from the admin panel.
      role: "user",
      studentId: studentId || "",
      program: program || "",
      semester: semester || "",
      phone: phone || "",
    });

    try {
      await sendVerificationEmail(user);
    } catch (emailErr) {
      console.error("Failed to send verification email:", emailErr.message);
    }

    res.status(201).json({
      message: "Account created. Check your email to verify your account before logging in.",
      user: publicUser(user),
    });
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

    if (!user.emailVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in. Check your inbox for the verification link.",
        code: "EMAIL_NOT_VERIFIED",
      });
    }

    if (user.approvalStatus === "pending") {
      return res.status(403).json({
        message: "Your account is awaiting admin approval. You'll be able to log in once it's approved.",
        code: "APPROVAL_PENDING",
      });
    }

    if (user.approvalStatus === "rejected") {
      return res.status(403).json({
        message: "Your registration was not approved. Contact PCPS administration for help.",
        code: "APPROVAL_REJECTED",
      });
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

// PUT /api/auth/change-password  (requires login, current password required)
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    // req.user comes from the protect middleware, which doesn't select the
    // password field (it's select: false on the schema), so it has to be
    // fetched again here.
    const user = await User.findById(req.user._id).select("+password");

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to change password" });
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

// POST /api/auth/verify-email
async function verifyEmail(req, res) {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Token is required" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ message: "This verification link is invalid or has expired" });
    }

    if (decoded.purpose !== "email-verify") {
      return res.status(400).json({ message: "This verification link is invalid or has expired" });
    }

    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "Account not found" });

    if (user.emailVerified) {
      return res.status(200).json({ message: "Your email is already verified. You can log in once an admin approves your account." });
    }

    user.emailVerified = true;
    await user.save();

    // Let an admin know a verified student is now waiting for approval.
    // Best-effort -- a failed notification shouldn't fail the verification.
    try {
      const receiver = process.env.CONTACT_RECEIVER_EMAIL || process.env.EMAIL_USER;
      await sendEmail({
        to: receiver,
        subject: "PCPS Connect: new account awaiting approval",
        html: `
          <p>${user.name} (${user.email}) just verified their email and is waiting for approval.</p>
          <p>Log in to the admin panel to approve or reject this account.</p>
        `,
      });
    } catch (notifyErr) {
      console.error("Failed to send admin approval notification:", notifyErr.message);
    }

    res.status(200).json({
      message: "Email verified! An admin will review your account -- you'll be able to log in once it's approved.",
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to verify email" });
  }
}

// POST /api/auth/resend-verification
// Same generic-response pattern as forgotPassword.
async function resendVerification(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const genericResponse = {
      message: "If that account needs verification, a new link has been sent.",
    };

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || user.emailVerified) return res.status(200).json(genericResponse);

    try {
      await sendVerificationEmail(user);
    } catch (emailErr) {
      console.error("Failed to resend verification email:", emailErr.message);
    }

    res.status(200).json(genericResponse);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to process request" });
  }
}

module.exports = {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  toggleFavoriteClub,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
};
