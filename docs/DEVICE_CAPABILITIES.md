# Device identity and item-specific functions

Every physical device carries `brand`, `model`, `hardwareRevision` and `firmware`. Missing values are `null` and display **Not reported**. `agentName` / `agentVersion` describe optional control software separately from device firmware. Composite outputs keep their own identity and refer to their physical members; they do not inherit one member's manufacturer or key assignments.

`capabilities` explicitly reports available UI functions: `sound`, `network`, `remote`, `alarms` and optional `buttonPresets: {keyCount, gestures: ['single', 'double']}`. UI gates use these fields, never brand-name checks. This is a UI/mock contract, not an implemented manufacturer adapter. The eventual backend owns capability detection and hardware operations.

Button presets live under **Device details → Functions**. The current layer is selected with **Once / Twice**; each layer numbers the same physical keys from 1 to `keyCount`. A device without buttons has no preset editor. Single-only devices have no Twice control. The capabilities scenario includes fictional Example Audio devices to exercise missing keys and two-key hardware without claiming support for an actual other vendor.

`presets` holds the existing single-press source IDs; `doublePresets` independently holds double-press source IDs. The editor binds its device ID and gesture when opened, so browsing another output or controlling another playback cannot redirect a save. Saving a layer preserves the other layer. Existing local scenarios migrate identity/capabilities only from matching known fixture devices; their existing assignments remain intact. Unknown devices do not acquire guessed capabilities. Missing legacy double assignments stay empty.

Recalling a key uses that device's top-level logical output (its group/pair when applicable). Independent sessions remain unchanged. This is explicitly named next to the editor. Offline/updating targets cannot be recalled. The browser offers an ordinary accessible Play action for the selected layer; it does not try to recognize physical double presses.

## Existing ST Reborn mapping

Verified against [JRpersonal/streborn](https://github.com/JRpersonal/streborn/tree/6c874ee11bd89175427ef65be56eeeeb33317cd9), revision `6c874ee11bd89175427ef65be56eeeeb33317cd9`:

- [`presetrows.js`](https://github.com/JRpersonal/streborn/blob/6c874ee11bd89175427ef65be56eeeeb33317cd9/desktop-app/frontend/src/presetrows.js): agent `presetRows=2` enables the second layer; legacy agents expose one. Keys 1–6 once map to slots 1–6; keys 1–6 twice map to slots 7–12.
- [`slots.go`](https://github.com/JRpersonal/streborn/blob/6c874ee11bd89175427ef65be56eeeeb33317cd9/internal/presets/slots.go): second-layer assignments stay in STR's own store and must never be written to the six firmware preset slots.
- [`doublepress.go`](https://github.com/JRpersonal/streborn/blob/6c874ee11bd89175427ef65be56eeeeb33317cd9/cmd/agent/doublepress.go): the existing agent handles gesture detection and group echo checks. This logic belongs to that adapter, not the UI.

A future STR adapter translates the two UI banks to those verified slots and reports capabilities from the agent. No live Go/Wails calls are made by this prototype.
