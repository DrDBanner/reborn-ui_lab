# Product direction

The UI Lab develops a shared interface for listening across devices, rooms and manufacturers. ST Reborn is the first integration context. Future iterations can add manufacturer adapters while keeping the same navigation, source selection, grouping and playback controls.

The aim is a consistent everyday interface that users can choose for its usability across their audio setup. Devices can remain useful as manufacturer apps, cloud services and available hardware change. Groups, sources and personal button assignments provide continuity through that lifecycle.

## Architecture

Devices report brand, model, revision, software versions and capabilities. Views show the functions each device provides. A device with no hardware keys shares the same detail structure as one with preset buttons; its available functions determine the controls.

Group membership organizes devices, stereo pairs and named groups. Playback sessions bind sources to their targets. These shared concepts give adapters a common contract for discovery, source support, playback, grouping, volume and device functions. Cross-manufacturer grouping depends on the adapters' reported interoperability and synchronization capabilities.

The current Lab exercises these concepts through JSON fixtures, including sample brands and varied capabilities. Live manufacturer support is delivered through adapters that detect capabilities, validate compatibility and acknowledge operations. See [Device capabilities](DEVICE_CAPABILITIES.md) and [Backend integration](WAILS_INTEGRATION.md).

The project's own code and documentation use [Apache-2.0](../LICENSE), allowing contributions, reuse and future integrations. Bundled components retain their listed [licences and attribution](../THIRD-PARTY-NOTICES.md).
