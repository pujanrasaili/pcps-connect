# Live checklist

Things that can only be checked on the real site, with the real database, email and photo storage. The automated tests use pretend data, so they cannot do these. Each takes a few minutes; tick them off after each larger release.

You need two accounts: your admin account (**A**) and a normal approved student account (**S**). Use a private/incognito window for S so you stay logged in as A in the other.

## 1. Deployment smoke test (2 min)

In the `backend` folder on your own computer:

```
cd backend
npm run smoke
```

Every line should say PASS. If the server was asleep it can take a minute. Any FAIL line: copy it and send it to Claude.

## 2. Club news photo (3 min) - checks Cloudinary

1. As **A**, open a club's page → "Write a news update for this club".
2. Type a sentence, press **Add photo**, choose any phone/laptop picture, press **Post**.
3. The post appears with the photo. Open the photo: it should load full size.
4. In your Cloudinary dashboard (Media Library) a new image should be there.
5. Delete the post (bin icon, confirm). Refresh Cloudinary: the image should be gone.

Fail signs: "Couldn't post your update", a broken image, or the image staying in Cloudinary after deleting.

## 3. Second account (5 min)

As **S**:
1. Join the same club (or already be a member).
2. As **A** post another news update. Within a minute **S** should see: a number on the bell, and a "News from your clubs" card on the Dashboard.
3. As **S**, on the club page use **Suggest an idea** → **Send idea**. As **A** (or the club leader) the bell should show a new idea, and "Ideas from members" lists it.

## 4. Volunteering (5 min)

1. As **A**, open an upcoming event → **Help out** → **Add volunteer roles**. Add "Registration desk" with 1 place and "Setup crew" with 2 places. **Save roles**.
2. As **S**, open the same event → **Sign up to help** on "Registration desk". It should say "You're helping here" and the other button should be greyed out. The Dashboard shows a "You're helping at" card.
3. As **A**, the bell should show: All places are taken for "Registration desk" at ... (only if A did not sign up themselves).
4. As **S**, press **Cancel**. The role shows 0 of 1 again.

### Sign-up questions (3 min)

1. As **A**, open an upcoming event → **Sign-up questions** → **Add questions**. Add "T-shirt size?" (tick **Required**) and "Anything we should know?". **Save questions**.
2. As **S**, press Register. The two questions show; the confirm button stays greyed out until "T-shirt size?" is answered.
3. As **A**, open the event's attendee list. S's answers show under their name, and the CSV download has one column per question.
4. Duplicate the event from Admin → Events: the questions come across, the answers do not.

### Sponsors (2 min)

1. As **A**, open an upcoming event → **Thanks to our partners** → **Add sponsors**. Add "Local Cafe" with the website `example.com`, then **Save sponsors**.
2. As **S** (or logged out), the box shows "Local Cafe" as a link that opens in a new tab. Without a website it is plain text.
3. Try the website `javascript:alert(1)` as **A**: saving should be refused.

### Alumni (2 min)

1. As **S**, join a club, then open its card → **Step down to alumni**. Leave the year, add the note "Treasurer", and press **Leave and join the alumni**.
2. S is no longer a member, and the club's **Alumni** box shows S with the year and note.
3. As another student, the same box shows S but no remove button; as **A** (or the club's leader) there is a remove button next to S.

### Campus venues (2 min)

1. As **A**, open Admin > **Venues**. Add "Seminar Hall" with the directions "Block B, second floor". Adding it again in other capitals should be refused.
2. Create (or edit) an event: the Location box suggests "Seminar Hall". Use exactly that name.
3. Open the event page as anyone: under the location it says "How to find it: Block B, second floor". An event with another location shows nothing extra.

## 5. Full events and leaders (5 min)

1. As **A**, create an event with capacity **1** for a club that has a leader (a third account **L**, made leader in Admin → Clubs → leaders icon, is ideal).
2. As **S**, register. As **A** (and as **L**) the bell should show: "<event> is full". Registering as **A** yourself should not ring A's own bell.
3. Turn on "Approve each person who joins" for another event. As **S** send a request. As **A** and **L** the bell should show "S asked to join ...". As **S** ask a question on the event page: **A** and **L** should both get an email.
4. In Nepali (switch with the language button) the same bell messages should read in Nepali.

## 6. Day-before reminder emails (optional, needs an event tomorrow)

Create an event for tomorrow, register **S** for it and, if you like, also add S as a volunteer. After the next scheduled reminder run (GitHub → Actions → the event reminders workflow; you can also press "Run workflow"), S should receive the email and a bell message. A student who switched event reminders off in Settings receives neither.

## 7. Saved events on two devices (3 min)

Log in as **S** on two devices (or one normal and one private window). Save an event on the first, wait a second, then reload the second: it should show as saved. Unsave it on the second and reload the first: it should be gone. Log out: the saved list on that device should be empty. For the nudge: save an event that starts within 24 hours without registering, then run GitHub → Actions → the event reminders workflow; **S** should get a bell message "You saved <event>: it is on ..." (once, even if the workflow runs twice).

## 8. Rate-the-event request (optional, needs an event that already started)

Mark **S** as attended at an event that started between 3 hours and 3 days ago (Attendees window), without S rating it. Run GitHub → Actions → "Feedback Requests" → "Run workflow". S should get a bell message "How was <event>? Rate it" and an email with a "Rate the event" button that opens the Profile page. Run the workflow again: nothing new is sent. A student who rated already, or switched event reminders off, receives nothing. For an event that started at least 3 days ago and has registrations, its organisers (you as **A**, and the club leader **L**) get the same run's recap: a bell message "Recap for <event>: N of M attended" and an email with turnout, the average rating and up to three comments.

## 9. Nepali pages (10 min)

Switch the site to Nepali and open: Privacy, Terms, an event with volunteer roles, the Dashboard, Help. Anything that is English where it should be Nepali, or Nepali that reads wrong, write down or screenshot and send to Claude. The review sheet `nepali-review.html` lists the strings to check, starting with its "Start here" section, then "New features" (alerts, notice board, activity record, poster, online link, volunteers).

## When something fails

Send Claude the exact words on screen (or a screenshot) and what you pressed. The first red line of a GitHub Actions log is the most useful thing.
