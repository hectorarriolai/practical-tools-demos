(function () {
  'use strict';
  const C = window.RelayCore, config = window.RelayConfig;
  const $ = id => document.getElementById(id);
  const today = new Date().toISOString().slice(0, 10);
  let stored = {}, storageAvailable = true;
  try {
    const raw = localStorage.getItem(config.storageKey);
    if (raw && raw.length < 150000) stored = JSON.parse(raw) || {};
    if (typeof stored !== 'object' || Array.isArray(stored)) stored = {};
  } catch (_) { storageAvailable = false; }
  let language = stored.language === 'es' ? 'es' : 'en';
  let soundOn = stored.soundOn === true, audioContext;
  const completed = {};
  if (stored.completed && typeof stored.completed === 'object') {
    Object.entries(stored.completed).forEach(([key, value]) => {
      if (/^\d+$/.test(key) && Number(key) < config.levels.length && value === true) completed[key] = true;
    });
  }
  let mode = 'campaign';
  let levelIndex = Number.isInteger(stored.levelIndex) && stored.levelIndex >= 0 && stored.levelIndex < config.levels.length ? stored.levelIndex : 0;
  let level, state, winShown = false, lastHint = -1;
  const query = new URLSearchParams(location.search);
  const customSeed = query.get('seed');
  if (customSeed && customSeed.length <= 100) mode = 'custom';
  function t(key) {
    const value = config.text[language][key];
    return typeof value === 'string' ? value.replace('{count}', config.levels.length) : value;
  }
  Object.entries(config.colors).forEach(([key, value]) => document.documentElement.style.setProperty(`--${key}`, value));
  $('brand-title').textContent = config.title;
  document.title = config.title;

  function save() {
    try {
      localStorage.setItem(config.storageKey, JSON.stringify({ version: 1, language, soundOn, completed, levelIndex,
        campaign: mode === 'campaign' ? { index: levelIndex, seed: level.seed, state } : stored.campaign }));
      if (mode === 'campaign') stored.campaign = { index: levelIndex, seed: level.seed, state };
    } catch (_) { storageAvailable = false; }
    $('save-status').textContent = t(storageAvailable ? 'saved' : 'noSave');
  }
  function tone(won = false) {
    if (!soundOn) return;
    try {
      if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') audioContext.resume();
      (won ? [392, 494, 587] : [247 + C.analyze(level, state.masks).powered.length * 4]).forEach((frequency, i) => {
        const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
        const at = audioContext.currentTime + i * .13;
        oscillator.type = 'sine'; oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(.0001, at); gain.gain.exponentialRampToValueAtTime(.035, at + .015);
        gain.gain.exponentialRampToValueAtTime(.0001, at + .22);
        oscillator.connect(gain); gain.connect(audioContext.destination);
        oscillator.start(at); oscillator.stop(at + .24);
      });
    } catch (_) { soundOn = false; }
  }
  function svg(mask, source, endpoint) {
    const ends = [[50, 0], [100, 50], [50, 100], [0, 50]];
    const paths = C.DIRECTIONS.map((bit, i) => mask & bit ? `<path d="M50 50 L${ends[i][0]} ${ends[i][1]}"/>` : '').join('');
    const petals = endpoint && !source ? '<g class="petal"><ellipse cx="50" cy="39" rx="5" ry="9"/><ellipse cx="50" cy="61" rx="5" ry="9"/><ellipse cx="39" cy="50" rx="9" ry="5"/><ellipse cx="61" cy="50" rx="9" ry="5"/></g>' : '';
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round">${paths}</g>${petals}<circle class="node" cx="50" cy="50" r="${source ? 13 : endpoint ? 7 : 4}" fill="${source ? '#e5b75e' : 'currentColor'}" stroke="currentColor" stroke-width="${source ? 3 : 2}"/>${source ? '<circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 5"/>' : ''}</svg>`;
  }
  function load(nextMode = 'campaign', index = levelIndex, restoreSaved = false) {
    if ($('win-dialog').open) $('win-dialog').close();
    mode = nextMode; levelIndex = index; lastHint = -1; winShown = false;
    if (mode === 'daily') level = C.createLevel({ size: 5, seed: `daily-${today}` });
    else if (mode === 'custom') {
      const requested = Number(query.get('size'));
      level = C.createLevel({ size: Number.isInteger(requested) && requested >= 3 && requested <= 7 ? requested : 4, seed: customSeed });
    } else level = C.createLevel(config.levels[levelIndex]);
    const saved = stored.campaign;
    state = restoreSaved && mode === 'campaign' && saved && saved.index === levelIndex && saved.seed === level.seed ? C.restore(level, saved.state) : null;
    if (!state) state = C.newGame(level);
    // Restoring a finished board should not reopen a celebration on every page load.
    if (restoreSaved && C.analyze(level, state.masks).won) winShown = true;
    render(); save();
  }
  function announce(message) { $('announcement').textContent = message; }
  function showBoard() {
    document.querySelector('.game-panel').scrollIntoView({ block: 'start', behavior: 'auto' });
  }
  function act(index, direction) {
    if (index === level.source) { announce(t('source')); return; }
    const next = C.turn(level, state, index, direction);
    if (next === state) return;
    state = next; lastHint = -1; tone(); render(index); save();
  }
  function render(focusIndex) {
    document.documentElement.lang = language;
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    $('sound').textContent = t(soundOn ? 'soundOn' : 'soundOff'); $('sound').setAttribute('aria-pressed', String(soundOn));
    $('language').textContent = t('language');
    document.querySelector('.game-panel').setAttribute('aria-label', t('puzzle'));
    $('board').setAttribute('aria-label', t('board'));
    $('level-picker').setAttribute('aria-label', t('choose'));
    $('mode-label').textContent = mode === 'campaign' ? `${t('garden')} ${String(levelIndex + 1).padStart(2, '0')} / ${config.levels.length}` : t(mode === 'daily' ? 'daily' : 'studio');
    $('level-title').textContent = mode === 'daily' ? today : `${level.size} × ${level.size}`;
    const analysis = C.analyze(level, state.masks), powered = new Set(analysis.powered);
    const board = $('board'); board.style.setProperty('--size', level.size); board.replaceChildren();
    state.masks.forEach((mask, index) => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = `tile${powered.has(index) ? ' powered' : ''}${index === level.source ? ' source' : ''}${level.tutorial && state.moves === 0 && index === 4 ? ' tutorial' : ''}${index === lastHint ? ' hinted' : ''}`;
      button.dataset.cell = index;
      const directions = C.DIRECTIONS.map((bit, d) => mask & bit ? t('directions')[d] : '').filter(Boolean).join(', ');
      button.setAttribute('aria-label', `${t('row')} ${Math.floor(index / level.size) + 1}, ${t('column')} ${index % level.size + 1}; ${t('paths')}: ${directions}; ${t(powered.has(index) ? 'powered' : 'unpowered')}${index === level.source ? `; ${t('source')}` : ''}`);
      if (index === level.source) button.setAttribute('aria-disabled', 'true');
      button.innerHTML = svg(mask, index === level.source, [1, 2, 4, 8].includes(mask));
      button.addEventListener('click', () => act(index, 1));
      button.addEventListener('contextmenu', event => { event.preventDefault(); act(index, -1); });
      button.addEventListener('keydown', event => {
        const steps = { ArrowUp: -level.size, ArrowDown: level.size, ArrowLeft: -1, ArrowRight: 1 };
        if (event.key in steps) {
          event.preventDefault(); const next = index + steps[event.key];
          if (next >= 0 && next < state.masks.length &&
              (!(event.key === 'ArrowLeft' || event.key === 'ArrowRight') || Math.floor(next / level.size) === Math.floor(index / level.size))) board.children[next].focus();
        } else if (event.shiftKey && event.key === 'Enter') { event.preventDefault(); act(index, -1); }
      });
      board.append(button);
    });
    $('connected').textContent = `${powered.size} / ${state.masks.length}`;
    $('moves').textContent = state.moves;
    $('progress-bar').style.width = `${100 * powered.size / state.masks.length}%`;
    $('loose-ends').textContent = analysis.won ? t('complete') : `${analysis.openPorts} ${t('open')}`;
    $('tutorial-note').hidden = !level.tutorial || state.moves > 0;
    $('undo').disabled = !state.history.length; $('hint').disabled = analysis.won;
    if (analysis.won && mode === 'campaign') completed[levelIndex] = true;
    const picker = $('level-picker'); picker.replaceChildren();
    config.levels.forEach((entry, index) => {
      const button = document.createElement('button'); button.type = 'button';
      button.className = `level-button${completed[index] ? ' finished' : ''}`;
      button.textContent = String(index + 1).padStart(2, '0');
      button.setAttribute('aria-label', `${t('garden')} ${index + 1}, ${t(completed[index] ? 'finished' : 'notFinished')}`);
      if (mode === 'campaign' && index === levelIndex) button.setAttribute('aria-current', 'true');
      button.addEventListener('click', () => { load('campaign', index); showBoard(); }); picker.append(button);
    });
    $('completed-count').textContent = `${Object.keys(completed).length} / ${config.levels.length}`;
    $('save-status').textContent = t(storageAvailable ? 'saved' : 'noSave');
    if (Number.isInteger(focusIndex)) board.children[focusIndex]?.focus({ preventScroll: true });
    if (analysis.won) {
      $('win-stats').textContent = `${state.moves} ${t(state.moves === 1 ? 'oneMove' : 'detail')} · ${state.hints} ${t(state.hints === 1 ? 'oneHint' : 'hintCount')}`;
      $('next').textContent = mode !== 'campaign' ? t('back') : levelIndex === config.levels.length - 1 ? t('dailyPlay') : t('next');
    }
    if (analysis.won && !winShown) {
      winShown = true;
      $('win-dialog').showModal(); tone(true);
    }
  }
  $('undo').addEventListener('click', () => { state = C.undo(state); winShown = false; lastHint = -1; render(); save(); });
  $('restart').addEventListener('click', () => { state = C.newGame(level); winShown = false; lastHint = -1; render(); save(); announce(t('resetMessage')); });
  $('hint').addEventListener('click', () => { const result = C.hint(level, state); state = result.state; lastHint = result.index; render(); save(); announce(t('hintNote')); });
  $('language').addEventListener('click', () => { language = language === 'en' ? 'es' : 'en'; render(); save(); });
  $('sound').addEventListener('click', () => { soundOn = !soundOn; tone(); render(); save(); });
  $('daily').addEventListener('click', () => { load('daily'); showBoard(); });
  $('stay').addEventListener('click', () => $('win-dialog').close());
  $('next').addEventListener('click', () => {
    if (mode !== 'campaign') load('campaign', levelIndex);
    else if (levelIndex + 1 < config.levels.length) load('campaign', levelIndex + 1);
    else load('daily');
  });
  load(mode, levelIndex, true);
})();
