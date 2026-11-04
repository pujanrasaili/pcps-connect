import { useState } from "react";
import { FaMapMarkerAlt, FaPhoneAlt, FaClock, FaCheckCircle, FaUserTie } from "react-icons/fa";
import { api, getErrorMessage } from "../services/api";
import Button from "../components/Button";
import { useLang } from "../context/LanguageContext";

export default function Contact() {
  const { t } = useLang();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = "Name is required.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a valid email.";
    if (!form.message.trim()) next.message = "Please write a message.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    if (!validate()) return;

    setSubmitting(true);
    try {
      await api.post("/contact", form);
      setSent(true);
      setForm({ name: "", email: "", subject: "", message: "" });
      setTimeout(() => setSent(false), 10000);
    } catch (err) {
      setServerError(getErrorMessage(err, t("Failed to send message. Please try again.")));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="section-y">
      <div className="container-page">
        <div className="text-center">
          <span className="text-sm font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-300">
            {t("We'd Love to Hear from You")}
          </span>
          <h1 className="mt-1 font-display text-3xl font-bold text-slate-800 dark:text-slate-100 sm:text-4xl">
            {t("Get in Touch")}
          </h1>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.3fr]">
          <div className="space-y-4">
            <ContactRow icon={FaMapMarkerAlt} title={t("Address")} text={t("PCPS College, Kandevatasthan, Lalitpur, Nepal")} />
            <ContactRow icon={FaPhoneAlt} title={t("Phone")} text="01-5181198" />
            <ContactRow icon={FaUserTie} title={t("Events — Rishika Dahal (College Events Head)")} text="9801102247" />
            <ContactRow icon={FaUserTie} title={t("Admission — Pramila Ghimire (Admission Manager)")} text="9801102235" />
            <ContactRow icon={FaClock} title={t("Office Hours")} text={t("Sun – Fri, 9:00 AM – 5:00 PM")} />

            <div className="card-surface overflow-hidden">
              <iframe
                title={t("PCPS College Location")}
                src="https://www.google.com/maps?q=Patan+College+For+Professional+Studies&ll=27.6844602,85.317011&z=16&output=embed"
                className="h-56 w-full border-0"
                loading="lazy"
              />
              <a
                href="https://maps.app.goo.gl/KVubJE1PGXbJNMv56"
                target="_blank"
                rel="noopener noreferrer"
                className="block border-t border-slate-100 dark:border-slate-800 px-4 py-3 text-center text-sm font-semibold text-primary-600 dark:text-primary-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                {t("Get directions on Google Maps")}
              </a>
            </div>
          </div>

          <div className="card-surface p-6 sm:p-8">
            <div role="status">
              {sent && (
                <div className="mb-5 flex items-start gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  <FaCheckCircle className="mt-0.5 shrink-0" aria-hidden="true" /> {t("Message sent — we'll reply to the email address you gave.")}
                </div>
              )}
            </div>
            {serverError && (
              <p role="alert" className="mb-5 rounded-lg bg-rose-50 dark:bg-rose-900/20 px-3 py-2 text-sm text-rose-700 dark:text-rose-400">
                {serverError}
              </p>
            )}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Honeypot: invisible to people, tempting to bots. The server
                  quietly drops submissions where this is filled in. */}
              <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label>
                  Leave this field empty
                  <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website || ""} onChange={handleChange} />
                </label>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="c-name" className="label-field">{t("Full name")}</label>
                  <input
                    id="c-name"
                    aria-invalid={errors.name ? "true" : undefined}
                    aria-describedby={errors.name ? "c-name-error" : undefined}
                    name="name"
                    className="input-field"
                    value={form.name}
                    onChange={handleChange}
                  />
                  {errors.name && <p id="c-name-error" role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{t(errors.name)}</p>}
                </div>
                <div>
                  <label htmlFor="c-email" className="label-field">{t("Email address")}</label>
                  <input
                    id="c-email"
                    aria-invalid={errors.email ? "true" : undefined}
                    aria-describedby={errors.email ? "c-email-error" : undefined}
                    name="email"
                    type="email"
                    className="input-field"
                    value={form.email}
                    onChange={handleChange}
                  />
                  {errors.email && <p id="c-email-error" role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{t(errors.email)}</p>}
                </div>
              </div>
              <div>
                <label htmlFor="c-subject" className="label-field">{t("Subject")}</label>
                <input
                  id="c-subject"
                  name="subject"
                  className="input-field"
                  value={form.subject}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="c-message" className="label-field">{t("Message")}</label>
                <textarea
                  id="c-message"
                  aria-invalid={errors.message ? "true" : undefined}
                  aria-describedby={errors.message ? "c-message-error" : undefined}
                  name="message"
                  rows={5}
                  className="input-field resize-none"
                  value={form.message}
                  onChange={handleChange}
                />
                {errors.message && <p id="c-message-error" role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{t(errors.message)}</p>}
              </div>
              <Button type="submit" className="w-full sm:w-auto" disabled={submitting}>
                {submitting ? t("Sending...") : t("Send message")}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactRow({ icon: Icon, title, text }) {
  return (
    <div className="card-surface flex items-center gap-4 p-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-300">
        <Icon />
      </div>
      <div>
        <p className="font-medium text-slate-800 dark:text-slate-100">{title}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{text}</p>
      </div>
    </div>
  );
}
