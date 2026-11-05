import { useEffect, useState } from "react";
import { useToast } from "../context/ToastContext";
import { api, getErrorMessage } from "../services/api";
import Modal from "./Modal";
import Button from "./Button";
import { useLang } from "../context/LanguageContext";

// Email everyone who joined a club (admins, and the club's own leaders).
// Pass the club to open it, null to close.
export default function ClubMessageModal({ club, memberCount: memberCountProp, onClose }) {
  // Callers that only have a bare club (no count) can pass the count separately.
  const memberCount = memberCountProp ?? club?.memberCount;
  const toast = useToast();
  const { t } = useLang();
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
      toast.error(getErrorMessage(err, t("Failed to send message")));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal isOpen={!!club} onClose={onClose} title={t("Message members — {name}", { name: club?.name || "" })} size="md">
      <form onSubmit={send} className="space-y-3">
        <label className="label-field" htmlFor="club-message">
          {t("Message to everyone who joined this club")}
          {typeof memberCount === "number" && ` ${t("(up to {n})", { n: t(memberCount === 1 ? "{n} member" : "{n} members", { n: memberCount }) })}`}
        </label>
        <textarea data-autofocus
          id="club-message"
          rows={5}
          maxLength={1000}
          required
          className="input-field"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t("e.g. This week's meeting is moved to Friday, 3 PM, Room B2.")}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {t("{n}/1000 · sent by email, can't be undone. Members who turned off club updates are skipped.", { n: message.length })}
          </span>
          <Button type="submit" disabled={sending || !message.trim()}>
            {sending ? t("Sending...") : t("Send")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
