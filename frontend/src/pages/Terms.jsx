import { Link } from "react-router-dom";

export default function Terms() {
  return (
    <div className="section-y">
      <div className="container-page max-w-3xl">
        <h1 className="font-display text-3xl font-bold text-slate-800 dark:text-slate-100 sm:text-4xl">
          Terms of Use
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Last updated: September 2026</p>

        <div className="card-surface mt-8 space-y-6 p-6 sm:p-8">
          <Section title="1. Who this is for">
            PCPS Connect is a club and event platform built for students of
            Patan College of Professional Studies. Registration is limited
            to accounts using a valid PCPS email address
            (@patancollege.edu.np).
          </Section>

          <Section title="2. Your account">
            You're responsible for keeping your password secure and for
            anything that happens under your account. New accounts require
            email verification and admin approval before they can be used --
            this exists to keep the platform limited to real PCPS students.
          </Section>

          <Section title="3. Acceptable use">
            Use PCPS Connect to discover clubs, register for events, and
            engage with campus life in good faith. Don't create accounts
            under someone else's identity, attempt to bypass the
            registration/approval process, or use the platform to harass
            other students or disrupt events.
          </Section>

          <Section title="4. Event registrations">
            Registering for an event reserves you a spot, subject to
            capacity. Event details (dates, locations, capacity) are
            managed by club organizers and PCPS staff and may change --
            check the event page for the latest information.
          </Section>

          <Section title="5. Content and accounts">
            An administrator may edit, remove, or reject content or
            accounts that violate these terms or misrepresent someone's
            identity or affiliation with PCPS.
          </Section>

          <Section title="6. No warranty">
            PCPS Connect is provided as-is. While we aim to keep it
            reliable, we don't guarantee uninterrupted availability or that
            it will be error-free.
          </Section>

          <Section title="7. Changes">
            These terms may be updated as the platform evolves. Continued
            use after a change means you accept the updated terms.
          </Section>

          <Section title="8. Contact">
            Questions about these terms? Reach out via the{" "}
            <Link to="/contact" className="text-primary-600 dark:text-primary-400 underline underline-offset-2">
              Contact page
            </Link>
            .
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h2 className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{children}</p>
    </div>
  );
}
