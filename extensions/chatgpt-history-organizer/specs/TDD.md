# TDD — ChatGPT History Organizer

## Test-first contracts

The test suite treats the following as product invariants rather than implementation details.

### Snapshot and enumeration
- a post-snapshot conversation never enters the queue;
- duplicate IDs across overlapping pages are retained once;
- page reordering does not change the set of admitted snapshot IDs;
- malformed list payloads fail rather than fabricate an empty account;
- resume from a persisted enumeration state preserves already admitted IDs.

### Profiling and organization
- raw mapping text is reduced to a compact profile;
- stored profiles do not contain raw transcript text;
- deterministic grouping returns every valid profile exactly once;
- reordering profiles does not change canonical folder membership;
- duplicated input profiles do not duplicate library entries;
- grouping is stable across repeated runs.

### Lifecycle
- Start freezes a run ID/generation/cutoff;
- Pause remembers the phase;
- Resume restores it;
- Reset returns an independent clean baseline with a higher generation;
- stale-generation commit guards reject old work;
- completed/error runs are not silently replaced by Start.

### BYOK
- disabled BYOK leaves deterministic output untouched;
- valid merge/rename output can only consume known deterministic group IDs;
- invented IDs, duplicate source IDs, empty names, and malformed JSON fail closed;
- provider failure cannot erase deterministic folders;
- no raw transcript field is present in the refinement payload.

### Browser architecture
- manifest is MV3;
- ChatGPT host scope is narrow;
- required permissions are exactly those exercised;
- provider hosts are optional, not broad install-time access;
- content bridge has no MutationObserver, polling interval, or future-chat listener;
- background source contains durable storage + alarms recovery;
- ChatGPT adapter contains no POST/PATCH/PUT/DELETE request.

## Metamorphic relations

1. **Input permutation**: permuting profile order preserves canonical folder membership.
2. **Pagination overlap**: repeating any list item/page overlap preserves the frozen unique ID set.
3. **Future noise**: adding any number of conversations with creation time after the snapshot does not change the frozen queue.
4. **Pause/resume equivalence**: pausing and resuming before the next unit produces the same next phase and deterministic result as uninterrupted execution.
5. **Worker restart equivalence**: serializing/deserializing an intermediate pure state preserves subsequent core transitions.
6. **Reset independence**: reset output does not depend on prior profiles/folders/failures except monotonic generation.
7. **BYOK independence**: deterministic folders are identical whether BYOK is disabled or later fails validation.

## Independent hidden holdout

The holdout harness is intentionally not committed with implementation fixtures. It is generated/executed separately after the normal suite is green and before acceptance is recorded.

Holdout dimensions:
- unseen topic vocabulary and random conversation IDs;
- randomized input order;
- duplicated/overlapping pagination with post-snapshot noise;
- checkpoint interruption between batches;
- ambiguous shared vocabulary;
- malformed LLM response including invented source IDs.

Only aggregate holdout results belong in `TEST_REPORT.txt`. If the holdout exposes a defect, implementation and normal tests must be updated, then a fresh holdout case generated rather than tuning to the original held-out instance.