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

The button beside the sidebar logo collapses desktop navigation. A quiet button at the left edge restores it. Hover or keyboard focus reveals a faint, blurred edge preview; clicking slides the navigation open. Reduced-motion preferences remove the slide animation. This appearance preference persists across reloads and scenarios. The logo menu remains accessible in the header while collapsed. Mobile navigation uses its independent drawer.

Playing lists all running and paused sessions in the scrollable sidebar, with the medium before the source title (for example Radio · FluxFM); the count matches the list. Selecting one chooses its player context and opens its target details. The current content route determines the selected sidebar item. Each Playing shortcut has a separate Play/Pause button: hover or keyboard focus replaces the status icon with transport; touch shows transport directly. Toggling controls only that session and preserves route and player context. The bottom session selector changes player context. A device inside a composite is represented by its parent playback target in the sidebar.

Playing and the bottom bar render while a running or paused session exists. The player shows the source, target, transport and overall volume. Play/Pause titles follow session state; Stop has an explicit hover title. Paused sessions are labeled Paused. The player Play/Pause control is blue while its session is playing; paused controls stay neutral until hover or keyboard focus. Clicking Play/Pause briefly pulses its ring; changing the selected playback briefly opens a moving gap in the icon’s own ring, then restores its full outline. Reduced-motion preferences suppress both effects.

The quiet `read_more` button beside the player title opens Radio, Library or Spotify for that session's source. Library navigation selects the source's visible music server. Navigation preserves all playback sessions and the selected output. Sources with no corresponding media view have no navigation button.

Variant A accesses outputs through the player panel. Variant B adds sidebar output shortcuts. Both variants share model and playback state.

Desktop route titles sit directly in the scrolling workspace. Device, pair and group details lead with the item name. Mobile retains a navigation bar with its menu controls. Section headings identify distinct content; page actions sit beside the title and wrap at narrow widths.

## Media

Radio, Library and Recently played share a search field beside the title. Filters sit below the heading, followed by the results. Recently played searches the complete saved source history and filters by media type. Starting playback retains older history entries.

Library offers Browse and Titles. Its source selector includes All sources alongside individual music servers. The combined view groups folders by server and names each collection’s origin; title search uses the selected scope. Selected titles remain selected across search and source changes. Add to queues opens the queue assignment dialog; adding titles leaves it open.

Station artwork starts the source on the target named in the bottom player. Hover/focus reveals `play_circle`; touch exposes the action directly. The accessible label and tooltip identify source and target. Availability and the bound player context are checked at activation.

The `music_cast` action opens output selection. Radio options choose Separate playback (the default) or As member, naming the bound output inline. As member joins a free device or pair to the bound session, extending its group or creating a temporary group. The review identifies any replaced source. Selecting a different source applies it to the whole joined target. Confirmation revalidates session, source and destination.

Member additions leave the picker open for further outputs; added rows stay visible and disabled. Done closes it after the changes have applied. Without a current playback, Play together starts the source on the first chosen output; subsequent additions form a temporary group or extend an existing group. Separate playback starts an independent session and closes the picker.

Radio and Recently Played share this picker. Source-change notifications name both values, for example: Playing FluxFM on Downstairs.

The output picker and output workspace list playing targets first, followed by paused targets and remaining outputs. Order within each state stays consistent. Picker rows name the current source and playback state alongside connectivity. The replacement hint appears on hover or keyboard focus and remains visible on touch devices.

When the picker contains more than eight outputs, a search icon reveals a field for target name, device model or current source. Closing search clears its query.

Radio rows use `search_insights` to open station information.

Music servers → gear manages manual server addresses and the visibility of discovered servers. Draft changes apply on Save; Cancel discards them. Manual sources persist with the scenario. Discovered entries come from the sample catalog; manually added sources have no fetched contents until an adapter supplies them.

Collections show their source server and follow the server selection. Search library filters titles, artists and albums across the visible server catalog. Selected titles can be appended to several named queues in one action; queues created in the dialog remain drafts until confirmation. After adding titles, search stays open with a confirmation, cleared title selection and retained queue destinations. Done closes the dialog. Each queue contains unique ordered track IDs, can span servers and persists with its scenario. Opening a saved queue supports renaming, reordering and removing titles. Saved queues are library sources for playback and preset assignment; deleting a queue used by active playback or presets is blocked with an explanation.

## Output workspace

Playback targets lists each top-level device, pair or group once. All devices lists every physical endpoint with its parent relationship. Cards lead with the item name. The smaller, muted source row follows the content inset below it and names the medium before the title, for example Radio · NDR Info. Members uses the same inset. The source title opens source selection; hover highlights its text without a filled surface or dropdown chevron. Availability appears as a small dot: green online, gray offline, yellow updating and red for a reported device error; a tooltip and accessible text name the state. Running streams show blue music_cast, changing to Pause on hover/focus. Paused and stopped controls remain neutral. Inherited running streams show the same blue playback indicator and name their group once. The header's open icon shows details on hover/focus and stays visible on touch. Member lists expand within their own card; a measured Masonry grid packs following cards into available space without changing DOM or keyboard order. Viewport and member changes trigger remeasurement. `open_in_new` opens a member's details.

On entering the workspace, playing targets appear first. Card order stays fixed while changing playback, sources, filters or volume; newly available targets append. Reopening the workspace refreshes playback priority. Expanded member lists and transport keyboard focus survive playback changes. Search, type and Active only filters apply to the workspace. The N scenario contains 50 physical devices and 38 playback targets.

## Item details

Devices, pairs and groups share this order:

1. Title, type icon and rename action.
2. Compact button presets for supported devices.
3. Group Members.
4. Capability-specific tabs and their content.

Presets use at most three columns, adapting to two or one at narrower widths. Groups and pairs offer Buttons on to select the physical owner of the bank. A device uses its own bank. Once/Twice and the settings gear sit in the preset header at the top right; the gear reveals assignment editing, transfer and source metadata.

Hold a preset for 700 ms to open assignment editing with that device, key and gesture layer selected. The button fills from right to left while holding. Releasing early, dragging or scrolling cancels the hold; a short click plays an assigned preset. Unassigned keys open assignment editing on click. Editing keeps playback and saved assignments unchanged until Save assignments.

Assignment editing shows a compact key list next to the source browser. The gesture layer appears in the dialog heading. A single available playback shows its source and output with a direct Assign action; several playbacks offer a selector, and no playback hides that section. Assignment updates remain drafts until saved.

On narrow screens, keys and source selection follow each other at their natural height in one scrollable work area. The dialog heading and Save/Cancel footer remain visible.

The mobile player uses two fixed control rows with touch-sized playback, cast and volume actions. It reserves space for the device's bottom safe area. Tab strips keep horizontal scrolling and keyboard navigation with their scrollbar hidden.

In the output overview, Choose source or clicking the current source opens source selection bound to that playback target. Source types and search cover radio, library, Spotify and services. Choosing a source starts playback on that target; other independent streams continue. Cards show the speaker count once in their heading and offer Members and the details icon for further information.

Item details link directly to their parent by name next to All outputs. A device opens its pair or group; a nested group opens the next enclosing group. Each step follows the current membership hierarchy.

Tabs preserve workspace scroll position within the same item. Changing item or route starts the workspace at the top. Visited tabs reserve their content height for the current item and layout, so shorter tabs preserve the scroll range. Changing item, width or display density recalculates that height.

## Group membership

Group membership is the common interaction model for deciding which devices play together. Multiroom, stereo channels, temporary or persistent groups and nested rooms are managed through shared item details. [Group membership](GROUP_MEMBERSHIP.md) explains how these concepts fit together; [Group nesting](GROUP_NESTING.md) walks through the Nested groups scenario.

Add members selects an ungrouped device, pair or group to bring into the current group. Add to existing group selects a destination for the current ungrouped item. The shared review shows the resulting playback and every active source being replaced. Cancel discards the draft. Save binds the reviewed item IDs, session state and physical member lists; changed state requires another review.

Destination playback takes precedence. A silent destination adopts an incoming running or paused session with its status preserved. Silent inputs stay silent. Other streams and per-device preset banks retain their state.

Each item has at most one parent. Membership forms a tree with unique physical devices. Logical subgroups retain their names and structure while sharing the root playback. Source assignment to a child resolves to that root. Child details expose a parent link and separate Open action.

Create group selects free devices/pairs, a name and persistence. Stereo mode requires exactly two online physical devices with matching reported `stereoFamily` values. Left/right assignment is stored in `leftDeviceId`, `rightDeviceId` and ordered `memberIds`.

The gear beside Add members contains Main speaker, Keep group together and Remote group buttons. The main speaker is identified in the member list. Remote assignments store templates on the selected receiving device.

Member tiles use quiet borders and aligned heights. Remote group buttons use independent switches for Thumbs up and Thumbs down; both can form/dissolve the same group.

For STR integration, the adapter expands the logical hierarchy into unique physical devices and sends one master plus followers. It owns compatibility checks, saved/live state reconciliation and execution acknowledgement. Child-group settings describe that group's standalone configuration; joined playback uses the root configuration.

## Volume

The player slider controls its complete target. The volume icon opens a session-bound lightbox containing overall and individual device controls, organized by pair. A single device uses one slider.

Overall adjustment moves online device levels by a shared offset, clamped to 0–100. Individual controls trim their device; composite master values retain their setting. A single-device session reflects that device's level directly.

Sound-tab and lightbox controls use filled slider tracks and percentage values. Sound-tab rows share label, slider and value columns.

Range sliders support mouse-wheel and touchpad adjustment while the pointer is over the control. Vertical scrolling up increases the value; horizontal scrolling right increases it. Small touchpad movements accumulate into steps. Values respect the slider's limits and step; disabled sliders and pinch-to-zoom leave scrolling unchanged.

## Notifications

Notifications stack at the top right. Ordinary notes expire after eight seconds; errors use explicit dismissal. Entry, exit and countdown animations respect elapsed time and reduced-motion preferences. Notification state lasts for the app session.

Reported app/device update availability produces one toast for newly reported targets, naming devices and versions. Its Updates & maintenance link opens that workspace. Installation has its own action there. Update all starts all online speakers reporting an available firmware update; existing update progress and unavailable devices remain unchanged. Runtime fingerprints deduplicate repeated reports per scenario. New versions, returning availability, scenario reset or app restart can produce a fresh notice. Maintenance retains the reported availability after toast dismissal.

## Visual conventions

Light appearance uses neutral surfaces; selection uses the accent color. Flat surfaces, consistent insets and grid columns establish alignment. Secondary icons use muted color until hover/focus. Member Open/Remove actions appear on row hover or keyboard focus and stay visible on touch. Saved favorites use pink-red; unselected hearts use that color on hover/focus.

Radio artwork placeholders share a neutral surface and foreground across media lists and the player. Radio source icons in presets use the same neutral foreground. Output cards show the medium as inline text before the source title.

Scrollable forms reserve room for focus outlines. Full-width list actions use inset focus rings. Entity icons carry screen-reader type labels; icon buttons carry action labels.

Lightboxes soften their backdrop with a 2px blur and enter with a short fade and 6px vertical motion. Form updates keep the dialog steady. Hover colors and playback symbols crossfade; text-link underlines grow from the left. Reduced Motion disables these animations and transitions.


## Appearance and scaling

Appearance → App zoom enlarges the interface from 100% to 200%. At 100%, the browser's font and zoom preferences remain the base. Choosing a larger value applies an additional multiplier and persists as an application preference across scenarios. Design Lab exposes the same setting.

Typography, spacing and UI dimensions use rem; inline text spacing can use em. Grid and Flex layouts adapt to the available width, and named app-container breakpoints follow the scaled root size. Dialogs stay within the dynamic viewport and scroll their contents. Fine borders and the measured Masonry row unit retain pixel sizing.
