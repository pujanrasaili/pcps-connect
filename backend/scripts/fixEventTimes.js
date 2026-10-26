// Corrects event times saved before the time-zone fix (see utils/eventTimeFix.js).
// Shows what it WOULD change and only writes with --yes.
//
//   npm run fix-event-times -- --before 2026-10-26T04:00:00Z          (preview)
//   npm run fix-event-times -- --before 2026-10-26T04:00:00Z --yes    (apply)
//
// --before is the moment the time-zone fix reached the live site: events created
// before it are shifted back 5h45m, events created after it are left alone. Run
// the apply step once -- running it twice would shift the times twice.
// You can also skip this and re-save each upcoming event from Admin -> Events.

require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Event = require("../models/Event");
const { parseFixOptions, planEventTimeFix } = require("../utils/eventTimeFix");

async function run() {
  const options = parseFixOptions(process.argv.slice(2));
  if (options.error) {
    console.error(options.error);
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  const events = await Event.find({}).select("title date createdAt registrationDeadline");
  const plan = planEventTimeFix(events, options);

  if (plan.length === 0) console.log("No events created before that moment. Nothing to do.");
  for (const p of plan) {
    console.log(`${p.title}: ${p.from.toISOString()} -> ${p.to.toISOString()}`);
  }

  if (plan.length && options.apply) {
    for (const p of plan) {
      const update = { date: p.to };
      if (p.deadlineTo) update.registrationDeadline = p.deadlineTo;
      await Event.updateOne({ _id: p.id }, { $set: update });
    }
    console.log(`Updated ${plan.length} event(s).`);
  } else if (plan.length) {
    console.log(`\nPreview only: ${plan.length} event(s) would change. Add --yes to apply (once).`);
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("fix-event-times failed:", err.message);
  process.exit(1);
});
