# Nested groups

A group can contain other groups. This lets you combine existing rooms or floors for shared listening while keeping their names, members and stereo pairs.

For example, use Downstairs for the kitchen and living room, Upstairs for the office and bedroom, and Whole home when music should follow you through the house. Joining or separating a floor takes one membership change.

## Open the example

1. Open the logo menu and choose the **Nested groups** scenario. The same scenario is available in Design Lab → Scenarios.
2. In Outputs, open **Whole home → Details**.
3. Under **Group Members**, hover or focus Downstairs or Upstairs and use **Open details**. Touch screens show the Open icon directly.
4. In Downstairs, open Living Room to see its stereo pair. The parent link returns to the containing group.

The shipped example contains seven physical speakers:

```text
Whole home                         FluxFM · 5 speakers
├── Downstairs
│   ├── Living Room                Stereo pair
│   │   ├── Living Room L
│   │   └── Living Room R
│   └── Kitchen
└── Upstairs
    ├── Office
    └── Bedroom

Terrace L                          NDR Info · independent playback
Terrace R                          Ready to listen
```

Whole home has **two group members** containing **five speakers**. Playback targets shows Whole home, Terrace L and Terrace R. All devices shows all seven speakers.

## Playback and controls

All members of Whole home share its source and transport. Starting a source or recalling a preset from a joined subgroup addresses Whole home. Terrace L keeps its independent stream. The volume lightbox offers overall volume and individual speaker levels.

Button assignments belong to the physical device selected in **Buttons on**. Each device keeps its own presets when groups join. Group settings belong to the selected group; joined playback uses the top-level group's configuration.

## Separate and rejoin a floor

In Whole home → Group Members, use **Remove Upstairs** and confirm. Upstairs keeps Office and Bedroom and becomes a separate playback target, ready for a source. Downstairs continues through Whole home.

Open Upstairs → Group Members → **Add to existing group…**, choose Whole home, review the playback effect and confirm **Add to group**. Alternatively, open Whole home → **Add members…** and select Upstairs. The review identifies the source that will play and any streams it replaces.

An item has one parent. Every physical speaker appears once in the hierarchy. A group can contain free groups, pairs and devices; selecting an ancestor or itself is prevented.

Use **Reset current scenario** in Design Lab to restore the example.

## Integration

The UI Lab stores the named hierarchy and simulates playback locally. The STR adapter maps the top-level group to one physical main speaker and a flat list of follower devices. It must reconcile saved membership and confirmed device state. See [Backend integration](WAILS_INTEGRATION.md) and the [interaction model](INFORMATION_ARCHITECTURE.md#group-membership).
