export function sampleUnique(items, count, random = Math.random) {
  if (!Array.isArray(items) || count < 0 || count > items.length) {
    throw new RangeError("count must fit inside items");
  }
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

export function createChallengeState(problemIds, count, now = Date.now(), random = Math.random) {
  return {
    createdAt: now,
    selectedIds: sampleUnique(problemIds, count, random),
    passedIds: [],
    codeById: {},
    activeProblemId: null
  };
}

export function withActiveProblem(state, problemId) {
  if (!state.selectedIds.includes(problemId)) throw new Error("Problem is not in this session");
  return { ...state, activeProblemId: problemId };
}

export function withCode(state, problemId, code) {
  if (!state.selectedIds.includes(problemId)) throw new Error("Problem is not in this session");
  return { ...state, codeById: { ...state.codeById, [problemId]: code } };
}

export function withPassed(state, problemId) {
  if (!state.selectedIds.includes(problemId)) throw new Error("Problem is not in this session");
  if (state.passedIds.includes(problemId)) return state;
  return { ...state, passedIds: [...state.passedIds, problemId] };
}

export function progress(state) {
  return { passed: state.passedIds.length, total: state.selectedIds.length };
}
