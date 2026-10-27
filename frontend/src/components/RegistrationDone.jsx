import { useState } from "react";
import { Link } from "react-router-dom";
import { FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
import { api, getErrorMessage } from "../services/api";
import { useToast } from "../context/ToastContext";
import Button from "./Button";

// Shown in place of the sign-up form once the account exists, so it is obvious
// that registering worked and what happens next. (A short pop-up that vanished
// while the page changed left people unsure whether anything had happened.)
export default function RegistrationDone({ email, emailSent }) {
  const toast = useToast();
  const [resending, setResending] = useState(false);
  const [resentOnce, setResentOnce] = useState(false);

  const resend = async () => {
    setResending(true);
    try {
      await api.post("/auth/resend-verification", { email });
      setResentOnce(true);
      toast.success("Sent again. Check your inbox and your spam folder.");
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't resend the email. Try again in a few minutes."));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="section-y flex items-center justify-center px-4">
      <div className="card-surface w-full max-w-md space-y-5 p-6 text-center sm:p-8" role="status">
        {emailSent ? (
          <FaCheckCircle aria-hidden="true" className="mx-auto text-5xl text-emerald-500" />
        ) : (
          <FaExclamationTriangle aria-hidden="true" className="mx-auto text-5xl text-amber-500" />
        )}
        <h1 className="font-display text-2xl font-bold text-slate-800 dark:text-slate-100">Your account was created</h1>

        {emailSent ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            We sent a verification link to <strong className="break-all">{email}</strong>. It can take a few minutes, and it may land in your spam folder.
          </p>
        ) : (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            We couldn&apos;t send the verification email to <strong className="break-all">{email}</strong> just now. Your account is saved -- press
            &ldquo;Send it again&rdquo; below in a minute or two.
          </p>
        )}

        <ol className="space-y-1 text-left text-sm text-slate-600 dark:text-slate-300">
          <li>1. Open the email and press the verification link.</li>
          <li>2. An admin approves your account (usually within a day or two).</li>
          <li>3. You can then log in.</li>
        </ol>

        <div className="flex flex-col gap-2">
          <Button onClick={resend} disabled={resending} variant="outline" className="w-full">
            {resending ? "Sending..." : resentOnce ? "Send it again" : emailSent ? "I didn't get it -- send again" : "Send it again"}
          </Button>
          <Link to="/login" className="btn-primary w-full">
            Go to login
          </Link>
        </div>
      </div>
    </div>
  );
}
