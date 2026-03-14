import { AppEvents, declareIndexPlugin, type ReactRNPlugin, WidgetLocation } from '@remnote/plugin-sdk';
import '../style.css';
import '../index.css';
import {
  autoLinkFocusedRem,
  clearAutoLinkCaches,
  forceMarkFocusedRemGreen,
  getAutoLinkDebugInfo,
  type AutoLinkResult,
  scheduleAutoLinkForFocusedRem,
} from '../auto_link_terms';

const REM_CHANGED_LISTENER_KEY = 'definition-links.rem-changed';

function formatAutoLinkResult(result: AutoLinkResult) {
  switch (result.status) {
    case 'linked':
      return `Definition Links: Verlinkt -> ${result.text}`;
    case 'forced':
      return `Definition Links: Testfarbe gesetzt -> "${result.text}"`;
    case 'no-match':
      return `Definition Links: Keine neuen Links im Dokument gefunden.`;
    case 'unchanged':
      return `Definition Links: Bereits verlinkt oder unveraendert -> "${result.text}"`;
    case 'no-focused-rem':
      return 'Definition Links: Kein fokussierter Rem gefunden.';
    case 'busy':
      return 'Definition Links: Verarbeitung laeuft bereits.';
    case 'empty-text':
      return 'Definition Links: Leerer Text.';
  }
}

async function onActivate(plugin: ReactRNPlugin) {
  await plugin.settings.registerBooleanSetting({
    id: 'auto-link-enabled',
    title: 'Automatische Begriffslinks',
    description:
      'Erstellt fuer exakt passende Woerter und Wortgruppen automatisch klickbare Rem-Links, wenn bereits ein Rem mit diesem Namen existiert.',
    defaultValue: true,
  });

  await plugin.app.registerCommand({
    id: 'link-known-terms',
    name: 'createRef',
    description:
      'Ersetzt exakt passende Woerter und Wortgruppen im Ziel-Rem durch klickbare Rem-Links.',
    action: async () => {
      const result = await autoLinkFocusedRem(plugin);
      await plugin.app.toast(formatAutoLinkResult(result));
    },
  });

  await plugin.app.registerCommand({
    id: 'force-mark-current-rem',
    name: 'Rem gruen machen',
    description: 'Technischer Test: Faerbt den kompletten fokussierten Rem gruen ein.',
    action: async () => {
      const result = await forceMarkFocusedRemGreen(plugin);
      await plugin.app.toast(formatAutoLinkResult(result));
    },
  });

  await plugin.app.registerCommand({
    id: 'show-highlight-debug',
    name: 'Debug zeigen',
    description: 'Zeigt den aktuellen fokussierten Rem und die erkannten Treffer als Toast an.',
    action: async () => {
      const debug = await getAutoLinkDebugInfo(plugin);
      const matched = debug.matchedRanges.map((range) => range.text).join(', ') || 'keine';
      await plugin.app.toast(
        `Debug: text="${debug.currentText}" | supported=${debug.supportedText} | matches=${matched}`
      );
    },
  });

  plugin.event.addListener(AppEvents.RemChanged, REM_CHANGED_LISTENER_KEY, async () => {
    const isEnabled = await plugin.settings.getSetting<boolean>('auto-link-enabled');
    if (!isEnabled) {
      return;
    }

    clearAutoLinkCaches();
    scheduleAutoLinkForFocusedRem(plugin);
  });

  await plugin.app.registerWidget('sample_widget', WidgetLocation.RightSidebar, {
    dimensions: { height: 'auto', width: '100%' },
    dontOpenByDefaultInTabLocation: true,
  });
}

async function onDeactivate(plugin: ReactRNPlugin) {
  plugin.event.removeListener(AppEvents.RemChanged, REM_CHANGED_LISTENER_KEY);
}

declareIndexPlugin(onActivate, onDeactivate);
