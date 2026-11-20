// A background task that fails with nobody waiting for it (an email, a phone
// alert, a reminder sent after the reply went out) would otherwise end the whole
// server on Node 20+, dropping every request in flight. Log it instead and keep
// serving. A genuine crash (an exception thrown outside any promise) is still
// fatal: the process is in an unknown state, and Render restarts it.
function describe(reason) {
  if (reason instanceof Error) return reason.stack || reason.message;
  try {
    if (typeof reason === "string") return reason;
    const text = JSON.stringify(reason);
    return text === undefined ? String(reason) : text;
  } catch {
    return String(reason);
  }
}

function installProcessGuards(proc = process, log = console.error) {
  const onRejection = (reason) => log("Unhandled promise rejection (kept running):", describe(reason));
  proc.on("unhandledRejection", onRejection);
  return onRejection;
}

module.exports = { installProcessGuards, describe };
