import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaUser, FaEnvelope, FaLock, FaIdCard } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Button from "../components/Button";
import logo from "../assets/images/pcps-shield.png";

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    studentId: "",
    password: "",
    confirmPassword: "",
    agree: false,
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = "Full name is required.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      next.email = "Enter a valid email address.";
    } else if (!form.email.toLowerCase().endsWith("@patancollege.edu.np")) {
      next.email = "Registration is limited to PCPS email addresses (@patancollege.edu.np).";
    }
    if (!form.studentId.trim()) next.studentId = "Student ID is required.";
    if (form.password.length < 6) next.password = "Password must be at least 6 characters.";
    if (form.password !== form.confirmPassword) next.confirmPassword = "Passwords do not match.";
    if (!form.agree) next.agree = "You must accept the terms to continue.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    const result = await register(form);
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    // Every fresh account needs email verification (and then admin
    // approval) before it can log in -- so registration never lands
    // someone straight in the dashboard anymore.
    toast.success("Account created! Check your email to verify your account before logging in.");
    navigate("/login", { replace: true });
  };

  return (
    <div className="section-y flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img src={logo} alt="PCPS" className="mx-auto h-16 w-auto animate-tilt-idle" style={{ transformStyle: "preserve-3d" }} />
          <h1 className="mt-4 font-display text-2xl font-bold text-slate-800 dark:text-slate-100">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Join clubs and register for events at PCPS
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card-surface space-y-4 p-6 sm:p-8" noValidate>
          <div>
            <label htmlFor="reg-name" className="label-field">Full name</label>
            <div className="relative">
              <FaUser className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="reg-name"
                name="name"
                className="input-field"
                style={{ paddingLeft: "2.75rem" }}
                placeholder="Your full name"
                value={form.name}
                onChange={handleChange}
              />
            </div>
            {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="reg-email" className="label-field">Email address</label>
            <div className="relative">
              <FaEnvelope className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="reg-email"
                name="email"
                type="email"
                className="input-field"
                style={{ paddingLeft: "2.75rem" }}
                placeholder="you@patancollege.edu.np"
                value={form.email}
                onChange={handleChange}
              />
            </div>
            {errors.email ? (
              <p className="mt-1 text-xs text-rose-500">{errors.email}</p>
            ) : (
              <p className="mt-1 text-xs text-slate-400">Must be a PCPS email address (@patancollege.edu.np)</p>
            )}
          </div>

          <div>
            <label htmlFor="reg-id" className="label-field">Student ID</label>
            <div className="relative">
              <FaIdCard className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="reg-id"
                name="studentId"
                className="input-field"
                style={{ paddingLeft: "2.75rem" }}
                placeholder="PCPS-BIT-2026-XXX"
                value={form.studentId}
                onChange={handleChange}
              />
            </div>
            {errors.studentId && <p className="mt-1 text-xs text-rose-500">{errors.studentId}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="reg-password" className="label-field">Password</label>
              <div className="relative">
                <FaLock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="reg-password"
                  name="password"
                  type="password"
                  className="input-field"
                  style={{ paddingLeft: "2.75rem" }}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                />
              </div>
              {errors.password && <p className="mt-1 text-xs text-rose-500">{errors.password}</p>}
            </div>
            <div>
              <label htmlFor="reg-confirm" className="label-field">Confirm</label>
              <div className="relative">
                <FaLock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="reg-confirm"
                  name="confirmPassword"
                  type="password"
                  className="input-field"
                  style={{ paddingLeft: "2.75rem" }}
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={handleChange}
                />
              </div>
              {errors.confirmPassword && <p className="mt-1 text-xs text-rose-500">{errors.confirmPassword}</p>}
            </div>
          </div>

          <label className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              name="agree"
              checked={form.agree}
              onChange={handleChange}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-400"
            />
            I agree to the PCPS Connect{" "}
            <Link to="/terms" target="_blank" className="font-medium text-primary-600 dark:text-primary-400 underline underline-offset-2">
              terms of use
            </Link>{" "}
            and{" "}
            <Link to="/privacy" target="_blank" className="font-medium text-primary-600 dark:text-primary-400 underline underline-offset-2">
              privacy policy
            </Link>
            .
          </label>
          {errors.agree && <p className="text-xs text-rose-500">{errors.agree}</p>}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Creating account..." : "Create account"}
          </Button>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-primary-600 dark:text-primary-400">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
