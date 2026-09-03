(() => {
  const token = document.querySelector('meta[name="yfl-token"]').content;
  const $ = (selector) => document.querySelector(selector);
  let state = null;
  let selected = 0;
  let dirty = false;
  let timer = null;
  let autosave = null;

  async function api(path, method = 'GET', body = null) {
    const options = { method, headers: { 'X-YFL-Token': token } };
    if (body !== null) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
    const response = await fetch(path, options);
    const data = await response.json().catch(() => ({ error: 'Invalid judge response.' }));
    if (!response.ok) {
      const error = new Error(data.error || 'Judge request failed.');
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function formatSeconds(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  function setHint(text) {
    const box = $('#hintBox');
    box.hidden = !text;
    box.textContent = text || '';
  }

  function renderResult(result) {
    const panel = document.querySelector('.result-panel');
    panel.className = 'result-panel';
    setHint(result && result.hint ? result.hint : '');
    if (!result) {
      $('#resultTitle').textContent = 'Ready';
      $('#result').textContent = 'Write your solution, then compile and run it.';
      return;
    }
    if (result.status === 'saved') {
      $('#resultTitle').textContent = 'Saved';
      $('#result').textContent = result.message || 'Saved on disk.';
      return;
    }
    if (result.status === 'pass') {
      panel.classList.add('good');
      $('#resultTitle').textContent = 'PASS';
      $('#result').textContent = `✓ Python compiled successfully\n✓ ${result.tests || 'All'} objective tests passed`;
      return;
    }
    if (result.status === 'compile') {
      panel.classList.add('bad');
      const c = result.compile || {};
      $('#resultTitle').textContent = 'Compile error';
      $('#result').textContent = `${c.message || 'Syntax error'}${c.line ? `\nLine ${c.line}${c.offset ? `, column ${c.offset}` : ''}` : ''}${c.text ? `\n\n${c.text}` : ''}`;
      return;
    }
    if (result.status === 'runtime') {
      panel.classList.add('bad');
      $('#resultTitle').textContent = `Runtime error · ${result.errorType || 'Exception'}`;
      $('#result').textContent = result.message || 'Your code raised an exception on an objective test.';
      return;
    }
    if (result.status === 'timeout') {
      panel.classList.add('warn');
      $('#resultTitle').textContent = 'Time limit exceeded';
      $('#result').textContent = 'Your solution compiled, but did not finish within the judge time limit.';
      return;
    }
    if (result.status === 'wrong') {
      panel.classList.add('bad');
      $('#resultTitle').textContent = 'Wrong answer';
      $('#result').textContent = '✓ Python compiled successfully\n✗ At least one randomized objective test produced the wrong answer.';
      return;
    }
    panel.classList.add('bad');
    $('#resultTitle').textContent = 'Judge message';
    $('#result').textContent = result.message || 'The judge could not classify this result.';
  }

  function renderHeader() {
    $('#modeBadge').textContent = state.mode === 'preview' ? 'Preview / burn-in' : 'Locked';
    $('#modeBadge').className = 'badge';
    $('#summary').textContent = `${state.complete}/5 passed · fixed 60-minute session · progress saved to disk`;
    $('#bankSize').textContent = `${state.bankSize}-problem pool`;
    $('#progressBar').style.width = `${state.complete * 20}%`;
    $('#previewNote').hidden = state.mode !== 'preview';
    $('#finish').hidden = state.complete !== 5;
    $('#lockedActions').hidden = state.mode !== 'locked';
    if (state.complete === 5) {
      $('#finishText').textContent = state.mode === 'locked'
        ? 'All five current saved solutions passed. The privileged verifier will re-run them before maintenance or uninstall.'
        : 'Preview complete. This confirms the editor/judge flow works, but preview challenges cannot alter the blocker.';
    }
  }

  function renderNav() {
    const nav = $('#problemNav');
    nav.textContent = '';
    state.problems.forEach((problem, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `navbtn${index === selected ? ' active' : ''}${problem.passed ? ' pass' : ''}`;
      const top = document.createElement('span');
      top.textContent = `${problem.passed ? '✓ ' : ''}${index + 1}. ${problem.difficulty}`;
      const small = document.createElement('span');
      small.className = 'small';
      small.textContent = problem.family;
      button.append(top, small);
      button.addEventListener('click', async () => {
        if (dirty) await save(false);
        selected = index;
        await api('/api/select', 'POST', { index }).catch(() => {});
        renderProblem();
      });
      nav.appendChild(button);
    });
  }

  function renderProblem() {
    const problem = state.problems[selected];
    $('#difficulty').textContent = problem.difficulty;
    $('#difficulty').className = `badge ${problem.difficulty.toLowerCase()}`;
    $('#problemId').textContent = problem.id;
    $('#title').textContent = `Problem ${selected + 1}: ${problem.title}`;
    $('#prompt').textContent = problem.prompt;
    $('#functionName').textContent = `${problem.function}(*args)`;
    $('#attempts').textContent = `${problem.attempts || 0} run${problem.attempts === 1 ? '' : 's'}`;
    const concepts = $('#concepts');
    concepts.textContent = '';
    problem.concepts.forEach((concept) => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = concept;
      concepts.appendChild(chip);
    });
    const examples = $('#examples');
    examples.textContent = '';
    problem.examples.forEach((example, index) => {
      const pre = document.createElement('pre');
      pre.className = 'example';
      pre.textContent = `Example ${index + 1}\nargs = ${JSON.stringify(example.args)}\nexpected = ${JSON.stringify(example.expected)}`;
      examples.appendChild(pre);
    });
    $('#code').value = problem.code;
    dirty = false;
    $('#saveState').textContent = 'Saved on disk';
    renderResult(problem.lastResult);
    renderNav();
  }

  function expire() {
    if (timer) clearInterval(timer);
    $('#app').hidden = true;
    $('#expired').hidden = false;
    $('#timer').textContent = '00:00';
  }

  function startTimer() {
    if (timer) clearInterval(timer);
    const tick = () => {
      const remaining = state.expiresAt - Math.floor(Date.now() / 1000);
      $('#timer').textContent = formatSeconds(remaining);
      if (remaining <= 0) expire();
    };
    tick();
    timer = setInterval(tick, 1000);
  }

  async function refresh() {
    try {
      state = await api('/api/state');
      selected = Math.max(0, Math.min(4, state.selected ?? selected));
      $('#app').hidden = false;
      $('#expired').hidden = true;
      renderHeader();
      renderProblem();
      startTimer();
    } catch (error) {
      if (error.status === 410) expire();
      else renderResult({ status: 'runtime', errorType: 'JudgeConnectionError', message: error.message, hint: 'Make sure the local challenge service is running.' });
    }
  }

  async function save(showResult = true) {
    if (!state) return;
    $('#saveState').textContent = 'Saving…';
    try {
      await api('/api/save', 'POST', { index: selected, code: $('#code').value });
      dirty = false;
      $('#saveState').textContent = 'Saved on disk';
      state = await api('/api/state');
      if (showResult) renderResult({ status: 'saved', message: 'Saved. Run this exact version to earn PASS.' });
      renderHeader();
      renderNav();
    } catch (error) {
      $('#saveState').textContent = 'Save failed';
      renderResult({ status: 'runtime', errorType: 'SaveError', message: error.message });
    }
  }

  async function run() {
    $('#run').disabled = true;
    $('#save').disabled = true;
    $('#hint').disabled = true;
    $('#resultTitle').textContent = 'Running…';
    $('#result').textContent = 'Compiling and running randomized objective tests…';
    setHint('');
    try {
      const result = await api('/api/run', 'POST', { index: selected, code: $('#code').value });
      dirty = false;
      state = await api('/api/state');
      renderHeader();
      renderProblem();
      renderResult(result);
    } catch (error) {
      if (error.status === 410) expire();
      else renderResult({ status: 'runtime', errorType: 'JudgeError', message: error.message });
    } finally {
      $('#run').disabled = false;
      $('#save').disabled = false;
      $('#hint').disabled = false;
    }
  }

  async function requestHint() {
    try {
      const result = await api('/api/hint', 'POST', { index: selected });
      setHint(`Hint ${result.level}/${result.max}: ${result.hint}`);
    } catch (error) {
      setHint(error.message);
    }
  }

  async function action(kind) {
    try {
      await api('/api/action', 'POST', { action: kind });
      renderResult({ status: 'pass', tests: '5/5 re-check requested' });
      setHint(kind === 'maintenance'
        ? 'macOS authorization opened. If the independent re-check succeeds, maintenance lasts 10 minutes.'
        : 'macOS authorization opened. The independent re-check must succeed before uninstall.');
    } catch (error) {
      renderResult({ status: 'runtime', errorType: 'MaintenanceError', message: error.message });
    }
  }

  $('#code').addEventListener('input', () => {
    dirty = true;
    $('#saveState').textContent = 'Unsaved changes';
    clearTimeout(autosave);
    autosave = setTimeout(() => save(false), 800);
  });
  $('#code').addEventListener('keydown', (event) => {
    if (event.key === 'Tab') {
      event.preventDefault();
      const field = event.target;
      const start = field.selectionStart;
      const end = field.selectionEnd;
      field.value = `${field.value.slice(0, start)}    ${field.value.slice(end)}`;
      field.selectionStart = field.selectionEnd = start + 4;
      field.dispatchEvent(new Event('input'));
    }
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      run();
    }
  });
  $('#save').addEventListener('click', () => save(true));
  $('#run').addEventListener('click', run);
  $('#hint').addEventListener('click', requestHint);
  $('#maintenance').addEventListener('click', () => action('maintenance'));
  $('#uninstall').addEventListener('click', () => action('uninstall'));
  $('#reload').addEventListener('click', () => location.reload());

  refresh();
})();
