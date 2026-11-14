# Integration sketch — existing ST Reborn Go / Wails backend

This is a proposed boundary, not a claim about existing Go method names or payloads.

```
Views / UI variants
        |
  Shared state + actions
        |
  Wails adapter (to be implemented)
        |
  Existing Wails generated Go bindings + device events
        |
  Existing Go backend
```

`src/app/controller.js` currently updates JSON-backed model data. In production, a small backend adapter would own discovery, status updates, firmware operations, actual pairing/grouping and source assignment. Views should not import Wails bindings directly.

Important conditions before live use:

- Map the **actual** Go method signatures and asynchronous event payloads; don't invent APIs.
- Subscribe to external changes to online/offline states, groups, updates, streams and playback.
- Render confirmed values only after backend acknowledgement; recover gracefully from failures.
- Distinguish application updates, STR software on a speaker, and Bose firmware where applicable.
- Validate membership and stream overlap at backend level, not only in mock selectors.
- Preserve 13-language translations, RTL behavior, keyboard focus, accessibility and native window conventions.
- Keep scenario editing, artificial devices and UI variants behind developer/preview controls.
- No Bose communication or other manufacturer's protocol should be reproduced in the frontend.

The repository strategy is intentionally open: the maintainer can integrate the concept as another directory or as the preview shell in the current frontend, without maintaining a second permanent stack.
