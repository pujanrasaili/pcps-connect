# Security policy

## Reporting a problem

If you find a security problem in PCPS Connect, please report it privately instead of opening a public issue:

1. Open the **Security** tab of this repository and choose **Report a vulnerability** (GitHub's private reporting), or
2. Use the Contact page on the live site and say it is a security report. Please don't include the details in a public message.

Include what you found, the steps to reproduce it, and what you think the impact is. You'll get a reply as soon as the maintainer can read it, and the fix will go out before the details are made public.

## What is already in place

- Passwords are stored hashed, and sign-in uses signed tokens kept in HTTP-only cookies.
- Sensitive routes are limited per person and per address to slow down guessing.
- Staff-only actions are checked on the server, not just hidden in the page, and every admin action is written to an audit log.
- Responses for signed-in people are never cached by the browser or a proxy.
- The site sends a strict Content-Security-Policy and other security headers (see `frontend/vercel.json`).
- `npm audit --omit=dev` is clean for both the backend and the frontend.

## Please don't

- Test against other people's accounts or data.
- Run load tests or automated scanners against the live site.
