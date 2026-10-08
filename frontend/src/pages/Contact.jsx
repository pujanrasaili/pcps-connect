import { useState } from "react";
import { FaMapMarkerAlt, FaPhoneAlt, FaClock, FaCheckCircle, FaUserTie } from "react-icons/fa";
import { api, getErrorMessage } from "../services/api";
import Button from "../components/Button";

export default function Contact() {
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
      setTimeout(() => setSent(false), 5000);
    } catch (err) {
      setServerError(getErrorMessage(err, "Failed to send message. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="section-y">
      <div className="container-page">
        <div className="text-center">
          <span className="text-sm font-semibold uppercase tracking-wide text-primary-500">
            We'd Love to Hear from You
          </span>
          <h1 className="mt-1 font-display text-3xl font-bold text-slate-800 dark:text-slate-100 sm:text-4xl">
            Get in Touch
          </h1>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.3fr]">
          <div className="space-y-4">
            <ContactRow icon={FaMapMarkerAlt} title="Address" text="PCPS College, Kandevatasthan, Lalitpur, Nepal" />
            <ContactRow icon={FaPhoneAlt} title="Phone" text="01-5181198" />
            <ContactRow icon={FaUserTie} title="Events — Rishika Dahal (College Events Head)" text="9801102247" />
            <ContactRow icon={FaUserTie} title="Admission — Pramila Ghimire (Admission Manager)" text="9801102235" />
            <ContactRow icon={FaClock} title="Office Hours" text="Sun – Fri, 9:00 AM – 5:00 PM" />

            <div className="card-surface overflow-hidden">
              <iframe
                title="PCPS College Location"
                src="https://www.google.com/maps?q=Patan+College+For+Professional+Studies&ll=27.6844602,85.317011&z=16&output=embed"
                className="h-56 w-full border-0"
                loading="lazy"
              />
              <a
                href="https://maps.app.goo.gl/KVubJE1PGXbJNMv56"
                target="_blank"
                rel="noopener noreferrer"
                className="block border-t border-slate-100 dark:border-slate-800 px-4 py-3 text-center text-sm font-semibold text-primary-600 dark:text-primary-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                Get directions on Google Maps
              </a>
            </div>
          </div>

          <div className="card-surface p-6 sm:p-8">
            {sent && (
              <div className="mb-5 flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                <FaCheckCircle /> Message sent — we'll get back to you soon.
              </div>
            )}
            {serverError && (
              <p className="mb-5 rounded-lg bg-rose-50 dark:bg-rose-900/20 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
                {serverError}
              </p>
            )}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="c-name" className="label-field">Full name</label>
                  <input
                    id="c-name"
                    name="name"
                    className="input-field"
                    value={form.name}
                    onChange={handleChange}
                  />
                  {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name}</p>}
                </div>
                <div>
                  <label htmlFor="c-email" className="label-field">Email address</label>
                  <input
                    id="c-email"
                    name="email"
                    type="email"
                    className="input-field"
                    value={form.email}
                    onChange={handleChange}
                  />
                  {errors.email && <p className="mt-1 text-xs text-rose-500">{errors.email}</p>}
                </div>
              </div>
              <div>
                <label htmlFor="c-subject" className="label-field">Subject</label>
                <input
                  id="c-subject"
                  name="subject"
                  className="input-field"
                  value={form.subject}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="c-message" className="label-field">Message</label>
                <textarea
                  id="c-message"
                  name="message"
                  rows={5}
                  className="input-field resize-none"
                  value={form.message}
                  onChange={handleChange}
                />
                {errors.message && <p className="mt-1 text-xs text-rose-500">{errors.message}</p>}
              </div>
              <Button type="submit" className="w-full sm:w-auto" disabled={submitting}>
                {submitting ? "Sending..." : "Send message"}
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
