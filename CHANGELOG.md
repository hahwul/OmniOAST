# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

### Fixed
- Deleting or enabling/disabling a provider, and the Interactsh quick-add, showed a success toast even when the backend reported a failure
- Resuming a polling task while it was still starting (e.g. clicking Resume during startup) started a second Interactsh client that could never be stopped; removing or pausing a task mid-start now cancels the start
- Pausing and resuming a task during a slow poll left two polling loops running for the same task
- Clearing a tab's interactions no longer brings back the whole webhook.site / BOAST / Custom HTTP history on the next poll
- Webhook.site interaction timestamps were shifted by the local UTC offset (its `created_at` is UTC without a zone marker)
- Interactsh servers configured with a path prefix (e.g. behind a reverse proxy at `/oast`) had the prefix dropped from register/poll/deregister requests
- Restoring an Interactsh session that only stored its private key replaced that key with a freshly generated pair, so its interactions could no longer be decrypted
- Interactsh payloads are now generated from the alphabets the server expects (xid correlation ID + zbase32 nonce, like the official client). interactsh-server 1.4.0+ silently ignored callbacks to most OmniOAST payloads, and newer builds reject the registration itself. Payloads generated before this version keep their old IDs: generate a new one when using such a server
- Interactsh interactions without a raw request/response (e.g. SMTP) showed the literal text `undefined` in the editor
- A PostBin provider kept handing out its expired bin (bins last 30 minutes); Get Payload now creates a new bin when the old one is gone
- PostBin requests already taken off the bin were dropped when a later request in the same poll failed
- Custom HTTP endpoints returning a JSON object as `body` / `rawResponse` broke interaction search and the request/response view (interactions already stored that way are repaired on load)
- BOAST DNS interactions never showed their query type in the Method column
- Clicking Get Payload again for a provider that returns the same payload (webhook.site, PostBin, BOAST, Custom HTTP) no longer stacks a duplicate polling task on the tab; the existing task is restarted so provider and interval changes apply
- Saves that overlapped (e.g. an interaction arriving while the polling list was being saved) wrote each other's data back to an older state, so a just-received interaction, tab or polling task could be missing after a reload. Storage writes are now queued and coalesced
- A provider stored without a token (NULL in the database) made the whole provider list come back empty and that provider impossible to load
- One malformed entry in the stored plugin data (e.g. a `null` polling task or a tab without interactions) stopped the OmniOAST page from loading; such entries are now skipped
- Get Payload, Resume and Poll no longer fail silently: settings that cannot be loaded, a polling task that cannot be started and tasks whose provider is disabled or deleted now show a toast. The "Polling N task(s)" notice of the Poll button was never shown
- Closing a tab while Get Payload was still registering left a polling task (and an Interactsh session) behind for the missing tab
- Clicking Get Payload again while it was still registering registered a second bin/token for the same provider
- When settings could not be loaded, Get Payload used a 5 s polling interval instead of the 30 s default
- Changing the polling interval in Settings now applies to existing polling tasks (running ones are restarted), not only to new payloads
- Paused polling tasks are now kept paused after a reload instead of all resuming
- An expired PostBin bin was polled forever as if it were empty; its task is now paused with a toast saying to get a new payload
- Webhook.site polling read only the newest 50 requests, so anything beyond that arriving between two polls was never shown
- Tab rename: Escape saved the typed name anyway, an emptied name left the input stuck in edit mode, and double-clicking inside the input reset what had been typed
- The request/response of the selected interaction stayed on screen after switching to another tab
- Removing a payload (its chip or its polling task) left it in the tab's payload field

## 0.6.1

### Fixed
- Sidebar unread badge not clearing on OAST tab entry — switched to Caido's `addPage.onEnter` callback for reliable entry detection (#85)
- Unread badge and desktop notifications gated on a synchronous DOM visibility check rather than observer-maintained state, eliminating cases where observers missed Caido page transitions

## 0.6.0

### Added
- Resizable interaction area — drag divider between interaction list and request/response editors (#66)
- Full-screen expand dialog for viewing large request/response bodies (#63)
- Search in request/response editors with Ctrl+F / Cmd+F and search button (#48)
- Custom HTTP provider for generic OAST endpoints
- Time range filter on interactions list
- Toast notifications when new interactions arrive while on other Caido pages
- Sidebar badge count for unread interactions with auto-clear on OAST tab entry
- Desktop notification toggle in Settings (default: ON)

### Changed
- Debounced storage writes to reduce SDK storage overhead during polling
- Deduplicated interactsh callback logic in pollingManager
- Removed debug logging from interactsh decryption
- Removed non-functional `oast.online` from public interactsh providers

### Fixed
- TypeScript strict mode errors across backend and frontend
- Sidebar badge not clearing when navigating back to OAST tab
- Filter bar height alignment between search, provider dropdown, and date picker

## 0.5.1

### Changed

- Add numeric IDs to traffic callbacks (e.g. [1], [2]) for quicker log scanning and reference

## 0.5.0

### Added
- Support for multiple payloads in OAST tabs

### Changed
- Persist OAST link and polling state across restarts

### Fixed
- Miscellaneous bug fixes

## 0.4.0
### Added
- Support for Command Palette commands: "Go to OmniOAST" and "Polling All Tabs"
- Keyboard shortcuts: `Go to OmniOAST: Cmd+Shift+O`, `Polling All Tabs: Not set`

### Changed
- Extend search functionality to include request and response content
- Fixed toast message bug

## 0.3.2
### Changed
- Fixed 2 UI bug in OAST Tab
- Changed sub-tab size in OAST Tab
- Add confirm when deleting sub tabs in the OAST tab

## 0.3.1
### Changed
- Fixed bug in installation

## 0.3.0
### Added
- Improved "Quick Add" button functionality
- Added Polling Tasks page
- Added sidebar count display
- Added support for multiple tabs in OAST Tab

### Changed
- Standardized timestamp formats for OAST interactions by provider

## 0.2.0
### Added
- Support for Webhook.site provider to enable external webhook testing
- Support for PostBin provider for temporary request storage
- Method Field in OAST tab and Interactions for enhanced request handling

## 0.1.1
### Changed
- Improved Request and Response Tab by replacing Plain with CodeMirror for better code editing

## 0.1.0
### Added
- Initial release with core functionality

[0.2.0]: https://github.com/your-repo/releases/tag/v0.2.0
[0.1.1]: https://github.com/your-repo/releases/tag/v0.1.1
[0.1.0]: https://github.com/your-repo/releases/tag/v0.1.0
