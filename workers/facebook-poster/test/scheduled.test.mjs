import assert from "node:assert/strict";

import { scheduledHourUTC, shouldRunScheduledReels } from "../src/index.js";

assert.equal(
  scheduledHourUTC({ scheduledTime: Date.UTC(2026, 5, 4, 9, 0, 0), cron: "0 9,12,15 * * *" }),
  9,
);
assert.equal(
  shouldRunScheduledReels({
    scheduledTime: Date.UTC(2026, 5, 4, 9, 0, 0),
    cron: "0 9,12,15 * * *",
  }),
  false,
);
assert.equal(
  shouldRunScheduledReels({
    scheduledTime: Date.UTC(2026, 5, 4, 12, 0, 0),
    cron: "0 9,12,15 * * *",
  }),
  false,
);
assert.equal(
  shouldRunScheduledReels({
    scheduledTime: Date.UTC(2026, 5, 4, 15, 0, 0),
    cron: "0 9,12,15 * * *",
  }),
  true,
);
assert.equal(scheduledHourUTC({ cron: "0 15 * * *" }), 15);
