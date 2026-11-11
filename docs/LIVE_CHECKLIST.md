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

## 5. Day-before reminder emails (optional, needs an event tomorrow)

Create an event for tomorrow, register **S** for it and, if you like, also add S as a volunteer. After the next scheduled reminder run (GitHub → Actions → the event reminders workflow; you can also press "Run workflow"), S should receive the email and a bell message. A student who switched event reminders off in Settings receives neither.

## 6. Nepali pages (10 min)

Switch the site to Nepali and open: Privacy, Terms, an event with volunteer roles, the Dashboard, Help. Anything that is English where it should be Nepali, or Nepali that reads wrong, write down or screenshot and send to Claude. The review sheet `nepali-review.html` lists the strings to check, starting with its "Start here" section, then "New features" (alerts, notice board, activity record, poster, online link, volunteers).

## When something fails

Send Claude the exact words on screen (or a screenshot) and what you pressed. The first red line of a GitHub Actions log is the most useful thing.
