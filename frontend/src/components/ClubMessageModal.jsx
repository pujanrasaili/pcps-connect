import { useEffect, useState } from "react";
import { useToast } from "../context/ToastContext";
import { api, getErrorMessage } from "../services/api";
import Modal from "./Modal";
import Button from "./Button";

// Email everyone who joined a club (admins, and the club's own leaders).
// Pass the club to open it, null to close.
export default function ClubMessageModal({ club, onClose }) {
  const toast = useToast();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (club) setMessage("");
  }, [club]);

  const send = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await api.post(`/admin/clubs/${club._id}/announce`, { message });
      toast.success(res.data.message);
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to send message"));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal isOpen={!!club} onClose={onClose} title={`Message members — ${club?.name || ""}`} size="md">
      <form onSubmit={send} className="space-y-3">
        <label className="label-field" htmlFor="club-message">Message to everyone who joined this club</label>
        <textarea
          id="club-message"
          rows={5}
          maxLength={1000}
          required
          className="input-field"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="e.g. This week's meeting is moved to Friday, 3 PM, Room B2."
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">
            {message.length}/1000 · sent by email, can't be undone. Members who turned off club updates are skipped.
          </span>
          <Button type="submit" disabled={sending || !message.trim()}>
            {sending ? "Sending..." : "Send"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
