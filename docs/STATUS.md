# Status

## Collection bootstrap — 2026-09-01

### Implemented

- repository collection architecture and policies;
- `AGENTS.md` and durable `HANDOFF.md` continuity protocol;
- machine-readable extension registry;
- imported ChatGPT 10-Day Cleaner v2 source;
- imported LinkedIn Connection Exporter v1.1 source;
- ChatGPT Transcript Exporter v0.1 implementation/spec/tests.

### Observed local verification

Executed from the collection root on 2026-09-01:

```bash
node scripts/test-all.mjs
```

Observed results:

- ChatGPT 10-Day Cleaner: **12/12 passed**, including 25,000 randomized eligibility cases;
- LinkedIn Connection Exporter: **16/16 passed**;
- ChatGPT Transcript Exporter: **18/18 passed**, including 500 randomized dedupe/order trials;
- collection runner: **all registered extension test suites passed**.

These results establish current-tree deterministic/property-test status only.

### Still unverified

- live Brave smoke test of ChatGPT Transcript Exporter on the current ChatGPT UI;
- short-thread vs long/virtualized-thread export comparison;
- actual browser download behavior and formatting fidelity on live ChatGPT;
- current live-site smoke reruns of the two imported extensions.
