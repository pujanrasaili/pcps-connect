import { useEffect, useMemo, useState } from "react";
import { FaUserShield, FaUser, FaTrash } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { api, getErrorMessage } from "../../services/api";
import { useDebounce } from "../../hooks/useDebounce";
import ConfirmDialog from "../../components/ConfirmDialog";
import SearchBar from "../../components/SearchBar";

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 250);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

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

  const filteredUsers = useMemo(
    () =>
      users.filter(
        (u) =>
          u.name.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
          u.email.toLowerCase().includes(debouncedQuery.toLowerCase())
      ),
    [users, debouncedQuery]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-800 dark:text-slate-100">
          Manage Users
        </h1>
        <p className="text-slate-500 dark:text-slate-400">{users.length} registered students</p>
      </div>

      {error && (
        <p className="rounded-lg bg-rose-50 dark:bg-rose-900/20 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}

      <div className="max-w-sm">
        <SearchBar value={query} onChange={setQuery} placeholder="Search by name or email..." />
      </div>

      <div className="card-surface divide-y divide-slate-100 dark:divide-slate-800">
        {loading ? (
          <div className="flex justify-center p-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            {users.length === 0 ? "No registered students yet." : "No users match your search."}
          </p>
        ) : (
          filteredUsers.map((u) => {
            const isSelf = u._id === currentUser?.id;
            return (
              <div key={u._id} className="flex items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-800 dark:text-slate-100">
                    {u.name} {isSelf && <span className="text-xs text-slate-400">(you)</span>}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                </div>
                <span
                  className={`badge shrink-0 ${
                    u.role === "admin"
                      ? "bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {u.role}
                </span>
                <button
                  onClick={() => toggleRole(u)}
                  disabled={isSelf || updatingId === u._id}
                  title={isSelf ? "You can't change your own role" : u.role === "admin" ? "Demote to student" : "Promote to admin"}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-primary-50 hover:text-primary-600 disabled:opacity-30 disabled:hover:bg-transparent dark:hover:bg-primary-900/20"
                >
                  {u.role === "admin" ? <FaUser /> : <FaUserShield />}
                </button>
                <button
                  onClick={() => setDeleteTarget(u)}
                  disabled={isSelf}
                  aria-label={`Delete ${u.name}`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 disabled:opacity-30 disabled:hover:bg-transparent dark:hover:bg-rose-900/20"
                >
                  <FaTrash />
                </button>
              </div>
            );
          })
        )}
      </div>

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
