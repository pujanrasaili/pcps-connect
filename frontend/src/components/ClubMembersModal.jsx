import { useEffect, useState } from "react";
import { FaFileCsv, FaUsers } from "react-icons/fa";
import { api, getErrorMessage } from "../services/api";
import { useToast } from "../context/ToastContext";
import Modal from "./Modal";
import SearchBar from "./SearchBar";
import { buildCsv, downloadCsv, slugify } from "../utils/csv";
import { pluralize } from "../utils/plural";
import { filterMembers } from "../utils/clubMembers";

// Who joined a club (admins, and the club's own leaders). Pass the club to
// open it, null to close.
export default function ClubMembersModal({ club, onClose }) {
  const toast = useToast();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!club) return undefined;
    let cancelled = false;
    setSearch("");
    setMembers([]);
    setLoading(true);
    api
      .get(`/admin/clubs/${club._id}/members`)
      .then((res) => !cancelled && setMembers(res.data.members))
      .catch((err) => !cancelled && toast.error(getErrorMessage(err, "Failed to load members")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [club]);

  const exportCsv = () => {
    const rows = members.map((m) => [m.name, m.email, m.studentId, m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : ""]);
    downloadCsv(`${slugify(club?.name, "club")}-members.csv`, buildCsv(["Name", "Email", "Student ID", "Joined"], rows));
  };

  const visible = filterMembers(members, search);

  return (
    <Modal isOpen={!!club} onClose={onClose} title={`Members — ${club?.name || ""}`} size="lg">
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        </div>
      ) : members.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
          <FaUsers className="mx-auto mb-2 text-2xl text-slate-300" />
          No one has joined this club yet.
        </p>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-600 dark:text-slate-300">{pluralize(members.length, "member")}, newest first</p>
            <button
              onClick={exportCsv}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
            >
              <FaFileCsv aria-hidden="true" /> Export CSV
            </button>
          </div>
          {members.length > 8 && (
            <div className="mb-3">
              <SearchBar value={search} onChange={setSearch} placeholder="Find by name, email or student ID..." />
            </div>
          )}
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {visible.map((m) => (
              <li key={m._id} className="py-2.5">
                <p className="font-medium text-slate-800 dark:text-slate-100">{m.name}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {m.email}
                  {m.studentId ? ` · ${m.studentId}` : ""}
                </p>
              </li>
            ))}
            {visible.length === 0 && <li className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">No one matches that search.</li>}
          </ul>
        </>
      )}
    </Modal>
  );
}
