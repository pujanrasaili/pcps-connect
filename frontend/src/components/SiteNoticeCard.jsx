import { useEffect, useState } from "react";
import { FaBullhorn } from "react-icons/fa";
import Button from "./Button";
import { api, getErrorMessage } from "../services/api";
import { useToast } from "../context/ToastContext";
import { NOTICE_MAX_LENGTH } from "../utils/siteNotice";

// Admin -> Overview: write the announcement banner everyone sees at the top of
// the site, or clear it. Saving an empty message removes it.
export default function SiteNoticeCard() {
  const toast = useToast();
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState("info");
  const [live, setLive] = useState(null); // what visitors currently see
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get("/notice")
      .then((res) => {
        const n = res.data.notice;
        setLive(n);
        if (n) {
          setMessage(n.message);
          setTone(n.tone);
        }
      })
      .catch(() => {});
  }, []);

  const save = async (nextMessage) => {
    setSaving(true);
    try {
      const res = await api.put("/admin/notice", { message: nextMessage, tone });
      setLive(res.data.notice);
      if (!res.data.notice) setMessage("");
      toast.success(res.data.notice ? "Announcement is live." : "Announcement removed.");
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't save the announcement."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card-surface p-5">
      <div className="mb-3 flex items-center gap-2">
        <FaBullhorn className="text-primary-500" />
        <h2 className="font-semibold text-slate-800 dark:text-slate-100">Site announcement</h2>
      </div>
      <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
        A banner shown at the top of every page, e.g. &ldquo;Fest registration closes Friday&rdquo;. Visitors can close it; edit it and it shows again.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save(message);
        }}
        className="space-y-3"
      >
        <div>
          <label className="label-field" htmlFor="notice-message">Message</label>
          <textarea
            id="notice-message"
            rows={2}
            maxLength={NOTICE_MAX_LENGTH}
            className="input-field resize-none"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Leave empty to show no announcement"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{message.length}/{NOTICE_MAX_LENGTH}</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label-field" htmlFor="notice-tone">Style</label>
            <select id="notice-tone" className="input-field" value={tone} onChange={(e) => setTone(e.target.value)}>
              <option value="info">Information</option>
              <option value="warning">Important</option>
            </select>
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : live ? "Update announcement" : "Publish announcement"}
          </Button>
          {live && (
            <button
              type="button"
              disabled={saving}
              onClick={() => save("")}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:text-rose-400 dark:hover:bg-rose-900/20"
            >
              Remove
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
