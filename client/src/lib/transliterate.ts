const HALANT = '\u094D';

const consonantMap: [string, string][] = [
  ['ksh', 'क्ष'], ['gny', 'ज्ञ'], ['gy', 'ज्ञ'],
  ['chh', 'छ'],
  ['kh', 'ख'], ['gh', 'घ'], ['ch', 'च'], ['jh', 'झ'],
  ['Th', 'ठ'], ['Dh', 'ढ'], ['th', 'थ'], ['dh', 'ध'],
  ['ph', 'फ'], ['bh', 'भ'],
  ['Sh', 'ष'], ['sh', 'श'],
  ['ng', 'ङ'], ['nj', 'ञ'],
  ['k', 'क'], ['K', 'क'], ['g', 'ग'], ['G', 'ग'],
  ['c', 'च'], ['C', 'च'],
  ['j', 'ज'], ['J', 'ज'],
  ['T', 'ट'], ['D', 'ड'], ['N', 'ण'],
  ['t', 'त'], ['d', 'द'], ['n', 'न'],
  ['p', 'प'], ['P', 'प'], ['b', 'ब'], ['B', 'ब'], ['m', 'म'], ['M', 'म'],
  ['y', 'य'], ['Y', 'य'], ['r', 'र'], ['R', 'र'],
  ['l', 'ल'], ['L', 'ल'],
  ['v', 'व'], ['V', 'व'], ['w', 'व'], ['W', 'व'],
  ['s', 'स'], ['S', 'स'],
  ['h', 'ह'], ['H', 'ह'],
  ['f', 'फ़'], ['F', 'फ़'],
  ['z', 'ज़'], ['Z', 'ज़'],
  ['x', 'क्स'], ['X', 'क्स'],
  ['q', 'क़'], ['Q', 'क़'],
];

const vowelMap: [string, string, string][] = [
  ['aa', 'आ', 'ा'],
  ['AA', 'आ', 'ा'],
  ['Aa', 'आ', 'ा'],
  ['ee', 'ई', 'ी'],
  ['EE', 'ई', 'ी'],
  ['Ee', 'ई', 'ी'],
  ['oo', 'ऊ', 'ू'],
  ['OO', 'ऊ', 'ू'],
  ['Oo', 'ऊ', 'ू'],
  ['ai', 'ऐ', 'ै'],
  ['AI', 'ऐ', 'ै'],
  ['Ai', 'ऐ', 'ै'],
  ['au', 'औ', 'ौ'],
  ['AU', 'औ', 'ौ'],
  ['Au', 'औ', 'ौ'],
  ['ou', 'औ', 'ौ'],
  ['a', 'अ', ''],
  ['A', 'अ', ''],
  ['i', 'इ', 'ि'],
  ['I', 'इ', 'ि'],
  ['u', 'उ', 'ु'],
  ['U', 'उ', 'ु'],
  ['e', 'ए', 'े'],
  ['E', 'ए', 'े'],
  ['o', 'ओ', 'ो'],
  ['O', 'ओ', 'ो'],
];

const specialSequences: [string, string][] = [
  ['Om', 'ॐ'],
  ['om', 'ॐ'],
  ['..', '॥'],
];

function matchConsonant(text: string, pos: number): { char: string; len: number } | null {
  for (const [key, val] of consonantMap) {
    if (text.substring(pos, pos + key.length) === key) {
      return { char: val, len: key.length };
    }
  }
  return null;
}

function matchVowel(text: string, pos: number): { standalone: string; matra: string; len: number } | null {
  for (const [key, standalone, matra] of vowelMap) {
    if (text.substring(pos, pos + key.length) === key) {
      return { standalone, matra, len: key.length };
    }
  }
  return null;
}

export function transliterateWord(word: string): string {
  if (!word || word.length === 0) return word;

  for (const [seq, replacement] of specialSequences) {
    if (word === seq) return replacement;
  }

  if (!/[a-zA-Z]/.test(word)) return word;

  let result = '';
  let i = 0;

  while (i < word.length) {
    if (word[i] === '.' && i === word.length - 1) {
      result += '।';
      i++;
      continue;
    }

    if (word[i] === '~') {
      result += 'ँ';
      i++;
      continue;
    }

    const c = matchConsonant(word, i);
    if (c) {
      i += c.len;

      const v = matchVowel(word, i);
      if (v) {
        result += c.char + v.matra;
        i += v.len;
      } else {
        const nextC = matchConsonant(word, i);
        if (nextC && i < word.length) {
          result += c.char + HALANT;
        } else {
          result += c.char;
        }
      }
      continue;
    }

    const v = matchVowel(word, i);
    if (v) {
      result += v.standalone;
      i += v.len;
      continue;
    }

    result += word[i];
    i++;
  }

  return result;
}

export function transliterateSentence(text: string): string {
  return text.replace(/[a-zA-Z~.]+/g, (match) => transliterateWord(match));
}
