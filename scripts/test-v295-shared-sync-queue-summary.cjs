const fs = require("node:fs");
const assert = require("node:assert/strict");

const hook = fs.readFileSync("hooks/useSyncQueueSummary.ts", "utf8");
const indicator = fs.readFileSync("components/SyncStatusIndicator.tsx", "utf8");
const alert = fs.readFileSync("components/GlobalSyncIssueAlert.tsx", "utf8");

assert.match(hook, /liveQuery\(async \(\) =>/, "queue summary needs one Dexie live projection");
assert.match(hook, /useSyncExternalStore\(subscribe, getSnapshot, getServerSnapshot\)/, "consumers must share a cached snapshot");
assert.match(hook, /if \(subscription\) return/, "the projection must not duplicate while active");
assert.match(hook, /listeners\.size === 0/, "the projection must stop after the last consumer");
assert.match(hook, /subscription\.unsubscribe\(\)/, "the Dexie subscription must be released");
assert.match(hook, /rows\.length - failed/, "pending and failed semantics must remain unchanged");
assert.match(hook, /sameSummary\(snapshot, next\)/, "unchanged summaries must not trigger rerenders");
assert.doesNotMatch(hook, /dexie-react-hooks/, "the shared projection must not instantiate useLiveQuery per consumer");
assert.match(indicator, /useSyncQueueSummary/, "the status indicator must keep the canonical summary");
assert.match(alert, /useSyncQueueSummary/, "the global alert must keep the canonical summary");

console.log("V295 shared sync queue summary contract passed");
