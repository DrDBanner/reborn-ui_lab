# Device identity and item-specific functions

Every physical device carries `brand`, `model`, `hardwareRevision` and `firmware`. Missing values are `null` and display **Not reported**. `agentName` / `agentVersion` describe optional control software separately from device firmware. Composite outputs keep their own identity and refer to their physical members; they do not inherit one member's manufacturer or key assignments.

`capabilities` explicitly reports available UI functions: `sound`, `network`, `remote`, `alarms` and optional `buttonPresets: {keyCount, gestures: ['single', 'double']}`. UI gates use these fields, never brand-name checks. This is a UI/mock contract, not an implemented manufacturer adapter. The eventual backend owns capability detection and hardware operations.

Button presets appear as primary item functions **above the device configuration tabs**, and remain visible across tabs. The current layer is selected with **Once / Twice**; each layer numbers the same physical keys from 1 to `keyCount`. A device without buttons has no preset editor. Single-only devices have no Twice control. The capabilities scenario includes fictional Example Audio devices to exercise missing keys and two-key hardware without claiming support for an actual other vendor.

`presets` holds the existing single-press source IDs; `doublePresets` independently holds double-press source IDs. The editor binds its device ID and gesture when opened, so browsing another output or controlling another playback cannot redirect a save. Saving a layer preserves the other layer. Existing local scenarios migrate identity/capabilities only from matching known fixture devices; their existing assignments remain intact. Unknown devices do not acquire guessed capabilities. Missing legacy double assignments stay empty.

Recalling a key uses that device's top-level logical output (its group/pair when applicable). Independent sessions remain unchanged. This is explicitly named next to the editor. Offline/updating targets cannot be recalled. The browser offers an ordinary accessible Play action for the selected layer; it does not try to recognize physical double presses.

## Existing ST Reborn mapping

Verified against [JRpersonal/streborn](https://github.com/JRpersonal/streborn/tree/6c874ee11bd89175427ef65be56eeeeb33317cd9), revision `6c874ee11bd89175427ef65be56eeeeb33317cd9`:

- [`presetrows.js`](https://github.com/JRpersonal/streborn/blob/6c874ee11bd89175427ef65be56eeeeb33317cd9/desktop-app/frontend/src/presetrows.js): agent `presetRows=2` enables the second layer; legacy agents expose one. Keys 1–6 once map to slots 1–6; keys 1–6 twice map to slots 7–12.
- [`slots.go`](https://github.com/JRpersonal/streborn/blob/6c874ee11bd89175427ef65be56eeeeb33317cd9/internal/presets/slots.go): second-layer assignments stay in STR's own store and must never be written to the six firmware preset slots.
- [`doublepress.go`](https://github.com/JRpersonal/streborn/blob/6c874ee11bd89175427ef65be56eeeeb33317cd9/cmd/agent/doublepress.go): the existing agent handles gesture detection and group echo checks. This logic belongs to that adapter, not the UI.

A future STR adapter translates the two UI banks to those verified slots and reports capabilities from the agent. No live Go/Wails calls are made by this prototype.

## Radio capability filters

Optional `capabilities.radio` reports `codecs` and `hls`. The compatibility filter checks every leaf device of the explicitly chosen output. Unknown capability/codec information stays visible; it is not proof of compatibility. Explicit HLS support allows converted HLS streams regardless of their reported codec. This reflects the current STR adapter behavior without inferring features from a brand.

Radio supports country, language, sort (votes/popularity/name/bitrate), minimum bitrate, last-check success, compatibility output and genre. Filters act on the local sample catalog; no live radio directory or stream verification is claimed. Reset clears search and restrictions. The pin preference sticks the search/filter/genre controls within the scrollable workspace and is persisted per scenario. Expanded filters have a bounded scrolling panel so a small display retains room for results.

## Transfer button assignments

The primary Button presets panel → Transfer buttons copies all occupied keys or a chosen subset to selected devices, pairs or group members. Composites expand to physical devices; overlapping selections are de-duplicated and the source device is excluded. Both gesture layers are included when selected and supported. Empty/unselected source slots do not erase target assignments.

This matches the existing STR **one-time copy** behavior, verified at the pinned upstream revision above:

- [`desktop-app/app_presets.go`](https://github.com/JRpersonal/streborn/blob/6c874ee11bd89175427ef65be56eeeeb33317cd9/desktop-app/app_presets.go): `CopyPresetsAcrossBoxes` copies occupied slots; bulk validation judges the completed assignment set so swaps work. Whole-set duplicate conflicts leave the target unchanged.
- [`desktop-app/app_presets_keycopy.go`](https://github.com/JRpersonal/streborn/blob/6c874ee11bd89175427ef65be56eeeeb33317cd9/desktop-app/app_presets_keycopy.go): `CopyPresetKeysAcrossBoxes` reports copied, skipped and unsupported second-layer slots per target; collisions can skip a chosen key while other keys copy. Unmentioned target keys remain untouched.
- [`internal/webui/presets_http.go`](https://github.com/JRpersonal/streborn/blob/6c874ee11bd89175427ef65be56eeeeb33317cd9/internal/webui/presets_http.go): target validation and conflict reporting remain backend responsibilities. A real integration must also handle readiness, partial failures and older agents without bulk support.

The lab previews the plan, then applies local mock assignments with per-device results. Source IDs stand in for real typed preset payloads and duplicate identities; an adapter must use actual backend identities and responses. It must not claim copied keys before acknowledgement. No persistent shared-profile subscription has been established by these copy APIs. The UI therefore does not promise continuous synchronization. Group fan-out is orchestration, not storage on a fictional group device.

## Reference app gaps

The screenshot audit of ST Reborn v1.6.2 records additional capabilities and their intended contexts in [project/feature-coverage/coverage.md](../../project/feature-coverage/coverage.md). In particular, the global simulated Spotify connection and actual pairing discovery/acknowledgement are known mock limitations; production needs per-device account/source state and explicit pairing-compatibility contracts.


## Primary functions on composite outputs

Groups and pairs expose the same compact Button presets panel before their configuration sections. A member selector chooses a physical device that explicitly reports button capabilities. Display, gesture selection, editing, recall and transfer are bound to that device; switching the member cannot redirect an already opened editor. A preset recall uses the device's current top-level output. Available gesture layers and key counts follow the chosen member. A foreign or buttonless member is never used as a fallback.

Assignments remain stored per physical device. A common group surface does not imply identical member banks. The add_link transfer action provides deliberate propagation with the existing review/results flow. There is no fictional group-owned button store. Other, less frequent device functions such as alarms remain in Functions; a device that only reports buttons does not need that tab.


## Typed assignment editor

Edit assignments uses a draft per physical device and gesture bank. A key overview stays separate from the searchable source browser. Radio, Library, Spotify and Services are explicit filters; rows and primary preset cards show the source kind, including library tracks/folders/queues and Spotify albums/playlists. Selecting or clearing changes the draft; Save commits that bank and Cancel discards it. Existing unmodified references are preserved even if a source is no longer in the catalog.

The playback source picker initially selects the bound device's effective output, including its group. With simultaneous sessions, each option names source and output; the user may explicitly choose another playback. It never silently uses an unrelated session merely because that session is selected in the bottom player. Capture names the chosen source and destination key, changes only the draft and rejects stale source/session actions. Unknown/unavailable source details cannot be captured by this catalog-based simulator. Optional `capabilities.buttonPresets.sourceTypes` limits selectable domains when explicitly reported; missing restrictions preserve legacy catalog behavior rather than assuming a brand-specific limit.

Actual STR preset payloads are richer than radio: [`app_presets.go`](https://github.com/JRpersonal/streborn/blob/6c874ee11bd89175427ef65be56eeeeb33317cd9/desktop-app/app_presets.go) includes SaveLibraryPreset (single stream/title), SaveFolderPreset / SaveQueuePreset (folder/queue references and ordered items), SaveSpotifyPreset (playlist/album URI and account), SaveNativePreset (native service ContentItem) and SavePlayingPreset. The lab stores source IDs, not these actual hardware payloads. The future adapter must preserve typed metadata, accounts, tracks, repeat/shuffle and opaque native objects through editing, backup and transfer. Whole-set STR copying also attempts credential transfer for Spotify presets; production review/results must make that effect visible rather than imply independent preset copying alone.

## Stereo eligibility

Optional `capabilities.grouping.stereoFamily` is an adapter-reported compatibility key. Stereo selection requires equal non-empty keys on two free online physical devices. Known SoundTouch 10 fixtures report `soundtouch-10`; other fixtures without a report cannot be selected for stereo. This fixture metadata is not manufacturer discovery or a real pairing guarantee. Normal groups may contain an existing stereo pair. Existing memberships require deliberate management before regrouping; the form never dissolves them implicitly.

Transfer destinations use one hierarchy: top-level group/pair headings and each physical device once. Group selection expands to eligible physical targets; individual unchecking supports partial group selection. The source is excluded and named as such. Once/Twice keys and destination devices are adjacent on wide screens, stacked responsively; preview and confirmation remain explicit.

## Group settings and remote group keys

Group Members → gear owns the existing **Keep group together** switch, a physical main speaker selector and **Remote group buttons**. A pair contributes its reported main/left speaker as a leader candidate; its follower is not an independent group leader. Fixtures report `leaderDeviceId`; unknown legacy groups require explicit selection. Removing the main member clears that role. Ad-hoc groups and pairs can be renamed through the same title pencil as devices.

A physical device explicitly reports `capabilities.grouping.remoteKeys: ['thumbsUp','thumbsDown']` to expose remote group binding. This capability is independent of preset count/Once/Twice and is not inferred from brand. The receiving speaker can be outside the group. Choose it and bind either or both remote keys; changing receiver preserves draft edits for other receivers. Existing assignments to another template are named before replacement. Cancel changes nothing; Save validates the complete draft, rejects concurrent assignments, changed membership or unavailable receivers, then commits mock state without changing playback or preset banks.

Verified against STR revision `6c874ee11bd89175427ef65be56eeeeb33317cd9`:

- `internal/zones/zones.go`, `internal/webui/zones_default_group.go`, `desktop-app/app_zone.go`: optional name, master and permanent membership. Permanent groups restore on main-speaker playback after standby/reboot; this does not mean every preset becomes a group trigger.
- [`docs/AUTOMATION.md`](https://github.com/JRpersonal/streborn/blob/6c874ee11bd89175427ef65be56eeeeb33317cd9/docs/AUTOMATION.md) and `internal/groupkeys`: named group templates stored on the receiving speaker; thumbsUp/thumbsDown toggles formation/dissolution. Preset slots 1–6/7–12 remain separate.
- `internal/webui/zonevolume.go`, `zonejoinvolume.go` and `desktop-app/frontend/src/pairVolume.js`: group UI sliders move member levels relatively, individual controls preserve per-speaker balance, joining speakers adopt the group level. `internal/spotify/volumesync.go` and `volume.go` bridge Spotify volume and fan out Spotify-originated group changes. This audit did not establish an arbitrary all-member hardware-volume-follow switch; none is advertised here.

Local `device.groupKeys` holds template snapshots `{id,name,leaderDeviceId,deviceIds,persistent}` and key→template-ID bindings. Re-saving group settings refreshes this group's bound snapshots; unbinding preserves templates and unrelated keys. Renaming the live group alone does not rewrite remote snapshots. A production adapter must map stable IDs to the actual name-based `/api/groupkeys` contract, omit the master from follower lists, resolve network addresses and verify capability/version and acknowledgements. Saved template vs live membership, recovery failures and real remote event handling remain integration work. The UI Lab sends no hardware commands and does not claim real restoration/IR execution.
