// Password hashing for sign-up, login and password changes.
//
// bcrypt is deliberately slow, and the slow part runs in JavaScript when the
// bcryptjs package does it: while it works, the whole server stops answering
// everyone else. Measured on this app, 20 people logging in at once froze the
// API for about 1.6 seconds, and on a small hosting plan it is far worse. The
// native `bcrypt` package does the same work on background threads, so
// browsing keeps going during a login rush (the same measurement: a 5 ms
// pause) and it handles more logins per second.
//
// Both packages read and write the same hash format, so every stored password
// keeps working. If the native one cannot be loaded on some machine, the
// JavaScript one takes over, slower but identical in result.
let engine;
let name = "bcrypt";
try {
  engine = require("bcrypt");
} catch {
  engine = require("bcryptjs");
  name = "bcryptjs";
}

const ROUNDS = 10;

// Only a few passwords are worked on at a time; the rest wait their turn. The
// background threads are shared with everything else the server does (such as
// compressing replies), so letting a whole rush of logins use all of them at
// once makes ordinary page loads wait behind them.
const MAX_AT_ONCE = Number(process.env.PASSWORD_HASH_CONCURRENCY) || 2;
let running = 0;
const waiting = [];

function limited(work) {
  return new Promise((resolve, reject) => {
    const start = () => {
      running += 1;
      Promise.resolve()
        .then(work)
        .then(resolve, reject)
        .finally(() => {
          running -= 1;
          const next = waiting.shift();
          if (next) next();
        });
    };
    if (running < MAX_AT_ONCE) start();
    else waiting.push(start);
  });
}

const hash = (password, rounds = ROUNDS) => limited(() => engine.hash(password, rounds));
const compare = (password, hashed) => limited(() => engine.compare(password, hashed));

module.exports = { hash, compare, engineName: () => name, ROUNDS };
