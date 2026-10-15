// Tiny English lemmatiser: given an inflected form, propose possible base forms.
// It only proposes candidates — callers must confirm them (dictionary hit, saved word)
// and always try the word itself first, so false candidates are harmless.

const IRREGULAR = {
  am: 'be', is: 'be', are: 'be', was: 'be', were: 'be', been: 'be', being: 'be',
  has: 'have', had: 'have', having: 'have', does: 'do', did: 'do', done: 'do', doing: 'do',
  went: 'go', gone: 'go', goes: 'go', said: 'say', made: 'make', took: 'take', taken: 'take',
  came: 'come', saw: 'see', seen: 'see', knew: 'know', known: 'know', got: 'get', gotten: 'get',
  gave: 'give', given: 'give', found: 'find', thought: 'think', told: 'tell', became: 'become',
  left: 'leave', felt: 'feel', brought: 'bring', began: 'begin', begun: 'begin', kept: 'keep',
  held: 'hold', wrote: 'write', written: 'write', stood: 'stand', heard: 'hear', meant: 'mean',
  met: 'meet', ran: 'run', paid: 'pay', sat: 'sit', spoke: 'speak', spoken: 'speak', lay: 'lie',
  lain: 'lie', led: 'lead', grew: 'grow', grown: 'grow', lost: 'lose', fell: 'fall', fallen: 'fall',
  sent: 'send', built: 'build', understood: 'understand', drew: 'draw', drawn: 'draw',
  broke: 'break', broken: 'break', spent: 'spend', rose: 'rise', risen: 'rise', drove: 'drive',
  driven: 'drive', bought: 'buy', wore: 'wear', worn: 'wear', chose: 'choose', chosen: 'choose',
  caught: 'catch', taught: 'teach', sold: 'sell', slept: 'sleep', ate: 'eat', eaten: 'eat',
  flew: 'fly', flown: 'fly', swam: 'swim', swum: 'swim', sang: 'sing', sung: 'sing',
  threw: 'throw', thrown: 'throw', forgot: 'forget', forgotten: 'forget', hid: 'hide',
  hidden: 'hide', shook: 'shake', shaken: 'shake', woke: 'wake', woken: 'wake', won: 'win',
  fought: 'fight', sought: 'seek', swore: 'swear', bit: 'bite', bitten: 'bite', blew: 'blow',
  blown: 'blow', dug: 'dig', fed: 'feed', hung: 'hang', lit: 'light', rode: 'ride',
  ridden: 'ride', shot: 'shoot', stole: 'steal', stolen: 'steal', struck: 'strike',
  tore: 'tear', torn: 'tear', wept: 'weep', children: 'child', men: 'man', women: 'woman',
  feet: 'foot', teeth: 'tooth', mice: 'mouse', people: 'person', geese: 'goose',
  lives: 'life', wives: 'wife', knives: 'knife', leaves: 'leaf', wolves: 'wolf',
  halves: 'half', shelves: 'shelf', thieves: 'thief', better: 'good', best: 'good',
  worse: 'bad', worst: 'bad',
};

const VOWELS = /[aeiou]/;
const isDoubledConsonant = (s) => s.length > 2 && s.at(-1) === s.at(-2) && !VOWELS.test(s.at(-1));

const memo = new Map();

// Ordered, de-duplicated base-form candidates for `word` (lower-case), never including
// the word itself. `minLen` drops very short stems (use a higher value when matching
// against saved words, where a wrong match is more visible than a missed one).
export function lemmaCandidates(word, minLen = 3) {
  const key = word + '|' + minLen;
  const hit = memo.get(key);
  if (hit) return hit;

  const out = [];
  const add = (c, force = false) => {
    if (c && c !== word && (force || c.length >= minLen) && !out.includes(c)) out.push(c);
  };

  let w = word;
  if (IRREGULAR[w]) add(IRREGULAR[w], true);

  // Possessives: duck's → duck, ducks' → ducks
  if (w.endsWith("'s")) { w = w.slice(0, -2); add(w); }
  else if (w.endsWith("s'")) { w = w.slice(0, -1); add(w); }
  if (IRREGULAR[w]) add(IRREGULAR[w], true);

  const stripped = (suffix) => w.slice(0, -suffix.length);

  if (w.endsWith('ies') && w.length > 4) add(stripped('ies') + 'y');
  if (w.endsWith('ves')) { add(stripped('ves') + 'f'); add(stripped('ves') + 'fe'); }
  if (/(s|x|z|ch|sh|o)es$/.test(w)) add(stripped('es'));
  if (w.endsWith('s') && !/(ss|us|is)$/.test(w)) { add(stripped('s')); }

  if (w.endsWith('ying')) add(stripped('ying') + 'ie');
  if (w.endsWith('ing') && w.length > 4) {
    const stem = stripped('ing');
    if (isDoubledConsonant(stem)) add(stem.slice(0, -1));
    add(stem);
    add(stem + 'e');
  }

  if (w.endsWith('ied')) add(stripped('ied') + 'y');
  if (w.endsWith('ed') && w.length > 3) {
    const stem = stripped('ed');
    if (isDoubledConsonant(stem)) add(stem.slice(0, -1));
    add(stem);
    add(stem + 'e');
  }

  if (w.endsWith('ier')) add(stripped('ier') + 'y');
  if (w.endsWith('iest')) add(stripped('iest') + 'y');
  if (w.endsWith('er') && w.length > 4) {
    const stem = stripped('er');
    if (isDoubledConsonant(stem)) add(stem.slice(0, -1));
    add(stem);
    add(stem + 'e');
  }
  if (w.endsWith('est') && w.length > 5) {
    const stem = stripped('est');
    if (isDoubledConsonant(stem)) add(stem.slice(0, -1));
    add(stem);
    add(stem + 'e');
  }

  if (w.endsWith('ily')) add(stripped('ily') + 'y');
  if (w.endsWith('ly') && w.length > 4) add(stripped('ly'));

  if (memo.size > 5000) memo.clear();
  memo.set(key, out);
  return out;
}

// True if `base` is saved itself or is an inflected form of a saved word.
export function matchesSaved(savedSet, base) {
  if (savedSet.has(base)) return true;
  for (const c of lemmaCandidates(base, 4)) if (savedSet.has(c)) return true;
  return false;
}
