import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import Button from "../components/Button";
import logo from "../assets/images/pcps-shield.png";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const validate = () => {
    const next = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a valid email address.";
    if (form.password.length < 6) next.password = "Password must be at least 6 characters.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    login(form.email);
    const redirectTo = location.state?.from || "/dashboard";
    navigate(redirectTo, { replace: true });
  };

  return (
    <div className="section-y flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img src={logo} alt="PCPS" className="mx-auto h-16 w-auto" />
          <h1 className="mt-4 font-display text-2xl font-bold text-slate-800 dark:text-slate-100">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Log in to your PCPS Connect account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card-surface space-y-4 p-6 sm:p-8" noValidate>
          <div>
            <label htmlFor="login-email" className="label-field">Email address</label>
            <div className="relative">
              <FaEnvelope className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="login-email"
                type="email"
                className="input-field" style={{ paddingLeft: "2.75rem" }}
                placeholder="you@pcps.edu.np"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            {errors.email && <p className="mt-1 text-xs text-rose-500">{errors.email}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="login-password" className="label-field">Password</label>
              <Link to="/forgot-password" className="text-xs font-medium text-primary-600 dark:text-primary-400">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <FaLock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                className="input-field" style={{ paddingLeft: "2.75rem", paddingRight: "2.75rem" }}
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-rose-500">{errors.password}</p>}
          </div>

          <Button type="submit" className="w-full">Log in</Button>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Don't have an account?{" "}
            <Link to="/register" className="font-semibold text-primary-600 dark:text-primary-400">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
