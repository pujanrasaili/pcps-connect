const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { cleanProfileFields } = require("../utils/profileFields");
const sendEmail = require("../utils/sendEmail");
const renderEmail = require("../utils/emailTemplate");
const { safeError } = require("../utils/errorMessage");
const { escapeHtml } = require("../utils/escapeHtml");
const { removeUserAndData } = require("../utils/deleteAccountData");
const { buildPersonalData } = require("../utils/personalData");
const Registration = require("../models/Registration");
const WaitlistEntry = require("../models/WaitlistEntry");
const ClubMembership = require("../models/ClubMembership");
const Club = require("../models/Club");
const { recordAudit } = require("../utils/audit");

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
    eventReminders: user.eventReminders !== false,
    clubUpdates: user.clubUpdates !== false,
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
    html: renderEmail({
      heading: "Verify your email",
      bodyHtml: `
        <p style="margin: 0 0 12px;">Hi ${escapeHtml(user.name)},</p>
        <p style="margin: 0;">Thanks for registering for PCPS Connect. Click below to verify your email address. This link expires in 24 hours.</p>
        <p style="margin: 16px 0 0;">After verifying, an admin will need to approve your account before you can log in -- you'll be able to log in as soon as that happens.</p>
      `,
      ctaText: "Verify my email",
      ctaUrl: verifyUrl,
    }),
  });
}

// Standard security practice (Google, GitHub, etc. all do this): whoever's
// password just changed should hear about it immediately, however it
// happened. This matters most of all for a reset, since that's exactly the
// path an attacker who already has your password would use to lock you
// out -- if that happens, this is what tells the real owner something's
// wrong, even though they're not logged in to see anything in the app
// itself. Best-effort, like every other email here.
async function sendPasswordChangedNotice(user) {
  await sendEmail({
    to: user.email,
    subject: "Your PCPS Connect password was changed",
    html: renderEmail({
      heading: "Password changed",
      bodyHtml: `
        <p style="margin: 0 0 12px;">Hi ${escapeHtml(user.name)},</p>
        <p style="margin: 0;">This is a confirmation that your PCPS Connect password was just changed.</p>
        <p style="margin: 16px 0 0;">If this was you, no action is needed. If you didn't do this, your account may be compromised -- contact PCPS administration right away.</p>
      `,
    }),
  });
}

// POST /api/auth/register
async function register(req, res) {
  try {
    const { name, email, password, studentId, program, semester, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }
    // JSON can carry objects/arrays where strings belong; without this they
    // fall through to .toLowerCase()/bcrypt below and come back as a 500.
    if ([name, email, password].some((v) => typeof v !== "string")) {
      return res.status(400).json({ message: "Invalid form data" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const { values: profile, error: profileError } = cleanProfileFields({ name, studentId, program, semester, phone });
    if (profileError) return res.status(400).json({ message: profileError });

    // The frontend already checks this shape (see Register.jsx), but that's
    // not a security boundary -- a direct API call bypasses it entirely, so
    // it's repeated here too, same reasoning as the admin self-demotion
    // checks in adminController.
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address" });
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
      name: profile.name,
      email: email.toLowerCase(),
      password: hashedPassword,
      // Deliberately never reads a role from the request body -- otherwise
      // anyone calling this endpoint directly (bypassing the UI, which never
      // offers a role field) could self-register as "admin" and later gain
      // full admin access the moment any admin approved what looked like an
      // ordinary pending student account. Admins are only ever created by
      // promoting an existing user from the admin panel.
      role: "user",
      studentId: profile.studentId || "",
      program: profile.program || "",
      semester: profile.semester || "",
      phone: profile.phone || "",
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
    res.status(500).json({ message: safeError(err, "Registration failed") });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ message: "Invalid email or password" });
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
    res.status(500).json({ message: safeError(err, "Login failed") });
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
    // Only the whitelisted profile fields are read from the body (so role,
    // approval status, email etc. can't be set here), each type- and
    // length-checked.
    const { values: updates, error: profileError } = cleanProfileFields(req.body);
    if (profileError) return res.status(400).json({ message: profileError });

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ message: "Profile updated", user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to update profile") });
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
    res.status(500).json({ message: safeError(err, "Failed to update favorite") });
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
    user.passwordChangedAt = new Date();
    await user.save();

    // passwordChangedAt invalidates every token issued before this instant,
    // including the one in this very request's cookie -- re-issue a fresh
    // one so the device that just changed the password stays logged in;
    // any other device/browser holding the old token gets logged out.
    const token = signToken(user._id);
    sendTokenCookie(res, token);

    try {
      await sendPasswordChangedNotice(user);
    } catch (emailErr) {
      console.error("Failed to send password-changed notice:", emailErr.message);
    }

    res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to change password") });
  }
}

// GET /api/auth/export  (requires login)
// Everything the app stores about the logged-in person, as a JSON download.
async function exportMyData(req, res) {
  try {
    const [user, registrations, waitlist, memberships, ledClubs] = await Promise.all([
      User.findById(req.user._id).populate("favoriteClub", "name"),
      Registration.find({ user: req.user._id }).populate("event", "title date").sort({ createdAt: 1 }),
      WaitlistEntry.find({ user: req.user._id }).populate("event", "title date").sort({ createdAt: 1 }),
      ClubMembership.find({ user: req.user._id }).populate("club", "name").sort({ createdAt: 1 }),
      Club.find({ leaders: req.user._id }).select("name").sort({ name: 1 }),
    ]);
    if (!user) return res.status(404).json({ message: "Account not found" });
    res.status(200).json(buildPersonalData({ user, registrations, waitlist, memberships, ledClubs }));
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to export your data") });
  }
}

// DELETE /api/auth/account  { password }  (requires login)
// Lets a student delete their own account and everything attached to it.
// Needs the password again so a stolen session can't wipe someone's account.
// Admins can't use this -- an admin has to be demoted (or removed) by another
// admin, which also guarantees there is always an admin left.
async function deleteAccount(req, res) {
  try {
    const { password } = req.body;
    if (!password || typeof password !== "string") {
      return res.status(400).json({ message: "Enter your password to delete your account" });
    }
    if (req.user.role === "admin") {
      return res.status(403).json({
        message: "Admin accounts can't be deleted here. Ask another admin to change your role or remove the account.",
      });
    }

    const user = await User.findById(req.user._id).select("+password");
    if (!user) return res.status(404).json({ message: "Account not found" });
    if (!(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: "Password is incorrect" });
    }

    const { name, email } = user;
    await removeUserAndData(user);
    await recordAudit({ name }, "user.selfDeleted", `${name} (${email}) deleted their own account`);

    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    try {
      await sendEmail({
        to: email,
        subject: "Your PCPS Connect account was deleted",
        html: renderEmail({
          heading: "Account deleted",
          bodyHtml: `
            <p style="margin: 0 0 12px;">Hi ${escapeHtml(name)},</p>
            <p style="margin: 0;">Your PCPS Connect account and its registrations, club memberships and events have been deleted. If this wasn't you, contact the college administration right away.</p>
          `,
        }),
      });
    } catch (emailErr) {
      console.error("Failed to send account-deleted notice:", emailErr.message);
    }

    res.status(200).json({ message: "Your account has been deleted" });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to delete account") });
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
        html: renderEmail({
          heading: "Reset your password",
          bodyHtml: `
            <p style="margin: 0 0 12px;">Hi ${escapeHtml(user.name)},</p>
            <p style="margin: 0;">Someone requested a password reset for your PCPS Connect account. If this was you, click below to set a new password. This link expires in 15 minutes.</p>
            <p style="margin: 16px 0 0;">If you didn't request this, you can safely ignore this email -- your password won't be changed.</p>
          `,
          ctaText: "Reset my password",
          ctaUrl: resetUrl,
        }),
      });
    } catch (emailErr) {
      console.error("Failed to send password reset email:", emailErr.message);
    }

    res.status(200).json(genericResponse);
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to process request") });
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

    // This JWT stays valid for its full 15-minute expiry no matter how many
    // times it's used -- without this check, someone who intercepted the
    // reset link could replay it to reset the password again after the
    // legitimate user already used it once. Once a reset has happened,
    // reject any reset token issued before that moment (covers both a
    // replay of this exact token and an older unused one from an earlier
    // "forgot password" request).
    if (user.passwordChangedAt) {
      const changedAtSeconds = Math.floor(user.passwordChangedAt.getTime() / 1000);
      if (decoded.iat < changedAtSeconds) {
        return res.status(400).json({ message: "This reset link is invalid or has expired" });
      }
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordChangedAt = new Date();
    await user.save();

    try {
      await sendPasswordChangedNotice(user);
    } catch (emailErr) {
      console.error("Failed to send password-changed notice:", emailErr.message);
    }

    res.status(200).json({ message: "Password reset successfully. You can now log in." });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to reset password") });
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
      const adminUsersUrl = `${process.env.CLIENT_ORIGIN}/admin/users`;
      await sendEmail({
        to: receiver,
        subject: "PCPS Connect: new account awaiting approval",
        html: renderEmail({
          heading: "New account awaiting approval",
          bodyHtml: `
            <p style="margin: 0;"><strong>${escapeHtml(user.name)}</strong> (${escapeHtml(user.email)}) just verified their email and is waiting for approval.</p>
          `,
          ctaText: "Review in admin panel",
          ctaUrl: adminUsersUrl,
        }),
      });
    } catch (notifyErr) {
      console.error("Failed to send admin approval notification:", notifyErr.message);
    }

    res.status(200).json({
      message: "Email verified! An admin will review your account -- you'll be able to log in once it's approved.",
    });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to verify email") });
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
    res.status(500).json({ message: safeError(err, "Failed to process request") });
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
  deleteAccount,
  exportMyData,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
};
