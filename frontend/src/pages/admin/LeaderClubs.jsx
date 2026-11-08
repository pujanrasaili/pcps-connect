import { useState } from "react";
import { Link } from "react-router-dom";
import { FaEnvelope, FaLightbulb, FaUsers } from "react-icons/fa";
import { useLedClubs } from "../../hooks/useLedClubs";
import { useClubs } from "../../context/ClubsContext";
import ClubMessageModal from "../../components/ClubMessageModal";
import ClubMembersModal from "../../components/ClubMembersModal";
import Button from "../../components/Button";
import { useRequestCounts } from "../../hooks/useRequestCounts";
import { useLang } from "../../context/LanguageContext";

// The clubs this person leads, with the one club-wide action a leader has:
// seeing and emailing the club's members, and a way to the ideas members
// have suggested (they are read in the club's own window).
export default function LeaderClubs() {
  const { t } = useLang();
  const { clubs, loaded, failed, retry } = useLedClubs();
  // The leader endpoint has no member counts; the public club list does.
  const { clubs: allClubs } = useClubs();
  const [target, setTarget] = useState(null);
  const [membersTarget, setMembersTarget] = useState(null);
  const { counts, reload } = useRequestCounts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-800 dark:text-slate-100">{t("My Clubs")}</h1>
        <p className="text-slate-500 dark:text-slate-400">{t("Clubs you lead.")}</p>
      </div>
      <div className="card-surface divide-y divide-slate-100 dark:divide-slate-800">
        {!loaded && (
          <div className="flex justify-center p-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        )}
        {loaded && failed && (
          <div className="p-6 text-center" role="alert">
            <p role="alert" className="font-medium text-rose-700 dark:text-rose-400">{t("Couldn't load your clubs.")}</p>
            <button type="button" onClick={retry} className="btn-outline mt-3">{t("Try again")}</button>
          </div>
        )}
        {loaded && !failed && clubs.length === 0 && (
          <p className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            <FaUsers className="mx-auto mb-2 text-2xl text-slate-300" />
            {t("You don't lead any clubs.")}
          </p>
        )}
        {clubs.map((club) => (
          <div key={club._id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="min-w-0 truncate font-medium text-slate-800 dark:text-slate-100">{club.name}</p>
            <div className="flex min-w-0 flex-wrap justify-end gap-2">
              <Button icon={FaUsers} onClick={() => setMembersTarget(club)}>
                {t("View members")}{counts[club._id] ? ` ${t("({n} waiting)", { n: counts[club._id] })}` : ""}
              </Button>
              <Link to={`/clubs?club=${club._id}`} className="btn-primary">
                <FaLightbulb className="text-base" aria-hidden="true" />
                {t("Ideas")}
              </Link>
              <Button icon={FaEnvelope} onClick={() => setTarget(club)}>
                {t("Message members")}
              </Button>
            </div>
          </div>
        ))}
      </div>
      <ClubMembersModal club={membersTarget} onClose={() => { setMembersTarget(null); reload(); }} />
      <ClubMessageModal
        club={target}
        memberCount={target ? allClubs.find((c) => c._id === target._id)?.memberCount : undefined}
        onClose={() => setTarget(null)}
      />
    </div>
  );
}
