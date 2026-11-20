import { FaWifi } from "react-icons/fa";
import { browserStorage, readTickets, visibleTickets } from "../utils/offlineTickets";
import { useLang } from "../context/LanguageContext";
import useOffline from "../utils/useOffline";

// A thin bar on every page while the phone has no internet, so a spinner that
// never ends or a failed button has an obvious reason. When saved tickets
// exist, the tickets banner (which says the same and links to them) takes over.
export default function OfflineNotice() {
  const { t } = useLang();
  const offline = useOffline();
  if (!offline) return null;
  if (visibleTickets(readTickets(browserStorage())).length > 0) return null;
  return (
    <div role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
      <FaWifi className="mr-2 inline align-[-2px]" aria-hidden="true" />
      {t("You're offline.")} {t("Pages and buttons will work again when you're back online.")}
    </div>
  );
}
