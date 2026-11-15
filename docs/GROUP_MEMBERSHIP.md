# Group membership

Group membership is the shared way to decide **which devices play together**. The same item details bring multiroom playback, stereo pairing, temporary groups, saved groups and nested rooms or floors into one interface.

Three choices describe the setup: choose a source, choose who plays it together, and choose which settings to keep. Devices, stereo pairs and groups each have details with their members, playback and available functions.

## How the concepts fit together

| Listening task | Group membership |
|---|---|
| Play music in several rooms | Combine devices, pairs or groups into one playback target sharing a source and transport. |
| Add a room for the evening | Name a temporary group and adjust its members as needed. |
| Restore a regular combination | Enable **Keep group together** so the main speaker restores its members when playback resumes. |
| Use two speakers as stereo | Select **Stereo** in Create group and assign left and right channels on compatible devices. |
| Combine rooms into floors, then the whole home | Add named groups as members. Their internal structure stays available in details. |
| Bring another device into music already playing | Choose **As member** in the source/output picker. |
| Recall a saved group from a remote | Bind a group template through **Group Members → gear → Remote group buttons**, where supported. |

Membership describes the participating items. Stereo adds channel roles, persistence adds restoration behavior, and nesting organizes existing combinations. Device capabilities determine which options are available.

## One place to manage the relationship

Open an item's **Details → Group Members**:

- **Add members…** brings available items into the current group. On a free speaker, it opens group creation with that speaker selected. For an existing group, it offers the same Stereo and Keep group together options. Stereo assigns left and right channels when the result contains exactly two compatible individual speakers; the named output and its playback stay in place.
- **Add to existing group…** joins the selected free item to another group.
- **Open details** inspects a member; the parent link leads back up the hierarchy.
- **Remove** separates a member. A removed subgroup retains its own members and becomes an independent playback target.
- The **gear** configures the main speaker, Keep group together and supported remote group buttons.

Both joining actions show the resulting source and any streams they replace before confirmation. When the destination already has active playback, that playback continues across the joined members. A silent destination adopts an incoming running or paused session. Each item has one parent, so the hierarchy gives every physical device one place.

## What the shared controls affect

A top-level group is one playback target. Its source and transport apply to all its members, including speakers inside subgroups and stereo pairs. Starting a source or recalling a device preset inside that hierarchy addresses the top-level target. Other playback targets can play independent sources at the same time.

Overall volume adjusts the participating speakers together; individual levels remain available. Physical devices retain their own identity, firmware, capabilities and button assignments. **Buttons on** selects whose presets are shown; **Transfer buttons** explicitly copies assignments to other devices. The Group Members gear controls restoration, remote group templates and dissolving the group. Removing a member opens a lightbox with Remove and keep group or Dissolve group. Keeping a stereo pair converts it to a regular named group with the remaining speaker, ready for another member. Its identity and current playback are preserved. Dissolving the output separates its members. Physical devices keep their settings and button assignments. Single devices are labeled Single speaker. Advanced remains available for additional settings reported by an adapter.

For example, Downstairs and Upstairs can play independently. Joining them under Whole home gives five speakers one shared playback while retaining both floor groups. Separating Upstairs makes its office and bedroom available together for their next source.

## See it in the Lab

Choose **Logo menu → Scenario → Nested groups**, then **Whole home → Details → Group Members**. The example includes two floor groups, a stereo pair and an independent terrace stream. Follow the [nested-groups walkthrough](GROUP_NESTING.md) to inspect, separate and rejoin them.

The UI Lab simulates these relationships locally. The [backend adapter](WAILS_INTEGRATION.md) maps the shared model to reported device capabilities and confirmed device operations. For STR, it expands the hierarchy into a physical main speaker and followers. [Interaction model](INFORMATION_ARCHITECTURE.md#group-membership) specifies the state and playback rules.
