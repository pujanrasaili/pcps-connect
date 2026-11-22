# Handing PCPS Connect to the next team

Students graduate; the site should not die with them. This is the checklist for passing the project on, and for taking it over. It lists only what the project actually uses.

## 1. Know what exists

| Part | Service | Who must be able to log in |
| --- | --- | --- |
| Code and scheduled emails | GitHub (this repository, Actions) | an owner or admin of the repository |
| Website | Vercel | an owner of the Vercel project |
| API | Render | an owner of the Render service |
| Database | MongoDB Atlas | an owner of the Atlas project |
| Pictures | Cloudinary | the account holder |
| Email sending | Brevo (or Gmail) | the account holder |

Fill in this table with real names and where the recovery email goes, and keep it somewhere the next team can read (not in this public repository):

| Service | Account email | Who else has access |
| --- | --- | --- |
| GitHub | | |
| Vercel | | |
| Render | | |
| MongoDB Atlas | | |
| Cloudinary | | |
| Brevo / Gmail | | |

## 2. Settings that must be passed on

Real values live in each service's dashboard, never in the repository. The names are:

- **Render (Environment):** `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_ORIGIN`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `EMAIL_USER`, `EMAIL_APP_PASSWORD`, `CONTACT_RECEIVER_EMAIL`, and `BREVO_API_KEY` / `BREVO_SENDER_EMAIL` when Brevo is used. Push alerts also use `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` if turned on. `backend/.env.example` explains each one.
- **Vercel (Environment Variables):** `VITE_API_URL`, the address of the API.
- **GitHub (Settings, Secrets and variables, Actions):** the secrets `MONGO_URI`, `EMAIL_USER`, `EMAIL_APP_PASSWORD`, `CLIENT_ORIGIN`, and optionally `BREVO_API_KEY` and `BREVO_SENDER_EMAIL`; and the variable `KEEP_WARM_URL` (the API's `/api/health` address).

## 3. Before handing over

1. Run `npm run backup` in `backend/` and keep the copy private. It holds students' personal details.
2. Make sure at least two people can sign in to every service above, so one lost account does not lock the team out.
3. Give the successor's college account the admin role: they register on the site, then someone runs `npm run make-admin -- their.name@patancollege.edu.np` from `backend/`, or an existing admin changes the role in Admin, Users.
4. Add the successor to the GitHub repository (Settings, Collaborators), or transfer the repository to them.
5. Walk them through `docs/ADMIN_GUIDE.md` and the checks in `docs/LIVE_CHECKLIST.md`.

## 4. After the previous owner leaves

Treat every secret the previous owner knew as shared, and replace it:

- **MongoDB Atlas:** create a new database user and password, update `MONGO_URI` on Render and in the GitHub secret, then delete the old user.
- **JWT_SECRET (Render):** set a new long random value. Everyone is signed out once, which is harmless.
- **Gmail app password or Brevo key:** create a new one, update Render and the GitHub secrets, revoke the old one.
- **Cloudinary:** reset the API secret, then update `CLOUDINARY_API_SECRET` on Render.
- **Remove the old owner** from GitHub, Vercel, Render, Atlas and Cloudinary once the new team has confirmed access.

After changing settings, run `npm run smoke` from `backend/` and open the live site once. The smoke test prints PASS or FAIL for the main things.

## 5. Each year

- Check the **Actions** tab: the scheduled emails (event reminders, feedback requests, the weekly digest, join-request reminders) should be running. GitHub switches scheduled workflows off in a repository that has had no activity for 60 days. If that happens the Actions tab shows a banner with an **Enable** button; pressing it turns them back on.
- Merge the Dependabot pull requests when the checks are green.
- Back up the database before the new semester and before any large change.
- Review who still has the admin role (Admin, Users) and who leads each club (Admin, Clubs), and update both for the new term.
