# Device capabilities

## Identity and reported functions

Physical devices carry `brand`, `model`, `hardwareRevision`, `firmware` and optional `agentName` / `agentVersion`. Identity fields are nullable. Pairs and groups have their own identity and refer to physical member IDs.

The UI reads function availability from `capabilities`:

| Field | UI behavior |
|---|---|
| `sound` | Sound controls |
| `network` | Network configuration |
| `remote` | Remote endpoint controls |
| `alarms` | Alarm functions |
| `buttonPresets.keyCount` | Numbered physical keys |
| `buttonPresets.gestures` | Supported `single` / `double` layers |
| `buttonPresets.sourceTypes` | Optional source-domain restriction |
| `radio.codecs`, `radio.hls` | Radio compatibility filtering |
| `grouping.stereoFamily` | Stereo pairing eligibility |
| `grouping.remoteKeys` | Remote group-button configuration |

Fixtures supply these values in the UI Lab. Backend adapters provide capability detection and device operations for integration. The Device capabilities scenario includes sample devices with six keys, two keys and a display endpoint.

## Functions in groups and pairs

Functions is available when a physical member reports additional functions. Alarms lists each supporting device once, including members of nested groups. Each action names and addresses that device. Alarm editing and scheduling remain an integration task. Preset controls stay above the tabs; membership settings stay under Group Members.

## Button presets

Button presets appear above item configuration tabs. The compact view uses up to three keys per row. Buttons on chooses a physical member in group/pair details; Once/Twice chooses the gesture layer. The adjacent gear exposes editing, transfer and detailed source information.

`presets` stores single-press source IDs; `doublePresets` stores double-press source IDs. Each editor draft binds its device ID and gesture. Saving updates that bank and preserves the other bank. Recall addresses the device's top-level playback target and requires an available target. Other sessions retain their state.

## Assignment editor

The editor contains a key list and searchable Radio, Library, Spotify and Services source browser. Select/clear updates the draft; Save applies it and Cancel discards it. Source references already stored on keys are retained through editing.

Playback capture initially selects the physical device's effective output. Concurrent playback options name both source and output. The capture action names its source and destination key and revalidates the bound session before applying the draft. Catalog entries supply capture metadata. A reported `sourceTypes` list narrows the selectable domains; default selection covers the catalog's source types.

## Assignment transfer

Transfer buttons performs a one-time copy of occupied keys or a selected subset. Group/pair selections expand into unique physical destination IDs. The source device is identified and excluded. Individual selection supports a subset of a group's devices.

The review shows copied, skipped, conflicting and unsupported slots per destination. Selected key numbers replace the corresponding destination assignments. “Overwrite conflicting assignments” additionally moves sources already assigned elsewhere to those keys; review names each replacement and the previous keys to clear. Other destination keys retain their assignments. Both gesture layers participate according to each destination's reported capabilities. Confirmation applies the local plan and presents per-device results.

## Stereo and group configuration

[Group membership](GROUP_MEMBERSHIP.md) describes the common controls for multiroom, stereo, persistence and nested groups.

Stereo mode requires two free online physical devices with the same reported `stereoFamily`. SoundTouch 10 fixtures use `soundtouch-10`. Left/right assignment is stored explicitly. Groups can contain a stereo pair or logical subgroup; [Interaction model](INFORMATION_ARCHITECTURE.md) describes membership and playback rules.

Group Members → gear contains Main speaker, Keep group together and Remote group buttons. `leaderDeviceId` identifies the main physical device. A pair contributes its main/left speaker to the candidate list. Removing the main member clears the role for explicit reselection. Title renaming applies to devices, pairs and temporary groups.

`grouping.remoteKeys: ['thumbsUp','thumbsDown']` enables receiver-specific group binding. The receiving device can be outside the group. Either or both keys can reference the group's template. The UI names an assignment being replaced and preserves draft choices when switching receiver. Save validates membership, availability and concurrent changes before applying the draft; playback and preset banks retain their state.

`device.groupKeys` contains template snapshots `{id,name,leaderDeviceId,deviceIds,persistent}` and key→template-ID bindings. Saving group settings refreshes that group's bound snapshots. Unbinding retains saved templates. A live group's name and a receiver's stored snapshot have separate lifecycles.

## Radio

Radio filters use country, language, genre, votes/popularity/name/bitrate order, minimum bitrate, last-check success and compatibility output. Compatibility checks the reported codec/HLS capabilities of every physical device in that output. Entries with unknown capability data stay visible for selection.

The UI Lab filters its sample catalog. Reset clears search and restrictions. The pin preference keeps search, filters and genre controls within the workspace while scrolling. The expanded filter panel has its own bounded scroll area.

## STR adapter mapping

Source reference: [JRpersonal/streborn](https://github.com/JRpersonal/streborn/tree/6c874ee11bd89175427ef65be56eeeeb33317cd9), revision `6c874ee11bd89175427ef65be56eeeeb33317cd9`.

| Contract | Mapping and source |
|---|---|
| Preset layers | `presetRows=2` enables the second bank. Once keys 1–6 use slots 1–6; Twice keys 1–6 use slots 7–12. See [presetrows.js](https://github.com/JRpersonal/streborn/blob/6c874ee11bd89175427ef65be56eeeeb33317cd9/desktop-app/frontend/src/presetrows.js). |
| Preset storage | Firmware stores six primary slots; STR stores second-bank assignments. See [slots.go](https://github.com/JRpersonal/streborn/blob/6c874ee11bd89175427ef65be56eeeeb33317cd9/internal/presets/slots.go). |
| Gestures | The agent handles double-press detection and group echoes. See [doublepress.go](https://github.com/JRpersonal/streborn/blob/6c874ee11bd89175427ef65be56eeeeb33317cd9/cmd/agent/doublepress.go). |
| Typed sources | Library streams, folders/queues, Spotify playlist/album URIs, native ContentItems and playing-source capture use typed payloads. See [app_presets.go](https://github.com/JRpersonal/streborn/blob/6c874ee11bd89175427ef65be56eeeeb33317cd9/desktop-app/app_presets.go). |
| Whole-bank transfer | `CopyPresetsAcrossBoxes` validates the completed assignment set and reports destination conflicts. See [app_presets.go](https://github.com/JRpersonal/streborn/blob/6c874ee11bd89175427ef65be56eeeeb33317cd9/desktop-app/app_presets.go). |
| Selected-key transfer | `CopyPresetKeysAcrossBoxes` reports copied, skipped and unsupported slots. See [app_presets_keycopy.go](https://github.com/JRpersonal/streborn/blob/6c874ee11bd89175427ef65be56eeeeb33317cd9/desktop-app/app_presets_keycopy.go). |
| Explicit relocation | `MovePreset(host, port, from, to)` uses `/api/box/preset-move` for a source already stored on another key. Overwrite transfer orchestration must retain the incoming typed source payload and report each confirmed move/replacement. See [app_presets.go](https://github.com/JRpersonal/streborn/blob/6c874ee11bd89175427ef65be56eeeeb33317cd9/desktop-app/app_presets.go). |
| Transfer validation | Device-side validation and acknowledgements use [presets_http.go](https://github.com/JRpersonal/streborn/blob/6c874ee11bd89175427ef65be56eeeeb33317cd9/internal/webui/presets_http.go). |
| Group execution | A zone has a physical master and followers; permanent membership restores when the main speaker starts music. See [zones.go](https://github.com/JRpersonal/streborn/blob/6c874ee11bd89175427ef65be56eeeeb33317cd9/internal/zones/zones.go). |
| Remote group keys | Receiver-owned named templates bind thumbsUp/thumbsDown to group formation/dissolution. See [AUTOMATION.md](https://github.com/JRpersonal/streborn/blob/6c874ee11bd89175427ef65be56eeeeb33317cd9/docs/AUTOMATION.md). |
| Volume | Group sliders apply relative member changes; Spotify-originated group volume changes reach followers. See [zonevolume.go](https://github.com/JRpersonal/streborn/blob/6c874ee11bd89175427ef65be56eeeeb33317cd9/internal/webui/zonevolume.go) and [volume.go](https://github.com/JRpersonal/streborn/blob/6c874ee11bd89175427ef65be56eeeeb33317cd9/internal/spotify/volume.go). |

The UI Lab uses catalog source IDs and local template IDs. The integration adapter preserves typed metadata, account associations, tracks, repeat/shuffle and native source objects through editing, backup and transfer. Whole-bank Spotify preset copying can also transfer credentials; the production review and result must identify that effect.

For remote groups, the adapter maps stable IDs to the name-based `/api/groupkeys` contract, resolves network addresses and builds the physical follower list. It also supplies per-device Spotify account/source state, pairing compatibility, live membership, recovery results and remote events. [Backend integration](WAILS_INTEGRATION.md) describes these responsibilities.
