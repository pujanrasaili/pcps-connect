import { useSyncExternalStore } from "react";
import { FaHourglassHalf } from "react-icons/fa";
import { slowRequests } from "../utils/slowRequests";

// Shown only while a request has been waiting for several seconds -- almost
// always the free-tier backend waking up after a quiet spell. Disappears by
// itself once the server answers.
export default function SlowServerNotice() {
  const slow = useSyncExternalStore(slowRequests.subscribe, slowRequests.isSlow, () => false);
  if (!slow) return null;
  return (
    <div role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
      <FaHourglassHalf className="mr-2 inline align-[-2px]" aria-hidden="true" />
      Waking up the server — PCPS Connect runs on free hosting, so the first load after a quiet spell can take up to a minute. Thanks for your patience!
    </div>
  );
}
