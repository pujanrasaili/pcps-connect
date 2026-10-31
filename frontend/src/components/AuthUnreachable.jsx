import { useAuth } from "../context/AuthContext";

// Shown instead of bouncing someone to the login page when the server could
// not be reached to check their login (it may just be waking up).
export default function AuthUnreachable() {
  const { retryAuth } = useAuth();
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center text-center" role="alert">
      <h1 className="font-display text-2xl font-bold text-slate-800 dark:text-slate-100">Can't reach the server right now</h1>
      <p className="mt-2 max-w-md text-slate-500 dark:text-slate-400">
        We couldn't check your login. The server may be waking up or your connection dropped. You are not logged out; give it a moment and try again.
      </p>
      <button type="button" onClick={retryAuth} className="btn-primary mt-5">
        Try again
      </button>
    </div>
  );
}
