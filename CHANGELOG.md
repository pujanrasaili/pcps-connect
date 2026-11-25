# Changelog

What changed in PCPS Connect, newest first. This lists changes people notice; the full history is in `git log`.

## 24 November 2026: a new look, posters and faster switching

- **New look.** The colours now come from the college crest (PCPS blue and red) instead of the stock indigo and violet. Headings use Bricolage Grotesque and text uses Public Sans. The tilting cards, glowing blobs, wobbling logos and the fade-in on every section are gone, and the small labels above page headings were removed.
- **Club banners.** A club with no banner photo shows its initials on the banner.
- **PCPS Connect poster.** `/poster` makes a printable A4 poster with a QR code to the site, for notice boards and classrooms. It is linked at the bottom of the Help page.
- **Tab titles.** The tickets page, event posters, club posters and certificate pages now have proper tab titles. They used to say "Page not found" or keep the previous page's title.
- **Speed.** Browsers now remember the server's permission check for a day, so each click makes fewer round trips. On a fast connection the Nepali dictionary is fetched in the background, so switching language is instant.
- **Licence.** The project is released under the MIT licence.

## 22 and 23 November 2026: feedback questions and schedule clashes

- **Feedback questions.** Organisers can add up to three questions to an event's feedback form. Students answer them when they rate the event, and the answers appear in the attendee list and the CSV download.
- **Schedule clashes.** A student who is already registered for something at the same time sees a warning on the event, on its card and on the Dashboard. A club leader is warned when they schedule two of the club's own events at the same time.
- **Reminders.** Event reminders go out twice a day, at 8:45 am and 2:45 pm Nepal time.
- **Project guides.** Added the handover guide, the contributing guide, the security policy, and issue and pull request templates.
- **Backend checks.** The backend now has a lint step that runs in CI before the tests.

## 19 to 21 November 2026: sign-up answers

- Students can change their own sign-up answers, including on the waitlist.
- An organiser can see which students still owe an answer to a new required question, and remind them.
- Sign-up answers appear in the confirmation email and the sign-in sheet, and attendees can be searched by an answer.
- "Copy emails" in the attendees window, an Events button for each club on My Clubs, and a date range for the attendance report.
- Events refresh when a tab that has been idle for a long time is reopened.
- Printouts leave out the menus, footer and banners.
- Upgraded to Express 5 and Tailwind CSS 4.

## 18 November 2026 and earlier: sponsors, alumni and campus venues

- Event sponsors with links, alumni listings on club and profile pages, and a list of campus venues with directions in calendar links.
- New Help answers, with Nepali drafts for all new text.
- Safety-net tests that check the API documentation, the audit log labels and the backup against the code.

## July to October 2026: the first version

Built from the initial setup on 11 July 2026: clubs, events, registration with a waitlist, check-in by QR code, certificates, notifications, the admin area, English and Nepali, and the tests and deployment that go with them.
