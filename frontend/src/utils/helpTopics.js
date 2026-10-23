// Plain-language answers for the Help page. Each answer is an array of short
// paragraphs so the page can render them without any HTML in the data.
export const HELP_TOPICS = [
  {
    id: "sign-up",
    question: "Who can sign up, and why can't I log in yet?",
    answer: [
      "Sign-up is for PCPS students with a @patancollege.edu.np email address.",
      "After you register, open the verification link we email you. Then an administrator approves your account, usually within a day or two. You can log in once both are done. If the verification email didn't arrive, check your spam folder, then try logging in: the page offers to send a new link.",
    ],
  },
  {
    id: "forgot-password",
    question: "I forgot my password.",
    answer: [
      'Use "Forgot password?" on the login page. We email a reset link that works for a short time. You can also change your password any time from Settings.',
    ],
  },
  {
    id: "register-event",
    question: "How do I register for an event?",
    answer: [
      'Open the event from the Events page and press "Register now". You get a confirmation email with a calendar invite.',
      'Some events need the organiser\'s approval. For those the button says "Request to join": a seat is held for you, and you are emailed as soon as the organiser decides. You can withdraw a request while it is waiting.',
    ],
  },
  {
    id: "full-event",
    question: "The event is full. What now?",
    answer: [
      'Join the waitlist on the event page. If someone cancels or the organiser adds seats, the first person in line is registered automatically and emailed.',
    ],
  },
  {
    id: "check-in",
    question: "How does check-in at the door work?",
    answer: [
      'Once you are registered, the event page shows "Show my check-in QR". Show that code to the organiser, who scans it with their phone. Your attendance is recorded straight away.',
    ],
  },
  {
    id: "certificate",
    question: "How do I get an attendance certificate?",
    answer: [
      "After an organiser marks you as attended, a certificate button appears next to the event on your Dashboard. You can print it or save it as a PDF. It carries a QR code, so anyone you show it to can scan it and confirm it is genuine.",
    ],
  },
  {
    id: "rate-event",
    question: "Can I rate an event?",
    answer: ["Yes, once you are marked as attended: your Dashboard asks you for 1 to 5 stars and an optional comment."],
  },
  {
    id: "search",
    question: "How do I find a club or event quickly?",
    answer: [
      'Press the "/" key (or tap the magnifying glass at the top of any page) and type part of a name, place or topic. Matching clubs and events appear as you type; choose one to open it.',
    ],
  },
  {
    id: "save-later",
    question: "What does the bookmark button do?",
    answer: [
      'It saves an event to the "Saved" tab on the Events page, and upcoming saved events show on your Dashboard. Saved events are stored in the browser you are using, so they do not follow you to another phone or computer.',
    ],
  },
  {
    id: "emails",
    question: "How do I stop reminder emails?",
    answer: [
      "Open Settings. You can switch event reminders and club updates off separately. Important emails, such as password changes and approval decisions, are always sent.",
    ],
  },
  {
    id: "calendar",
    question: "Can I add events to my phone's calendar?",
    answer: [
      'Yes. On a registered event, choose the Google Calendar link or download the calendar file. "Add all to calendar" on your Dashboard downloads every upcoming registration at once. Calendar files remind you a day and an hour before.',
    ],
  },
  {
    id: "my-data",
    question: "Can I download or delete my data?",
    answer: [
      "Both are in Settings. You can download everything the app holds about you as a file, or delete your account (you will be asked for your password). Deleting removes your registrations and memberships too.",
    ],
  },
  {
    id: "slow",
    question: "Why is the first page so slow sometimes?",
    answer: [
      "PCPS Connect runs on free hosting that goes to sleep when nobody has used it for a while. The first visit can take up to a minute to wake it; after that it is fast.",
    ],
  },
];
