# Information architecture and interaction rules

## Core distinction

- **Source:** what the user wants to hear (radio, library track, streaming service).
- **Output:** where the source should play; a physical speaker, a stereo pair or a group.
- **Playback session:** a source assigned to an output, with a playing/paused/stopped state and a volume value.

The model permits **multiple independent playback sessions**. Grouping is separate from source selection: assigning a source to an output does not change other non-overlapping outputs.

## Sidebar versus workspace

The sidebar provides **fast access**, not an exhaustive N-device management interface:

1. Category titles open a corresponding full workspace (e.g. OUTPUTS → Outputs & groups).
2. Chevrons on the right independently collapse the contents of a category.
3. A playing group is pinned only in the Sidebar variant.
4. Stereo pairs and groups are shown as **one output item**, not repeated speaker rows.
5. An optional limit keeps the sidebar short. Full search, filters and group creation operate in the content workspace.
6. Speaker settings, firmware, network and diagnostics belong in the main workspace.
7. A persistent player presents playback controls, output selection and **multiple sessions**.

**Variant A:** outputs are accessed from the player panel; navigation-only sidebar. **Variant B:** output shortcuts appear in a collapsible sidebar section. Both variants share the same model, playback sessions and domain actions.

## Speaker, pair and group

`device` is a physical endpoint; `pair` contains two speakers; `group` contains outputs, including pairs. All can be addressed as logical **playback targets**, without losing their type-specific maintenance and setup features.

The mock forbids an item from being a direct member of multiple composites. Exact SoundTouch pairing/grouping constraints and persistence semantics must be mapped from the existing Go backend before production integration.

## Concurrent playback and overlap

Composite outputs expand to physical device IDs. Assigning a source to output X removes other *simulated* playback sessions that overlap physically with X; independent sessions remain unchanged. The real backend must ultimately enforce and acknowledge these operations, especially synchronized playback and recovery.

## Preserve the original concept

The original 34-page SVG concept remains available under `reference/original/`: radio, six hardware keys, library, Spotify, history, player, output details, application and per-device settings, sound/network/advanced, firmware, backup, setup, help and errors. This project changes **how outputs are selected, grouped and scaled**, not the scope of the application.

## Separate future projects

Manufacturer-neutral device abstraction, Topology and optional Zones are **not prerequisites** or part of UI 2.0. This UI Lab makes no claim to support cross-manufacturer audio synchronization.
