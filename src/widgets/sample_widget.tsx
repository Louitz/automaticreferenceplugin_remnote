import { usePlugin, renderWidget, useTracker } from '@remnote/plugin-sdk';

export const SampleWidget = () => {
  const plugin = usePlugin();
  const autoLinkEnabled = useTracker(() => plugin.settings.getSetting<boolean>('auto-link-enabled'));

  return (
    <div className="p-3 m-2 rounded-lg rn-clr-background-light-positive rn-clr-content-positive">
      <h1 className="text-lg font-semibold">Definition Links</h1>
      <div className="mt-2 text-sm">
        Status: {autoLinkEnabled ? 'aktiv' : 'deaktiviert'}
      </div>
      <div className="mt-2 text-sm">
        Exakt passende Begriffe wie "Test" oder mehrwortige Begriffe werden beim Schreiben
        automatisch in klickbare Rem-Links umgewandelt.
      </div>
      <div className="mt-2 text-xs opacity-80">
        Falls etwas nicht automatisch erkannt wird, nutze den Command "createRef".
      </div>
    </div>
  );
};

renderWidget(SampleWidget);
