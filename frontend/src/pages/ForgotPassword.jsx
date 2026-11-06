import { useState } from "react";
import { Link } from "react-router-dom";
import { FaEnvelope, FaCheckCircle, FaArrowLeft } from "react-icons/fa";
import { api, getErrorMessage } from "../services/api";
import Button from "../components/Button";
import { useLang } from "../context/LanguageContext";
import logo from "../assets/images/pcps-shield.webp";

export default function ForgotPassword() {
  const { t, lang } = useLang();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await api.post("/auth/forgot-password", { email, language: lang });
      setSent(true);
    } catch (err) {
      setError(getErrorMessage(err, t("Something went wrong. Please try again.")));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="section-y flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img src={logo} alt="PCPS" className="mx-auto h-16 w-auto rounded-xl animate-tilt-idle" style={{ transformStyle: "preserve-3d" }} />
          <h1 className="mt-4 font-display text-2xl font-bold text-slate-800 dark:text-slate-100">
            {t("Reset your password")}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("We'll email you a link to reset it")}
          </p>
        </div>

        <div className="card-surface p-6 sm:p-8">
          {sent ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <FaCheckCircle className="text-4xl text-emerald-500" />
              <p className="font-semibold text-slate-800 dark:text-slate-100">{t("Check your inbox")}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("If an account exists for {email}, a reset link is on its way.", { email })}
              </p>
              <Link to="/login" className="btn-outline mt-3 w-full">
                {t("Back to login")}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="fp-email" className="label-field">{t("Email address")}</label>
                <div className="relative">
                  <FaEnvelope className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
                  <input
                    id="fp-email"
                    aria-invalid={error ? "true" : undefined}
                    aria-describedby={error ? "fp-email-error" : undefined}
                    type="email"
                    className="input-field" style={{ paddingLeft: "2.75rem" }}
                    placeholder="you@patancollege.edu.np"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                {error && <p id="fp-email-error" role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{t(error)}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? t("Sending...") : t("Send reset link")}
              </Button>
              <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
                <FaArrowLeft className="text-xs" /> {t("Back to login")}
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
