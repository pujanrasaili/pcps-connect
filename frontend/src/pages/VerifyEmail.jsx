import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { api, getErrorMessage } from "../services/api";
import { useLang } from "../context/LanguageContext";
import logo from "../assets/images/pcps-shield.webp";

export default function VerifyEmail() {
  const { t } = useLang();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState("verifying"); // "verifying" | "success" | "error"
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage(t("This link is missing its verification token."));
      return;
    }

    let cancelled = false;
    api
      .post("/auth/verify-email", { token })
      .then((res) => {
        if (cancelled) return;
        setStatus("success");
        setMessage(res.data.message);
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus("error");
        setMessage(getErrorMessage(err, t("This verification link is invalid or has expired.")));
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="section-y flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <img src={logo} alt="PCPS" className="mx-auto h-16 w-auto rounded-xl animate-tilt-idle" style={{ transformStyle: "preserve-3d" }} />

        <div className="card-surface mt-6 p-8">
          {status === "verifying" && (
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
              <h1 className="text-sm text-slate-500 dark:text-slate-400">{t("Verifying your email...")}</h1>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center gap-3">
              <FaCheckCircle className="text-4xl text-emerald-500" />
              <h1 className="font-semibold text-slate-800 dark:text-slate-100">{t("Email verified")}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
              <Link to="/login" className="btn-primary mt-3 w-full">
                {t("Go to login")}
              </Link>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-3">
              <FaTimesCircle className="text-4xl text-rose-500" />
              <h1 className="font-semibold text-slate-800 dark:text-slate-100">{t("Verification failed")}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
              <Link to="/login" className="btn-outline mt-3 w-full">
                {t("Back to login")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
