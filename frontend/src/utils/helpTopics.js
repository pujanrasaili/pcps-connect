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
    id: "offline-ticket",
    question: "What if there is no internet at the event?",
    answer: [
      'While you are online, the site saves your check-in code for each upcoming event on your phone. With no internet, open the site as usual and tap "Open your saved tickets" (or go to My tickets from your Dashboard) to show your QR code.',
      "For this to work, open the site once while you are online after registering, and use the same phone. Tickets are removed when you log out, so log in again when you are back online.",
    ],
  },
  {
    id: "event-question",
    question: "Can I ask the organiser something before an event?",
    answer: [
      'Yes. On an upcoming event\'s page, use the questions section at the bottom. Your question is public and shows only your first name, so other students can see the answer too. You can have up to three unanswered questions at a time.',
      "The organiser is emailed when you ask, and you are emailed when they answer. You can delete your own question any time.",
    ],
  },
  {
    id: "club-news",
    question: "Where do I find news from a club?",
    answer: [
      "Open the club from the Clubs page. Its details window shows short updates posted by the club's leaders, newest first, along with the club's next events.",
    ],
  },
  {
    id: "install-app",
    question: "Can I put PCPS Connect on my phone's home screen?",
    answer: [
      'Yes. On Chrome or Edge, use the "Install" card on your dashboard. On an iPhone or iPad, open the site in Safari, tap the Share button, then "Add to Home Screen".',
      "It opens like an app, and your saved tickets are one tap away.",
    ],
  },
  {
    id: "calendar-subscribe",
    question: "Can I get all PCPS events in my own calendar?",
    answer: [
      'Yes. On the Events page, press "Subscribe in your calendar" and choose Google Calendar, Apple / Outlook, or copy the link into your calendar app. New and changed events then appear there by themselves, with no need to add each one.',
      "To follow just one club, open the Events page for that club (from the club's details) and use the same button there. Registered an event? Its confirmation email also has a calendar invite for that single event.",
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
    id: "bell",
    question: "What is the bell in the top bar?",
    answer: [
      "The bell collects short messages for you in one place: a seat opened up from a waitlist, your join request was approved or declined, an event you registered for changed or is coming up, a club you joined announced something, or your question was answered.",
      "A number on the bell means messages you have not opened yet. Opening the bell marks them as read. Messages disappear after 60 days. They are extra to the emails, so you can still turn reminder and club emails off in Settings.",
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
