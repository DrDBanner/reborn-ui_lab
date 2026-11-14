# Interaction model

## Entities

| Entity | Meaning |
|---|---|
| Source | Radio station, library item or streaming-service item |
| Device | Physical audio endpoint with identity and capabilities |
| Stereo pair | Two devices assigned left and right channels |
| Group | Named collection of devices, pairs or logical subgroups |
| Playback target | Addressable device, pair or top-level group |
| Playback session | Source, target, playing/paused/stopped state and volume |

The UI operates on JSON-backed simulation state. Physical device IDs determine session overlap. Assigning a source replaces overlapping sessions; independent sessions retain their source and state.

## Navigation and player

The sidebar contains Playing, Media, Outputs and System. Category titles and overview icons open the corresponding workspace; chevrons collapse shortcut lists. The logo menu contains connection status, app preferences, scenarios and Design Lab. System contains Updates & maintenance and Set up speaker.

The header toggle collapses the desktop sidebar and restores it. This appearance preference persists across reloads and scenarios. The logo menu remains accessible in the header while collapsed. Mobile navigation uses its independent drawer.

Playing lists running and paused sessions. Selecting one chooses its player context and opens its target details. The current content route determines the selected sidebar item. The bottom session selector changes player context. A device inside a composite is represented by its parent playback target in the sidebar.

Playing and the bottom bar render while a running or paused session exists. The player shows the source, target, transport and overall volume. Play/Pause titles follow session state; Stop has an explicit hover title. Paused sessions are labeled Paused.

Variant A accesses outputs through the player panel. Variant B adds sidebar output shortcuts. Both variants share model and playback state.

The app header names each route once. Workspace headings identify concrete items and separate content sections. Page actions use a toolbar without repeating the route title.

## Media

Station artwork starts the source on the target named in the bottom player. Hover/focus reveals `play_circle`; touch exposes the action directly. The accessible label and tooltip identify source and target. Availability and the bound player context are checked at activation.

The `music_cast` action opens output selection. Independent playback is the default. As member joins a free device or pair to the bound session, extending its group or creating a temporary group. The review identifies any replaced source. Selecting a different source applies it to the whole joined target. Confirmation revalidates session, source and destination.

Radio and Recently Played share this picker. Source-change notifications name both values, for example: Playing FluxFM on Downstairs.

Music servers → gear manages manual server addresses and the visibility of discovered servers. Draft changes apply on Save; Cancel discards them. Manual sources persist with the scenario. Discovered entries come from the sample catalog; manually added sources have no fetched contents until an adapter supplies them.

## Output workspace

Playback targets lists each top-level device, pair or group once. All devices lists every physical endpoint with its parent relationship. Cards share identity, availability, source/state and a Details action. Member lists expand within the card; `open_in_new` opens a member's details.

Search, type and Active only filters apply to the workspace. The N scenario contains 50 physical devices and 38 playback targets.

## Item details

Devices, pairs and groups share this order:

1. Title, type icon and rename action.
2. Compact button presets for supported devices.
3. Group Members.
4. Capability-specific tabs and their content.

Presets use at most three columns, adapting to two or one at narrower widths. Buttons on selects the physical owner of the bank; Once/Twice selects its gesture layer. The adjacent gear reveals assignment editing, transfer and source metadata.

Tabs preserve workspace scroll position within the same item. Changing item or route starts the workspace at the top. Visited tabs reserve their content height for the current item and layout, so shorter tabs preserve the scroll range. Changing item, width or display density recalculates that height.

## Group membership

Group membership is the common interaction model for deciding which devices play together. Multiroom, stereo channels, temporary or persistent groups and nested rooms are managed through shared item details. [Group membership](GROUP_MEMBERSHIP.md) explains how these concepts fit together; [Group nesting](GROUP_NESTING.md) walks through the Nested groups scenario.

Add members selects an ungrouped device, pair or group to bring into the current group. Add to existing group selects a destination for the current ungrouped item. The shared review shows the resulting playback and every active source being replaced. Cancel discards the draft. Save binds the reviewed item IDs, session state and physical member lists; changed state requires another review.

Destination playback takes precedence. A silent destination adopts an incoming running or paused session with its status preserved. Silent inputs stay silent. Other streams and per-device preset banks retain their state.

Each item has at most one parent. Membership forms a tree with unique physical devices. Logical subgroups retain their names and structure while sharing the root playback. Source assignment to a child resolves to that root. Child details expose a parent link and separate Open action.

Create group selects free devices/pairs, a name and persistence. Stereo mode requires exactly two online physical devices with matching reported `stereoFamily` values. Left/right assignment is stored in `leftDeviceId`, `rightDeviceId` and ordered `memberIds`.

The gear beside Add members contains Main speaker, Keep group together and Remote group buttons. The main speaker is identified in the member list. Remote assignments store templates on the selected receiving device.

For STR integration, the adapter expands the logical hierarchy into unique physical devices and sends one master plus followers. It owns compatibility checks, saved/live state reconciliation and execution acknowledgement. Child-group settings describe that group's standalone configuration; joined playback uses the root configuration.

## Volume

The player slider controls its complete target. The volume icon opens a session-bound lightbox containing overall and individual device controls, organized by pair. A single device uses one slider.

Overall adjustment moves online device levels by a shared offset, clamped to 0–100. Individual controls trim their device; composite master values retain their setting. A single-device session reflects that device's level directly.

Sound-tab and lightbox controls use filled slider tracks and percentage values. Sound-tab rows share label, slider and value columns.

## Notifications

Notifications stack at the top right. Ordinary notes expire after eight seconds; errors use explicit dismissal. Entry, exit and countdown animations respect elapsed time and reduced-motion preferences. Notification state lasts for the app session.

Reported app/device update availability produces one toast for newly reported targets, naming devices and versions. Its Updates & maintenance link opens that workspace. Installation has its own action there. Runtime fingerprints deduplicate repeated reports per scenario. New versions, returning availability, scenario reset or app restart can produce a fresh notice. Maintenance retains the reported availability after toast dismissal.

## Visual conventions

Light appearance uses neutral surfaces; selection uses the accent color. Flat surfaces, consistent insets and grid columns establish alignment. Secondary icons use muted color until hover/focus. Member Open/Remove actions appear on row hover or keyboard focus and stay visible on touch. Saved favorites use pink-red; unselected hearts use that color on hover/focus.

Scrollable forms reserve room for focus outlines. Full-width list actions use inset focus rings. Entity icons carry screen-reader type labels; icon buttons carry action labels.
