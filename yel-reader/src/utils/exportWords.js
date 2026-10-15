// Word-list exports (pure; the caller triggers the download).

// Excel and Sheets treat cells starting with these characters as formulas. Prefix a quote so
// text copied from the web (definitions, notes) can never run as one.
const FORMULA_START = /^[=+\-@\t\r]/;

function csvCell(value) {
  let v = value == null ? '' : String(value);
  if (FORMULA_START.test(v)) v = "'" + v;
  return '"' + v.replace(/"/g, '""') + '"';
}

// UTF-8 with a BOM so Excel opens Turkish characters correctly; CRLF line endings.
export function buildCsv(words) {
  const header = ['Word', 'Definition', 'Sentence', 'Example', 'Note', 'Source'];
  const rows = words.map((w) => [w.word, w.definition, w.context, w.example, w.note, w.sourceTitle]);
  return '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const oneLine = (s) => escapeHtml(String(s).replace(/[\t\r\n]+/g, ' ').trim());

// Tab-separated text for Anki's importer. The header lines tell Anki the separator and that
// the back of the card contains HTML, so line breaks and emphasis survive.
export function buildAnki(words) {
  const lines = words.map((w) => {
    const back = [
      w.definition && `<b>${oneLine(w.definition)}</b>`,
      w.context && `<i>${oneLine(w.context)}</i>`,
      w.example && w.example !== w.context && oneLine(w.example),
      w.note && oneLine(w.note),
    ].filter(Boolean).join('<br>');
    return `${oneLine(w.word)}\t${back}`;
  });
  return ['#separator:tab', '#html:true', ...lines].join('\n') + '\n';
}
