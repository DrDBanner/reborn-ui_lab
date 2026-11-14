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
3. A bounded list shows independent playing and paused sessions in both variants. Selecting a Playing entry chooses that player session and opens its target’s device/group/pair details, marking only the corresponding Outputs item current. It does not start, stop or regroup outputs. The bottom session selector changes only player context. All sessions are available through the active projection in the shared Outputs & playbacks workspace.
4. Stereo pairs and groups are shown as **one output item**, not repeated speaker rows.
5. An optional limit keeps the sidebar short. Full search, filters and group creation operate in the content workspace.
6. Speaker settings, firmware, network and diagnostics belong in the main workspace.
7. System contains only Updates & maintenance and Set up speaker. App-wide controls and Design Lab are reached through the logo menu. Item types use Material icons with screen-reader names, without redundant visible type labels.
8. Primary key functions appear above device detail tabs, according to reported capabilities, and also project into group/pair details. Radio contains sources and app-wide favorites.
9. A contextual player presents playback controls and **multiple sessions** while any playback is running or paused.

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

Playbacks and Outputs open the same **Outputs & playbacks** workspace. Playbacks applies the Active only projection; Playback targets shows each standalone speaker or composite once; All devices provides the complete physical device inventory for configuration. Each card projects its current source and playback state; inherited playback in All devices names its parent. Direct play/pause addresses that exact session, preserving independent streams. Button-capability projections link to the physical member's primary function panel.

Sidebar selection represents the current content route, not the chosen bottom-player session. Exactly one navigation context is marked current, even if stale device/group IDs remain in state or the section is collapsed. Stream status uses the accent music-cast indicator without a selected card background. A selected device hidden within a composite or in the player-panel variant marks the Outputs section instead.

## Direct source playback

The station artwork is an immediate Play action on the output currently named in the bottom player. Hover or keyboard focus reveals play_circle; touch shows it without requiring hover. Accessible label and tooltip name source and output. An unavailable target disables this shortcut. A stale action cannot redirect playback to a changed player context. Source assignment affects only overlapping physical outputs.

The separate music-cast action opens output selection and waits for an explicit choice. This lets users start independent streams without silently replacing the current one. Device configuration selection never redirects the station shortcut when another playback session is active.

Primary button functions stay visible above the device tabs. Groups and pairs reuse that surface with an explicit physical member selector; editing is bound to the chosen member while playback addresses its logical output. Less frequent functions can remain in configuration tabs.


## Playback targets and all devices

An output is an addressable playback target, not a separate hardware type. A standalone speaker is both a device and a target; a group/pair is one logical target whose members remain physical devices. The overview names these task views Playback targets and All devices. Availability and current playback are separate properties. Group members do not disappear from inventory or become another device type.

The shared workspace uses one page heading, a compact view/count switch, search/type/playback filters and equal card structure. Playback targets lists top-level logical outputs once, with expandable members. All devices lists physical endpoints and their parent relationship. Details is the only configuration navigation in each card; the redundant Use output action and large statistic cards are removed. Direct pause/play remains attached to the exact source/session.

## Overall and individual volume

The bottom slider controls the current playback output as a whole. The adjacent volume icon opens a session-bound lightbox with an overall control and individual device levels grouped by stereo pair. Values are percentages; a single speaker has one control. Overall adjustment preserves relative member differences until a value reaches 0 or 100; offline devices remain unchanged. Individual trims do not rewrite a composite master value. A single-device session reflects that device's volume directly. Unrelated sessions and configuration selection do not redirect the lightbox. Real hardware integration still requires adapter acknowledgement and actual volume semantics.

## Notifications

Top-right notifications form a stack. Ordinary notes expire after 8 seconds, with a short exit animation; errors remain until dismissed. IDs keep dismissals independent. Countdown and entry/exit animations respect elapsed time across rerenders and reduced-motion preferences. Notifications are transient and never saved with scenarios.


## Idle and paused states

Playing is the sidebar label for playback sessions; Media contains source browsing. The entire Playing section is hidden when no running or paused session exists. The bottom player follows the same rule and gives its height back to the workspace when hidden. A stopped session is not selected as a fallback while another active session exists. A paused session remains resumable and is explicitly labeled Paused. Without an active player context, station artwork does not silently target a remembered device; the music-cast picker provides explicit output selection.

The player shows its source once and its playback target once. Its music-cast action uses the actual player source, even if an unrelated source picker was cancelled earlier. Percent volume and the individual-level lightbox apply to that session's output.

## Visual restraint

Light appearance uses neutral whites and greys. Source placeholders use a shared neutral treatment; selection/action states retain the accent and status colors retain semantic meaning. Surfaces do not use drop shadows. The radio toolbar and station rows share the same responsive horizontal inset, with no nested filter card. Volume uses ordinary rows, percentage values and separators; no decorative hero tile, duplicate single-device slider or oversized count badges.

## One grouping workflow

Create group opens one form for selecting speakers/pairs, a name and persistence. Stereo is an optional mode with exactly two physical speakers and explicit Left/Right selectors. Only free online devices reporting the same non-empty `capabilities.grouping.stereoFamily` can form a stereo pair. Missing capability data does not imply stereo support. Assignment order is persisted as `leftDeviceId`, `rightDeviceId` and ordered `memberIds`; legacy pairs use their existing member order for display. Grouping and stereo remain different model/adapter operations under this shared entry.

Device details expose Members directly below the presets and above the configuration tabs on every tab. Add members opens this form with the device selected. Existing members link to their pair/group instead of silently detaching. Group details use the same Add members wording. Drafts persist across mode changes and Cancel makes no model change. No live hardware pairing or cross-brand synchronization is claimed.

## Consistent item detail and progressive preset controls

Devices, stereo pairs and groups use one item detail renderer: title → presets → Members → configuration tabs → content. Members uses the same surface, spacing and actions. Group/pair configuration now uses Overview, Sound and Advanced tabs; hardware-only tabs remain device capabilities. Group master and member levels are under Sound; dissolve is under Advanced. A pair remains a logical member with an explicit physical speaker count, so two group members can correctly represent three speakers.

Presets initially show compact keys with at most three columns, reducing to two/one as the available width shrinks. Once/Twice stays available immediately. In a group/pair, Buttons on always exposes which physical device owns the shown bank; this context selector is never hidden behind management. The settings gear immediately after Buttons on reveals editing, transfer and detailed source metadata; there is no separate Manage presets dropdown. Collapsing preserves the chosen bank/device without changing playback. No common group-owned preset bank or implicit synchronization is invented.

Member rows and their names have no navigation action. Open details is a separate local Material `open_in_new` icon, revealed on hover/keyboard focus and always visible on touch. Removal has its own independent control.

## Add a playback member from the player

The player’s output picker binds the source, session and original output when opened. As member defaults off. Without it, choosing a destination starts a separate playback of the bound source. With it, a free speaker or stereo pair joins that exact playback: an existing group is extended, or a temporary group is created from a standalone speaker/pair and the destination. Stereo pairs remain intact; other groups cannot be nested and existing memberships are never silently taken over.

Joining retains the origin session ID and master volume. With the same source it retains the playing/paused state; an explicitly chosen different source starts playing on the whole joined output. Only sessions overlapping the explicitly chosen destination are replaced; other streams continue. The destination row names any playback that will be replaced. Origin/session/source are revalidated at confirmation, so changing the selected player or stale asynchronous data cannot redirect the operation. The checkbox is local to each dialog and also appears when Choose output is opened from Radio or Recently Played. Those pickers bind the current player output as the origin. If the chosen source differs, the checked state explicitly explains that it replaces the source for the whole joined output. Without an active player context, membership is visible but disabled; independent playback remains available.

Source-switch notifications from Radio, Recently Played and explicit output assignment name both source and destination: Playing FluxFM on Downstairs. Actual grouping, synchronization compatibility and acknowledgement still belong to a hardware adapter.
