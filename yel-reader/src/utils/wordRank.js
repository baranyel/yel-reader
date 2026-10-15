import { parseRanks, rankOf } from './wordRankCore.js';

let ranks = null;
let loading = null;

// Loads the frequency list on first use (separate chunk, only needed when hints are on).
export function loadWordRanks() {
  if (ranks) return Promise.resolve(ranks);
  if (!loading) {
    loading = import('../data/wordRank.txt?raw').then((m) => {
      ranks = parseRanks(m.default);
      return ranks;
    });
  }
  return loading;
}

// Only call after loadWordRanks() has resolved.
export function isRarerThan(base, cap) {
  return ranks ? rankOf(ranks, base) > cap : false;
}
