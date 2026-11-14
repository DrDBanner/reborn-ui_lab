# Backend integration plan

The UI Lab runs through a JSON-backed model. A Wails adapter connects its actions and state to the ST Reborn backend.

```text
Views and UI variants
        |
Shared state and actions
        |
Wails adapter
        |
Generated Go bindings and device events
        |
ST Reborn backend
```

`src/app/controller.js` handles UI actions. `src/app/model.js` provides selectors and local state transforms. The adapter owns backend calls, device events and acknowledgement handling.

## Adapter responsibilities

- Map action payloads to verified Go method signatures and event shapes.
- Supply discovery, identity, capabilities, availability, membership and playback state.
- Apply confirmed values after acknowledgement and surface failures per target.
- Identify desktop updates, speaker agent software and device firmware separately.
- Validate membership, pairing compatibility and physical session overlap.
- Expand logical groups into the backend's physical membership contract.
- Preserve typed preset payloads, source metadata, accounts and transfer results. Explicit overwrite requires a reviewed relocation plan, refreshed destination state and acknowledged moves/replacements per device.
- Reconcile saved group templates, live membership and recovery events.
- Provide network, remote, provisioning, scheduling and maintenance operations.
- Integrate translations, RTL layouts, keyboard focus and native window conventions.

Manufacturer protocols belong to backend adapters. Views consume the shared model and reported capabilities. Design Lab provides scenario-driven review of the same UI actions.

STR payload mappings and pinned source references are documented in [Device capabilities](DEVICE_CAPABILITIES.md).
