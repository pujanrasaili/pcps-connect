import { useEffect, useMemo, useState } from "react";
import { FaFileCsv } from "react-icons/fa";
import { buildCsv, downloadCsv } from "../../utils/csv";
import { pluralize } from "../../utils/plural";
import { FaUserShield, FaUser, FaTrash, FaCheck, FaTimes, FaEnvelope } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { api, getErrorMessage } from "../../services/api";
import { useDebounce } from "../../hooks/useDebounce";
import ConfirmDialog from "../../components/ConfirmDialog";
import SearchBar from "../../components/SearchBar";
import Pagination from "../../components/Pagination";
import { usePagination } from "../../hooks/usePagination";

const PAGE_SIZE = 10;
const STATUS_STYLES = {
  approved: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  pending: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  rejected: "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
};

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const debouncedQuery = useDebounce(query, 250);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const loadUsers = () => {
    setLoading(true);
    api
      .get("/admin/users")
      .then((res) => setUsers(res.data.users))
      .catch((err) => setError(getErrorMessage(err, "Failed to load users")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const toggleRole = async (targetUser) => {
    const nextRole = targetUser.role === "admin" ? "user" : "admin";
    setUpdatingId(targetUser._id);
    try {
      await api.put(`/admin/users/${targetUser._id}`, { role: nextRole });
      toast.success(`${targetUser.name} is now ${nextRole === "admin" ? "an admin" : "a student"}.`);
      loadUsers();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update role"));
    } finally {
      setUpdatingId(null);
    }
  };

  const setApproval = async (targetUser, approvalStatus) => {
    setUpdatingId(targetUser._id);
    try {
      await api.put(`/admin/users/${targetUser._id}`, { approvalStatus });
      toast.success(
        approvalStatus === "approved"
          ? `${targetUser.name} approved -- they can now log in.`
          : `${targetUser.name}'s registration was rejected.`
      );
      loadUsers();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update approval status"));
    } finally {
      setUpdatingId(null);
    }
  };

  // Approves every pending account currently shown (respects the search box), in
  // batches of 200 to stay inside the server's per-request limit.
  const handleBulkApprove = async () => {
    const ids = filteredUsers.filter((u) => u.approvalStatus === "pending").map((u) => u._id);
    setBulkBusy(true);
    try {
      let approved = 0;
      for (let i = 0; i < ids.length; i += 200) {
        const res = await api.put("/admin/users/bulk-approve", { userIds: ids.slice(i, i + 200) });
        approved += res.data.approved || 0;
      }
      toast.success(`Approved ${pluralize(approved, "account")}.`);
      setBulkOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to approve accounts"));
    } finally {
      setBulkBusy(false);
      loadUsers();
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/admin/users/${deleteTarget._id}`);
      toast.success("User deleted.");
      setDeleteTarget(null);
      loadUsers();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to delete user"));
    } finally {
      setDeleting(false);
    }
  };

  const statusCounts = useMemo(() => {
    const counts = { all: users.length, pending: 0, approved: 0, rejected: 0 };
    users.forEach((u) => {
      if (counts[u.approvalStatus] !== undefined) counts[u.approvalStatus] += 1;
    });
    return counts;
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = debouncedQuery.toLowerCase();
    return users.filter(
      (u) =>
        (statusFilter === "all" || u.approvalStatus === statusFilter) &&
        (u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.studentId || "").toLowerCase().includes(q))
    );
  }, [users, debouncedQuery, statusFilter]);

  const { page, setPage, totalPages, pageItems: pagedUsers } = usePagination(filteredUsers, PAGE_SIZE);

  // Exports exactly what the filters/search currently show (all pages, not just
  // the visible one), so "pending students" or "BIT semester 3" can be pulled out.
  const exportCsv = () => {
    const header = ["Name", "Email", "Student ID", "Program", "Semester", "Phone", "Status", "Role", "Joined"];
    const rows = filteredUsers.map((u) => [
      u.name,
      u.email,
      u.studentId || "",
      u.program || "",
      u.semester || "",
      u.phone || "",
      u.approvalStatus,
      u.role,
      u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "",
    ]);
    downloadCsv("pcps-students.csv", buildCsv(header, rows));
  };

  const pendingCount = users.filter((u) => u.approvalStatus === "pending").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-800 dark:text-slate-100">
          Manage Users
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          {pluralize(users.length, "registered student")}
          {pendingCount > 0 && (
            <span className="ml-2 badge bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              {pendingCount} awaiting approval
            </span>
          )}
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-rose-50 dark:bg-rose-900/20 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}

      <div className="max-w-sm">
        <SearchBar value={query} onChange={setQuery} placeholder="Search by name, email or student ID..." />
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by approval status">
        {["all", "pending", "approved", "rejected"].map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            aria-pressed={statusFilter === status}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
              statusFilter === status
                ? "bg-primary-500 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            {status} ({statusCounts[status]})
          </button>
        ))}
        {statusFilter === "pending" && filteredUsers.length > 0 && (
          <button
            type="button"
            onClick={() => setBulkOpen(true)}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-600"
          >
            <FaCheck /> Approve all ({filteredUsers.length})
          </button>
        )}
        <button
          type="button"
          onClick={exportCsv}
          disabled={filteredUsers.length === 0}
          className={`${statusFilter === "pending" && filteredUsers.length > 0 ? "" : "ml-auto "}flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-100 disabled:opacity-50 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50`}
        >
          <FaFileCsv /> Export CSV ({filteredUsers.length})
        </button>
      </div>

      <div className="card-surface divide-y divide-slate-100 dark:divide-slate-800">
        {loading ? (
          <div className="flex justify-center p-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            {users.length === 0 ? "No registered students yet." : "No users match your search or filter."}
          </p>
        ) : (
          pagedUsers.map((u) => {
            const isSelf = u._id === currentUser?.id;
            const isPending = u.approvalStatus === "pending";
            return (
              <div key={u._id} className="flex flex-wrap items-center gap-3 p-4 sm:flex-nowrap">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-800 dark:text-slate-100">
                    {u.name} {isSelf && <span className="text-xs text-slate-400">(you)</span>}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  {!u.emailVerified && (
                    <span
                      className="badge bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      title="Hasn't clicked their email verification link yet"
                    >
                      <FaEnvelope className="mr-1 text-[10px]" /> Unverified
                    </span>
                  )}
                  <span className={`badge ${STATUS_STYLES[u.approvalStatus]}`}>{u.approvalStatus}</span>
                  <span
                    className={`badge ${
                      u.role === "admin"
                        ? "bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {u.role}
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {isPending && (
                    <>
                      <button
                        onClick={() => setApproval(u, "approved")}
                        disabled={updatingId === u._id}
                        title="Approve"
                        className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-30 dark:hover:bg-emerald-900/20"
                      >
                        <FaCheck />
                      </button>
                      <button
                        onClick={() => setApproval(u, "rejected")}
                        disabled={updatingId === u._id}
                        title="Reject"
                        className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 disabled:opacity-30 dark:hover:bg-rose-900/20"
                      >
                        <FaTimes />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => toggleRole(u)}
                    disabled={isSelf || updatingId === u._id}
                    title={isSelf ? "You can't change your own role" : u.role === "admin" ? "Demote to student" : "Promote to admin"}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-primary-50 hover:text-primary-600 disabled:opacity-30 disabled:hover:bg-transparent dark:hover:bg-primary-900/20"
                  >
                    {u.role === "admin" ? <FaUser /> : <FaUserShield />}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(u)}
                    disabled={isSelf}
                    aria-label={`Delete ${u.name}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 disabled:opacity-30 disabled:hover:bg-transparent dark:hover:bg-rose-900/20"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      <ConfirmDialog
        isOpen={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onConfirm={handleBulkApprove}
        confirming={bulkBusy}
        tone="success"
        confirmLabel="Approve all"
        confirmingLabel="Approving..."
        title="Approve all pending accounts?"
        message={`This approves the ${pluralize(filteredUsers.filter((u) => u.approvalStatus === "pending").length, "pending account")} shown here and emails each person that they can log in.`}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        confirming={deleting}
        title="Delete this user?"
        message={`This will permanently delete "${deleteTarget?.name}"'s account, along with their club memberships and event registrations. This can't be undone.`}
      />
    </div>
  );
}
