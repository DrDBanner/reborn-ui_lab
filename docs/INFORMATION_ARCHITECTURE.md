# Information architecture and interaction rules

## Core distinction

- **Source:** what the user wants to hear (radio, library track, streaming service).
- **Output:** where the source should play; a physical speaker, a stereo pair or a group.
- **Playback session:** a source assigned to an output, with a playing/paused/stopped state and a volume value.

The model permits **multiple independent playback sessions**. Grouping is separate from source selection: assigning a source to an output does not change other non-overlapping outputs.

## Sidebar versus workspace

The sidebar provides **fast access**, not an exhaustive N-device management interface:

1. Category titles open a corresponding full workspace (e.g. OUTPUTS → Outputs & playbacks).
2. Chevrons on the right independently collapse the contents of a category. Outputs and Playbacks have an always-visible overview icon immediately before the chevron; the separate overview text rows and duplicate Connections & devices menu entry are removed.
3. A bounded list shows independent playing and paused sessions in both variants. Selecting a session changes the player context; it does not start, stop or regroup outputs. All sessions are available through the active projection in the shared Outputs & playbacks workspace.
4. Stereo pairs and groups are shown as **one output item**, not repeated speaker rows.
5. An optional limit keeps the sidebar short. Full search, filters and group creation operate in the content workspace.
6. Speaker settings, firmware, network and diagnostics belong in the main workspace.
7. System contains only Updates & maintenance and Set up speaker. App-wide controls and Design Lab are reached through the logo menu. Item types use Material icons with screen-reader names, without redundant visible type labels.
8. Primary key functions appear above device detail tabs, according to reported capabilities, and also project into group/pair details. Radio contains sources and app-wide favorites.
9. A persistent player presents playback controls, output selection and **multiple sessions**.

**Variant A:** outputs are accessed from the player panel; navigation-only sidebar. **Variant B:** output shortcuts appear in a collapsible sidebar section. Both variants share the same model, playback sessions and domain actions.

## Speaker, pair and group

`device` is a physical endpoint; `pair` contains two speakers; `group` contains outputs, including pairs. All can be addressed as logical **playback targets**, without losing their type-specific maintenance and setup features.

The mock forbids an item from being a direct member of multiple composites. Exact SoundTouch pairing/grouping constraints and persistence semantics must be mapped from the existing Go backend before production integration.

## Concurrent playback and overlap

Composite outputs expand to physical device IDs. Assigning a source to output X removes other *simulated* playback sessions that overlap physically with X; independent sessions remain unchanged. The real backend must ultimately enforce and acknowledge these operations, especially synchronized playback and recovery.

## Preserve the original concept

The original 34-page SVG concept remains available under `reference/original/`: radio, six hardware keys, library, Spotify, history, player, output details, application and per-device settings, sound/network/advanced, firmware, backup, setup, help and errors. This project changes **how outputs are selected, grouped and scaled**, not the scope of the application.

## Separate future projects

The UI models brand-neutral identity and device capabilities (see DEVICE_CAPABILITIES.md). Actual manufacturer adapters, Topology and optional Zones remain separate. This UI Lab makes no claim to support cross-manufacturer audio synchronization.

## Unified outputs and playbacks

Playbacks and Outputs open the same **Outputs & playbacks** workspace. Playbacks applies the Active only projection; Outputs shows all physical devices, pairs and groups for configuration. Each card projects its current source and playback state; inherited playback names its parent. Direct play/pause addresses that exact session, preserving independent streams. Button-capability projections link to the physical member's primary function panel.

Sidebar selection represents the current content route, not the chosen bottom-player session. Exactly one navigation context is marked current, even if stale device/group IDs remain in state or the section is collapsed. Stream status uses the accent music-cast indicator without a selected card background. A selected device hidden within a composite or in the player-panel variant marks the Outputs section instead.

## Direct source playback

The station artwork is an immediate Play action on the output currently named in the bottom player. Hover or keyboard focus reveals play_circle; touch shows it without requiring hover. Accessible label and tooltip name source and output. An unavailable target disables this shortcut. A stale action cannot redirect playback to a changed player context. Source assignment affects only overlapping physical outputs.

The separate music-cast action opens output selection and waits for an explicit choice. This lets users start independent streams without silently replacing the current one. Device configuration selection never redirects the station shortcut when another playback session is active.

Primary button functions stay visible above the device tabs. Groups and pairs reuse that surface with an explicit physical member selector; editing is bound to the chosen member while playback addresses its logical output. Less frequent functions can remain in configuration tabs.
