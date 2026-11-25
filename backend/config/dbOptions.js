// How the server talks to MongoDB. Mongoose's defaults allow up to 100 open
// connections per server and wait 30 seconds before giving up on an unreachable
// database. The free Atlas tier allows only 500 connections in total, and a
// request that hangs for 30 seconds is worse than a quick error the page can
// show, so both are set explicitly here.
const DEFAULT_POOL = 10;

function whole(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) return fallback;
  return n;
}

function dbOptions(env = process.env) {
  return {
    maxPoolSize: whole(env.MONGO_POOL_SIZE, DEFAULT_POOL, 1, 100),
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  };
}

module.exports = { dbOptions, DEFAULT_POOL };
