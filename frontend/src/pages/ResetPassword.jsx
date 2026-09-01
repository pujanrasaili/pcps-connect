import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FaLock, FaCheckCircle } from "react-icons/fa";
import { api, getErrorMessage } from "../services/api";
import { useToast } from "../context/ToastContext";
import Button from "../components/Button";
import logo from "../assets/images/pcps-shield.png";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const next = {};
    if (form.password.length < 6) next.password = "Password must be at least 6 characters.";
    if (form.password !== form.confirmPassword) next.confirmPassword = "Passwords do not match.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await api.post("/auth/reset-password", { token, newPassword: form.password });
      setDone(true);
      toast.success("Password reset! You can now log in.");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      toast.error(getErrorMessage(err, "This reset link is invalid or has expired."));
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="section-y flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <p className="font-semibold text-slate-800 dark:text-slate-100">Invalid reset link</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            This link is missing its reset token. Please request a new one.
          </p>
          <Link to="/forgot-password" className="btn-primary mt-5 inline-flex">
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="section-y flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img src={logo} alt="PCPS" className="mx-auto h-16 w-auto animate-tilt-idle" style={{ transformStyle: "preserve-3d" }} />
          <h1 className="mt-4 font-display text-2xl font-bold text-slate-800 dark:text-slate-100">
            Set a new password
          </h1>
        </div>

        <div className="card-surface p-6 sm:p-8">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <FaCheckCircle className="text-4xl text-emerald-500" />
              <p className="font-semibold text-slate-800 dark:text-slate-100">Password reset</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Redirecting you to login...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="rp-password" className="label-field">New password</label>
                <div className="relative">
                  <FaLock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="rp-password"
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
                <label htmlFor="rp-confirm" className="label-field">Confirm new password</label>
                <div className="relative">
                  <FaLock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="rp-confirm"
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

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Resetting..." : "Reset password"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
