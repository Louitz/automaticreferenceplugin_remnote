import type { ReactRNPlugin, Rem, RichTextInterface } from '@remnote/plugin-sdk';
import { normalizeTerm, selectHighlightRanges } from './highlight_logic';

const TEXT_ELEMENT_KEYS = new Set(['i', 'text']);
const DEBOUNCE_MS = 250;

const remDebounces = new Map<string, ReturnType<typeof setTimeout>>();
const activeRemIds = new Set<string>();
const termMatchCache = new Map<string, string | null>();
let remNameIndexCache: Map<string, Rem[]> | null = null;

export type AutoLinkResult =
  | { status: 'no-focused-rem' }
  | { status: 'busy' }
  | { status: 'empty-text' }
  | { status: 'no-match'; text: string }
  | { status: 'unchanged'; text: string }
  | { status: 'linked'; text: string }
  | { status: 'forced'; text: string };

export type AutoLinkDebugInfo = {
  focusedRemId?: string;
  targetRemId?: string;
  documentRemId?: string;
  currentText: string;
  supportedText: boolean;
  knownTermsSample: string[];
  matchedRanges: Array<{ start: number; end: number; text: string }>;
};

function isSupportedText(richText: RichTextInterface) {
  return richText.every((element) => {
    if (typeof element === 'string') {
      return true;
    }

    if (element.i !== 'm') {
      return false;
    }

    return Object.keys(element).every((key) => TEXT_ELEMENT_KEYS.has(key));
  });
}

function getPlainText(richText: RichTextInterface) {
  return richText
    .map((element) => {
      if (typeof element === 'string') {
        return element;
      }

      return element.i === 'm' ? element.text : '';
    })
    .join('');
}

function isLeafRem(rem: Rem) {
  return rem.children.length === 0;
}

export function clearAutoLinkCaches() {
  remNameIndexCache = null;
  termMatchCache.clear();
}

async function resolveTargetRem(plugin: ReactRNPlugin) {
  const focusedRem = await plugin.focus.getFocusedRem();
  if (!focusedRem) {
    return {};
  }

  const freshRem = await plugin.rem.findOne(focusedRem._id);
  if (!freshRem) {
    return { focusedRem };
  }

  const focusedText = getPlainText(freshRem.text).trim();
  if (focusedText) {
    return { focusedRem, targetRem: freshRem };
  }

  const siblings = await freshRem.visibleSiblingRem();
  const position = await freshRem.positionAmongstVisibleSiblings();
  if (position === undefined || position <= 0) {
    return { focusedRem, targetRem: freshRem };
  }

  const previousSibling = siblings[position - 1];
  if (!previousSibling) {
    return { focusedRem, targetRem: freshRem };
  }

  const previousSiblingText = getPlainText(previousSibling.text).trim();
  if (!previousSiblingText) {
    return { focusedRem, targetRem: freshRem };
  }

  return { focusedRem, targetRem: previousSibling };
}

async function resolveDocumentRem(targetRem: Rem) {
  let current: Rem | undefined = targetRem;

  while (current) {
    if (await current.isDocument()) {
      return current;
    }

    current = await current.getParentRem();
  }

  const containers = await targetRem.portalsAndDocumentsIn();
  for (const container of containers) {
    if (await container.isDocument()) {
      return container;
    }
  }

  return undefined;
}

async function getKnownRemMap(remsInDocument: Rem[], currentRemId: string) {
  const remNameIndexCache = new Map<string, Rem[]>();

  for (const rem of remsInDocument) {
    const remName = normalizeTerm(getPlainText(rem.text));
    if (!remName) {
      continue;
    }

    const existing = remNameIndexCache.get(remName) ?? [];
    existing.push(rem);
    remNameIndexCache.set(remName, existing);
  }

  const remMap = new Map<string, Rem>();
  for (const [term, rems] of remNameIndexCache.entries()) {
    const targetRem = rems.find((rem) => rem._id !== currentRemId);
    if (targetRem) {
      remMap.set(term, targetRem);
    }
  }

  return remMap;
}

async function buildLinkedRichText(
  plugin: ReactRNPlugin,
  sourceText: string,
  currentRemId: string,
  remsInDocument: Rem[]
): Promise<RichTextInterface | undefined> {
  const knownRemMap = await getKnownRemMap(remsInDocument, currentRemId);
  const ranges = selectHighlightRanges(sourceText, knownRemMap.keys());
  if (!ranges.length) {
    return undefined;
  }

  const nextRichText: RichTextInterface = [];
  let cursor = 0;

  for (const range of ranges) {
    if (range.start > cursor) {
      nextRichText.push(...(await plugin.richText.text(sourceText.slice(cursor, range.start)).value()));
    }

    const targetRem = knownRemMap.get(normalizeTerm(range.text));
    if (targetRem) {
      nextRichText.push(...(await plugin.richText.rem(targetRem).value()));
    } else {
      nextRichText.push(...(await plugin.richText.text(sourceText.slice(range.start, range.end)).value()));
    }

    cursor = range.end;
  }

  if (cursor < sourceText.length) {
    nextRichText.push(...(await plugin.richText.text(sourceText.slice(cursor)).value()));
  }

  return plugin.richText.normalize(nextRichText);
}

export async function getAutoLinkDebugInfo(plugin: ReactRNPlugin): Promise<AutoLinkDebugInfo> {
  const { focusedRem, targetRem } = await resolveTargetRem(plugin);
  if (!focusedRem) {
    return {
      currentText: '',
      supportedText: false,
      knownTermsSample: [],
      matchedRanges: [],
    };
  }

  if (!targetRem) {
    return {
      focusedRemId: focusedRem._id,
      currentText: '',
      supportedText: false,
      knownTermsSample: [],
      matchedRanges: [],
    };
  }

  const currentText = getPlainText(targetRem.text);
  const documentRem = await resolveDocumentRem(targetRem);
  const remsInDocument = documentRem ? await documentRem.allRemInDocumentOrPortal() : [targetRem];
  const knownRemMap = await getKnownRemMap(remsInDocument, targetRem._id);
  const matchedRanges = selectHighlightRanges(currentText, knownRemMap.keys());

  return {
    focusedRemId: focusedRem._id,
    targetRemId: targetRem._id,
    documentRemId: documentRem?._id,
    currentText,
    supportedText: isSupportedText(targetRem.text),
    knownTermsSample: Array.from(knownRemMap.keys()).slice(0, 10),
    matchedRanges,
  };
}

export async function forceMarkFocusedRemGreen(plugin: ReactRNPlugin) {
  const { targetRem } = await resolveTargetRem(plugin);
  if (!targetRem) {
    return { status: 'no-focused-rem' as const };
  }

  const currentText = getPlainText(targetRem.text);
  if (!currentText.trim()) {
    return { status: 'empty-text' as const };
  }

  const nextRichText = await plugin.richText.text(currentText, ['Green']).value();
  const normalized = await plugin.richText.normalize(nextRichText);
  await targetRem.setText(normalized);
  return { status: 'forced' as const, text: currentText };
}

export async function autoLinkFocusedRem(plugin: ReactRNPlugin): Promise<AutoLinkResult> {
  const { targetRem } = await resolveTargetRem(plugin);
  if (!targetRem) {
    return { status: 'no-focused-rem' };
  }

  const documentRem = await resolveDocumentRem(targetRem);
  if (!documentRem) {
    return { status: 'no-match', text: getPlainText(targetRem.text) };
  }

  if (activeRemIds.has(documentRem._id)) {
    return { status: 'busy' };
  }

  activeRemIds.add(documentRem._id);
  try {
    const remsInDocument = await documentRem.allRemInDocumentOrPortal();
    let changedCount = 0;

    for (const rem of remsInDocument) {
      if (!isLeafRem(rem)) {
        continue;
      }

      if (!isSupportedText(rem.text)) {
        continue;
      }

      const currentText = getPlainText(rem.text);
      if (!currentText.trim()) {
        continue;
      }

      const nextRichText = await buildLinkedRichText(plugin, currentText, rem._id, remsInDocument);
      if (!nextRichText) {
        continue;
      }

      const sameText = await plugin.richText.equals(rem.text, nextRichText);
      if (sameText) {
        continue;
      }

      await rem.setText(nextRichText);
      changedCount += 1;
    }

    if (!changedCount) {
      return { status: 'no-match', text: documentRem._id };
    }

    return { status: 'linked', text: `${changedCount} Rem(s) im Dokument` };
  } finally {
    activeRemIds.delete(documentRem._id);
  }
}

export function scheduleAutoLinkForFocusedRem(plugin: ReactRNPlugin) {
  const key = 'focused-rem';
  const existingTimeout = remDebounces.get(key);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  const timeoutId = setTimeout(() => {
    remDebounces.delete(key);
    void autoLinkFocusedRem(plugin);
  }, DEBOUNCE_MS);

  remDebounces.set(key, timeoutId);
}
