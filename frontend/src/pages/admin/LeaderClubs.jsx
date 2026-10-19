import { useState } from "react";
import { FaEnvelope, FaUsers } from "react-icons/fa";
import { useLedClubs } from "../../hooks/useLedClubs";
import ClubMessageModal from "../../components/ClubMessageModal";
import Button from "../../components/Button";

// The clubs this person leads, with the one club-wide action a leader has:
// emailing the club's members.
export default function LeaderClubs() {
  const { clubs, loaded } = useLedClubs();
  const [target, setTarget] = useState(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-800 dark:text-slate-100">My Clubs</h1>
        <p className="text-slate-500 dark:text-slate-400">Clubs you lead.</p>
      </div>
      <div className="card-surface divide-y divide-slate-100 dark:divide-slate-800">
        {!loaded && (
          <div className="flex justify-center p-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        )}
        {loaded && clubs.length === 0 && (
          <p className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            <FaUsers className="mx-auto mb-2 text-2xl text-slate-300" />
            You don't lead any clubs.
          </p>
        )}
        {clubs.map((club) => (
          <div key={club._id} className="flex items-center justify-between gap-3 p-4">
            <p className="min-w-0 truncate font-medium text-slate-800 dark:text-slate-100">{club.name}</p>
            <Button icon={FaEnvelope} onClick={() => setTarget(club)}>
              Message members
            </Button>
          </div>
        ))}
      </div>
      <ClubMessageModal club={target} onClose={() => setTarget(null)} />
    </div>
  );
}
