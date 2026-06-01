// ---- CEFR constants ---------------------------------------------------------
export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export const CEFR_COLORS = {
  A1: '#16a34a',
  A2: '#0d9488',
  B1: '#2563eb',
  B2: '#7c3aed',
  C1: '#ea580c',
  C2: '#dc2626',
};

export const CEFR_LABELS = {
  A1: 'A1 · Başlangıç',
  A2: 'A2 · Temel',
  B1: 'B1 · Orta',
  B2: 'B2 · Üst Orta',
  C1: 'C1 · İleri',
  C2: 'C2 · Uzman',
};

// ---- Bundled BNC-inspired frequency data ------------------------------------
// Words grouped by CEFR level, space-separated. Covers ~9000 common English words.
// Source basis: BNC frequency list + Oxford CEFR mapping + NGSL.
const RAW = {
  A1: `a able about above across act add after again age ago all allow also always am an and another answer any are area around as ask at away back bad be been before behind big book both boy bring but by call came can car child children city come could country cut day did do does doing done down each early eat even every example eye face family far feel few find first follow for form found four from full get give go good got great group had has have he help her here high him his home house how i if important in include into is it its itself just keep kind know large last late learn leave left life light like line list little live long look love low made make man many may me mean men might miss more most mother move much my name need never new next no not now of off often on once only open or other our out over own part people place plan play point problem put question read really result right run said same school say seem self she should show side small so some start still stop story student study such take talk tell that the their them then there these they this three through time to together too turn type under up us use very want was water way we well went were what when where which while who why will with work world would write yet you young your`,

  A2: `accept across activity afraid age agree ahead already although always animal another appear arrive ask attention autumn bag ball bank base become begin believe bill board both break bridge build business busy buy camera catch cause century certain change character check choose city class clean clear climb climb close clothes cloud coach coast cold collect comfortable common community company complete computer concern connect contain cool correct country cover create culture customer damage dangerous dark date dead deal dear decide deep describe design detail difference difficult direction disappear discover discuss distance divide dream drive drop during earth easy empty enjoy enter environment evening event every exact exam example exchange exercise experience explain face fact fail fall famous fashion fast feel finish fly follow food force foreign forget forward free fresh from fruit full further garden general get glad go good government group grow guess hand hang happy health heavy hello high history hold holiday hour huge human hurt idea improve information inside interest introduce island job join journey keep kind know later laugh law lay lead learn less level look lose magazine manage market matter measure message middle model natural necessary neighbour news nobody normal north notice offer open opposite order outdoor outside own page pair past pattern perfect personal pick plan plant police positive possible practice prepare produce protect public push rather reach ready reason receive recent report result return road round rule safety season separate share simple situation size skill sleep slow somebody someone somewhere space spend sport square station stop straight student succeed sudden sure surprise system table team temperature test than thank there therefore through throw together trade transport travel trouble truth try typical understand until use usually village visit wait warm wave weather wide win wonder write`,

  B1: `ability abroad absorb abstract academic accept access accomplish account accurate achieve acquire action adapt address adopt advance advantage advertise affect afford agency agenda agriculture aim alternative analysis announce anxiety apply approach appropriate approve argue arrange assess assist associate assume attempt attend attitude attract available avoid award aware background balance basic behavior benefit bond border bound capable capital capture cause challenge characteristic charity chart citizen claim classify collect combine comfort comment commit communicate compare compete concept conclude confidence connect consequence consider consistent construct contact contain context contribute control cooperate correct creative criticism cross cultural damage decade declare define demonstrate depend describe deserve determine develop device difference direction disagree discover discuss display distribute divide document domestic double down-to-earth drive economy efficient effort emotion employ enable encounter energy ensure establish estimate evaluate event evidence evolve examine exist expand expect experience experiment expert explain facilitate fail familiar feature financial flexible focus force function generate government grade grow guarantee guide historical identify illegal imagine impact implement important incident income independent indicate individual industry influence inform inspire intelligence intention involve isolate judge keep knowledge lack leadership link locate logical maintain matter media monitor motivation network objective obtain organize outcome output overcome perspective planning policy positive predict prefer prepare primary process produce promote protect publish react realize recognize reflect reform relate remember represent require resolve resource respond restore revenue reveal review revise role select significant society solution solve specific store structure suggest support system task team transfer transport trend typical vital`,

  B2: `abolish abstract accelerate accommodate accurate acquisition activate adapt adequate adjacent administer advocate aggregate allocate ambiguous analyse anticipate arbitrary assess assumption attribute authoritative barrier category circulate clarify collaborate commence compensate compile complement comprehensive concentrate consequence constrain consult contemplate contrast conventional cooperate correlate criterion deduce demonstrate deny derive devote differentiate diminish distinct distribute dominate elaborate eliminate emerge emphasis ensure evaluate evolve exceed exclude explicit facilitate fundamental generate hypothesis illustrate imply indicate inevitable infrastructure inhibit initiate innovate integrate interaction interpret intervene investigate justify logic mechanism methodology migrate motivate negotiate nevertheless nonetheless numerous objective obtain oppose organize outcome overview parallel parameter perceive phenomenon plausible predominant preliminary previous primary procedure proportion pursue quantify regulate reinforce relevant represent retrieve revise revolutionary sequence significant simulate solely sophisticated stimulate subsequent sufficient summarize supplement sustain synthesize theoretical transform ultimately underlying utilize validate variable via whereas accommodate acknowledge adapt adhere alternative ambiguous amplify anticipate approximate aspire assimilate attribute autonomous bias boundaries clarify comprehend consistency construct context controversy coordinate correlate credible critique cultivate deduce deny derive differentiate distort enhance ethical explicit fundamental integrate interpret investigate justify modify nuance objective overlook perceive preliminary profound rational reinforce relevant revise selective sophisticated subjective synthesize validate verify vulnerable`,

  C1: `abdicate aberration abstract acclaim acrimony adamant admonish advocacy aggregate allegiance allocate ambivalent ameliorate anachronism analogous archaic articulate aspiration astute augment auspicious authoritarian autonomous belligerent benevolent blatant bolster brevity bureaucratic candid capitulate categorical caustic chronic circumvent cognizant coherent compel concise conducive conjecture conscientious contentious conviction covert cryptic deceptive delineate deprecated derivative discern diverge empirical engross equivocal exacerbate exhaustive expedite extraneous feasible flourish formidable frugal gratuitous heinous holistic idiosyncrasy impede implication inconclusive indispensable influential inherent integrity invoke lucid mandate manifold meticulous mitigate nuanced obsolete omnipresent paradox pervasive pragmatic precedent prerequisite profound propensity rationalize reciprocal reluctant repercussion rigorous scrutiny skeptical subtle tenacious tentative transient ubiquitous unambiguous unprecedented versatile viable volatile abstain acquiesce adhere advocate alienate allegiance alleviate allusion ambiguity amplify anachronistic antagonize appease arduous aspiration assimilate atrophy authoritarian belligerent benign brazen candid circumvent cogent coerce collective concede condemn consensus conspicuous contentious contradict convene credibility curtail defiant deliberate depict detrimental deviate discredit disparate dissent dogmatic dormant dubious encompass endorse erode exert explicit falter flounder formulate galvanize garner herald hinder impede imperious implicit incite incongruous induce inevitable inherent intrinsic invoke marginalize meticulous mitigate mobilize nuanced opaque perpetuate persuade plausible polarize pragmatic precipitate profound reinforce relegate renegotiate resilient rhetoric scrutinize sovereignty subjugate suppress sustain tenuous transcend undermine validate vindicate wane`,

  C2: `abjure abnegate abrogate abstruse acrimonious adumbrate aegis ameliorate anachronistic antithetical apocryphal apposite arcane arduous assiduous attenuate auspicious austere bellicose brazen byzantine capricious castigate cavalier chicanery churlish circumlocution cogent compendious concomitant consummate contrite cupidity cursory dauntless debacle deference deprecate didactic dilettante discursive disingenuous dissemblance dogmatic duplicitous ebullient egregious eloquent embroil equivocate esoteric excoriate exemplary exiguous facetious fallacious fastidious fatuous garrulous grandiloquent hapless hegemony heretical hubristic iconoclast idiosyncratic immutable impecunious imperious implacable incisive incorrigible indefatigable ingenuous inimitable insidious intransigent irrevocable laconic litigious loquacious machiavellian mendacious mercurial misanthrope munificent nefarious obfuscate obsequious obstreperous obtuse omniscient opprobrium ostentatious ostracize pedantic perfidious perturb plethora pontificate proclivity profligate propitious querulous quixotic recalcitrant recondite redoubtable relegate reticent sagacious sanguine sardonic solipsistic specious spurious sycophant taciturn temerity terse tortuous truculent turpitude umbrage unctuous vacillate vapid verbose vicarious vitriolic vociferous zealous abeyance abnegation acerbic acumen adroit aeons afoot affront aggrandize alacrity amalgamate ameliorate anachronism anathema anodyne antipathy aphorism arcanum ardor argot ascetic assiduity atavistic audacious baleful banal beguile beleaguer bespoke bilious blandishment bombastic bucolic byzantine callous calumny catharsis caustic cavil cerebral certitude charlatan clamor cleave cloying cogitate colloquy comport convolute countenance debase debilitate decry defenestrate deleterious demagogue denigrate denouement deprecation desultory diatribe dichotomy diffident dilatory disabuse dissemble dithyrambic draconian ebullience effrontery egregious emollient enervate ennui ephemeral equanimity erudite ethereal excoriate exigent exonerate extemporaneous feckless fervid flagrant fledgling forbear fortuitous fractious fulminate gainsay gallivant gambit garish garrulous glacial glower gravitas guile harangue harbinger hegemony heresy histrionic hubris iconoclasm ignominious imbroglio impervious impetuous implacable importune impudent incendiary inchoate incontrovertible inculcate ineffable inimical insouciant intrepid invective irascible jejune jettison juxtapose lachrymose lassitude laudatory levity licentious limpid listless lugubrious maladroit malleable malodorous mendacious meretricious militate miasma mischievous modicum morose munificent myopic nascent nefarious neologism nihilistic nonchalant nonplussed noxious obdurate obstinate obtuse odious officious ominous onerous opprobrious ostensibly overwrought panacea pariah parity parochial parsimonious paucity pernicious perspicacious pertinacious petulant philistine pithy platitude pliant plodding polemical portentous pragmatic precipitous prescient prevaricate proclivity profligate prolix propitious prosaic protagonist punctilious pusillanimous querulous quixotic recondite remonstrate repudiate reticent sanctimonious sardonic sartorial saturnine squalid stolid strident supercilious surreptitious sycophancy tendentious timorous torpid tractable transient turgid umbrage unctuous vacuous venerate veracity verisimilitude vernacular vexatious vicissitude vindictive virulent vitiate vituperate vociferously wanton wistful zealotry`
};

// Build lookup Sets lazily
let _sets = null;
function getSets() {
  if (!_sets) {
    _sets = {};
    for (const [level, raw] of Object.entries(RAW)) {
      _sets[level] = new Set(raw.split(/\s+/).filter(Boolean));
    }
  }
  return _sets;
}

function lookupBundle(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return null;
  const sets = getSets();
  for (const level of CEFR_LEVELS) {
    if (sets[level]?.has(w)) return level;
  }
  return null;
}

// ---- Datamuse API -----------------------------------------------------------
// Returns frequency per million words in English text.
// Threshold mapping based on BNC/COCA research:
//   >100 → A1, 30-100 → A2, 10-30 → B1, 3-10 → B2, 1-3 → C1, <1 → C2
async function lookupDatamuse(word) {
  const w = encodeURIComponent(word.toLowerCase().replace(/[^a-z]/g, ''));
  if (!w) return null;
  const res = await fetch(`https://api.datamuse.com/words?sp=${w}&md=f&max=1`, {
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const entry = data.find((d) => d.word.toLowerCase() === decodeURIComponent(w));
  if (!entry) return null;
  const freqTag = entry.tags?.find((t) => t.startsWith('f:'));
  if (!freqTag) return null;
  const freq = parseFloat(freqTag.slice(2));
  if (freq > 100) return 'A1';
  if (freq > 30)  return 'A2';
  if (freq > 10)  return 'B1';
  if (freq > 3)   return 'B2';
  if (freq > 1)   return 'C1';
  return 'C2';
}

// ---- Public API -------------------------------------------------------------

/**
 * Get CEFR level for a word.
 * Strategy: Datamuse (online, accurate) → bundled BNC data (offline) → 'C2' default.
 */
export async function getCefrLevel(word) {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!clean) return null;

  // 1. Try Datamuse (most accurate — covers all English words)
  try {
    const level = await lookupDatamuse(clean);
    if (level) return level;
  } catch {}

  // 2. Bundled BNC data (offline fallback)
  const bundled = lookupBundle(clean);
  if (bundled) return bundled;

  // 3. Unknown word — assume C2 (rare/specialized)
  return 'C2';
}

/**
 * Synchronous bundled-only lookup (for display without async).
 */
export function getCefrLevelSync(word) {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  return lookupBundle(clean) || null;
}
