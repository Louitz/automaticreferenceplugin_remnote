import assert from 'node:assert/strict';
import { selectHighlightRanges } from '../src/highlight_logic';

type TestCase = {
  name: string;
  text: string;
  knownTerms: string[];
  expected: string[];
};

const cases: TestCase[] = [
  { name: 'single word exact', text: 'Test', knownTerms: ['Test'], expected: ['Test'] },
  { name: 'single word in sentence', text: 'Ich mag Test', knownTerms: ['Test'], expected: ['Test'] },
  { name: 'case insensitive', text: 'ich mag test', knownTerms: ['Test'], expected: ['test'] },
  { name: 'two matches', text: 'Test und DHCP', knownTerms: ['Test', 'DHCP'], expected: ['Test', 'DHCP'] },
  { name: 'repeated match', text: 'Test Test', knownTerms: ['Test'], expected: ['Test', 'Test'] },
  { name: 'hyphenated word', text: 'Zero-Trust ist wichtig', knownTerms: ['Zero-Trust'], expected: ['Zero-Trust'] },
  { name: 'four word exact blocked by limit', text: 'Dynamic Host Configuration Protocol', knownTerms: ['Dynamic Host Configuration Protocol'], expected: [] },
  { name: 'two word exact', text: 'Public Accountant', knownTerms: ['Public Accountant'], expected: ['Public Accountant'] },
  { name: 'three word exact', text: 'Central Processing Unit', knownTerms: ['Central Processing Unit'], expected: ['Central Processing Unit'] },
  { name: 'prefer three word phrase under limit', text: 'Dynamic Host Configuration', knownTerms: ['Dynamic Host', 'Dynamic Host Configuration'], expected: ['Dynamic Host Configuration'] },
  { name: 'prefer three word phrase in sentence', text: 'Das ist Dynamic Host Configuration heute', knownTerms: ['Dynamic Host', 'Dynamic Host Configuration'], expected: ['Dynamic Host Configuration'] },
  { name: 'non overlap kept', text: 'Test DHCP', knownTerms: ['Test', 'DHCP'], expected: ['Test', 'DHCP'] },
  { name: 'punctuation suffix', text: 'Test, danach weiter', knownTerms: ['Test'], expected: ['Test'] },
  { name: 'punctuation prefix', text: '(Test) ist da', knownTerms: ['Test'], expected: ['Test'] },
  { name: 'ignore short word', text: 'an Test', knownTerms: ['an', 'Test'], expected: ['Test'] },
  { name: 'ignore unknown term', text: 'Foo Bar', knownTerms: ['Baz'], expected: [] },
  { name: 'mixed known and unknown', text: 'Foo Test Bar', knownTerms: ['Test'], expected: ['Test'] },
  { name: 'multi word with tail', text: 'Ich kenne Domain Name System sehr gut', knownTerms: ['Domain Name System'], expected: ['Domain Name System'] },
  { name: 'multiple phrases with three word cap', text: 'Domain Name System und Central Processing Unit', knownTerms: ['Domain Name System', 'Central Processing Unit'], expected: ['Domain Name System', 'Central Processing Unit'] },
  { name: 'adjacent spaces preserved by ranges', text: 'Test  DHCP', knownTerms: ['Test', 'DHCP'], expected: ['Test', 'DHCP'] },
  { name: 'umlaut handling', text: 'Prüfung für Übertragung', knownTerms: ['Übertragung'], expected: ['Übertragung'] },
  { name: 'numbers included', text: 'IPv6 ersetzt IPv4', knownTerms: ['IPv6', 'IPv4'], expected: ['IPv6', 'IPv4'] },
];

let passed = 0;
for (const testCase of cases) {
  const actual = selectHighlightRanges(testCase.text, testCase.knownTerms).map((range) => range.text);
  assert.deepEqual(actual, testCase.expected, testCase.name);
  passed += 1;
}

console.log(`Passed ${passed}/${cases.length} highlight logic tests.`);
