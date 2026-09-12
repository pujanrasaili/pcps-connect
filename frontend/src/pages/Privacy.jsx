import { Link } from "react-router-dom";

export default function Privacy() {
  return (
    <div className="section-y">
      <div className="container-page max-w-3xl">
        <h1 className="font-display text-3xl font-bold text-slate-800 dark:text-slate-100 sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Last updated: September 2026</p>

        <div className="card-surface mt-8 space-y-6 p-6 sm:p-8">
          <Section title="1. What we collect">
            When you register, we collect your name, PCPS email address,
            and a password (stored securely hashed -- we never see or
            store your actual password). You can optionally add a student
            ID, program, semester, and phone number to your profile. We
            also store which clubs you join or favorite and which events
            you register for, so your Dashboard and Profile can show your
            own activity.
          </Section>

          <Section title="2. How we use it">
            Your information is used to run your account (login, showing
            your registrations), to let club organizers and PCPS admins
            see who's registered for their events, and to send you
            account-related emails (verification, password reset). We
            don't use your data for advertising, and we don't sell it to
            anyone.
          </Section>

          <Section title="3. Who can see your information">
            Other students can't see your email, phone number, or password
            -- your profile details are private to you. PCPS Connect
            administrators can see your name, email, and registration
            activity in order to manage the platform (e.g. approving
            accounts, viewing who's registered for an event).
          </Section>

          <Section title="4. Where your data lives">
            Account and activity data is stored in MongoDB Atlas (a cloud
            database provider). Uploaded event and club images are stored
            with Cloudinary. Account emails (verification, password reset,
            contact form) are sent via Gmail. These are standard
            third-party infrastructure providers -- they host the data,
            they don't use it for their own purposes.
          </Section>

          <Section title="5. Your choices">
            You can update your profile information at any time from the
            Profile page. You can leave a club or unregister from an event
            whenever you like. To delete your account entirely, contact an
            administrator via the{" "}
            <Link to="/contact" className="text-primary-600 dark:text-primary-400 underline underline-offset-2">
              Contact page
            </Link>
            .
          </Section>

          <Section title="6. Security">
            Passwords are hashed with bcrypt before storage. Login sessions
            use an httpOnly cookie, which can't be read by JavaScript
            running in your browser -- a meaningful protection against a
            common class of attack. Login attempts are rate-limited to
            slow down automated password-guessing.
          </Section>

          <Section title="7. Changes to this policy">
            As PCPS Connect grows, this policy may be updated to reflect
            new features. We'll update the date at the top of this page
            when that happens.
          </Section>

          <Section title="8. Contact">
            Questions about your data? Reach out via the{" "}
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
