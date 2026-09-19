(function (root, factory) {
  const core = factory();
  if (typeof module === 'object' && module.exports) module.exports = core;
  else root.RelayCore = core;
})(typeof window === 'undefined' ? {} : window, function () {
  'use strict';
  const DIRECTIONS = [1, 2, 4, 8]; // north, east, south, west
  const OPPOSITE = [4, 8, 1, 2];

  function hashSeed(value) {
    let hash = 2166136261;
    for (const char of String(value)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    return hash >>> 0;
  }
  function random(seed) {
    let state = hashSeed(seed);
    return function () {
      state += 0x6d2b79f5;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rotate(mask, turns = 1) {
    let result = mask & 15;
    const count = ((turns % 4) + 4) % 4;
    for (let n = 0; n < count; n++) result = ((result << 1) & 15) | (result >>> 3);
    return result;
  }
  function neighbor(index, direction, size) {
    const row = Math.floor(index / size), col = index % size;
    if (direction === 0) return row ? index - size : -1;
    if (direction === 1) return col < size - 1 ? index + 1 : -1;
    if (direction === 2) return row < size - 1 ? index + size : -1;
    return col ? index - 1 : -1;
  }
  function analyze(level, masks) {
    if (!Array.isArray(masks) || masks.length !== level.size ** 2) throw new Error('Invalid board length');
    const powered = new Set([level.source]);
    const queue = [level.source];
    let openPorts = 0;
    for (let index = 0; index < masks.length; index++) {
      DIRECTIONS.forEach((bit, direction) => {
        if (!(masks[index] & bit)) return;
        const next = neighbor(index, direction, level.size);
        if (next < 0 || !(masks[next] & OPPOSITE[direction])) openPorts++;
      });
    }
    for (let offset = 0; offset < queue.length; offset++) {
      const index = queue[offset];
      DIRECTIONS.forEach((bit, direction) => {
        if (!(masks[index] & bit)) return;
        const next = neighbor(index, direction, level.size);
        if (next >= 0 && (masks[next] & OPPOSITE[direction]) && !powered.has(next)) {
          powered.add(next); queue.push(next);
        }
      });
    }
    return { powered: [...powered], openPorts, won: powered.size === masks.length && openPorts === 0 };
  }
  function createLevel({ size = 4, seed = 'garden', tutorial = false } = {}) {
    if (!Number.isInteger(size) || size < 3 || size > 7) throw new Error('Size must be an integer from 3 to 7');
    if (tutorial) {
      const solution = [2, 10, 12, 6, 10, 9, 3, 10, 8];
      const start = [...solution]; start[4] = rotate(start[4]);
      return { size: 3, seed: 'first-bloom', source: 0, solution, start, tutorial: true };
    }
    const rng = random(seed);
    const solution = Array(size * size).fill(0);
    const visited = new Set([0]), stack = [0];
    while (stack.length) {
      const index = stack[stack.length - 1];
      const candidates = DIRECTIONS.map((bit, direction) => ({ bit, direction, next: neighbor(index, direction, size) }))
        .filter(({ next }) => next >= 0 && !visited.has(next));
      if (!candidates.length) { stack.pop(); continue; }
      const edge = candidates[Math.floor(rng() * candidates.length)];
      solution[index] |= edge.bit;
      solution[edge.next] |= OPPOSITE[edge.direction];
      visited.add(edge.next); stack.push(edge.next);
    }
    const start = solution.map((mask, index) => index === 0 ? mask : rotate(mask, Math.floor(rng() * 4)));
    const level = { size, seed: String(seed), source: 0, solution, start, tutorial: false };
    if (analyze(level, start).won) {
      const index = start.findIndex((mask, i) => i !== 0 && rotate(mask) !== mask);
      start[index] = rotate(start[index]);
    }
    return level;
  }
  function validMasks(level, masks) {
    return Array.isArray(masks) && masks.length === level.solution.length && masks.every((mask, i) =>
      Number.isInteger(mask) && mask > 0 && mask < 16 &&
      (i !== level.source || mask === level.solution[i]) &&
      [0, 1, 2, 3].some(turns => rotate(level.solution[i], turns) === mask));
  }
  function newGame(level) { return { masks: [...level.start], moves: 0, hints: 0, history: [] }; }
  function turn(level, state, index, direction = 1) {
    if (!Number.isInteger(index) || index < 0 || index >= state.masks.length || index === level.source || analyze(level, state.masks).won) return state;
    const masks = [...state.masks]; masks[index] = rotate(masks[index], direction < 0 ? -1 : 1);
    return { ...state, masks, moves: state.moves + 1, history: [...state.history.slice(-99), [...state.masks]] };
  }
  function undo(state) {
    if (!state.history.length) return state;
    return { ...state, masks: [...state.history[state.history.length - 1]], moves: state.moves + 1, history: state.history.slice(0, -1) };
  }
  function hint(level, state) {
    if (analyze(level, state.masks).won) return { state, index: -1 };
    const index = state.masks.findIndex((mask, i) => i !== level.source && mask !== level.solution[i]);
    if (index < 0) return { state, index: -1 };
    const masks = [...state.masks]; masks[index] = level.solution[index];
    return { index, state: { ...state, masks, moves: state.moves + 1, hints: state.hints + 1, history: [...state.history.slice(-99), [...state.masks]] } };
  }
  function restore(level, value) {
    if (!value || !validMasks(level, value.masks) || !Number.isSafeInteger(value.moves) || value.moves < 0 ||
        !Number.isSafeInteger(value.hints) || value.hints < 0 || value.hints > value.moves) return null;
    const history = Array.isArray(value.history) ? value.history.slice(-100).filter(masks => validMasks(level, masks)) : [];
    return { masks: [...value.masks], moves: value.moves, hints: value.hints, history };
  }
  return { DIRECTIONS, hashSeed, rotate, neighbor, analyze, createLevel, validMasks, newGame, turn, undo, hint, restore };
});
