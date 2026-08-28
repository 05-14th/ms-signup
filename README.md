# MS Signup — JSON-driven Web Crawler & Form Filler

A JSON-driven web crawler and automation framework built on Playwright Core. Originally created to automate Microsoft Exchange Online sign-ups, this project has been extended into a full-featured crawler that can navigate sites, extract data, and perform form interactions — all controlled using simple JSON workflows.

IMPORTANT: When connecting to Microsoft Edge, Edge must be started in debug mode (see "Edge debug mode" below).

## Overview

This project provides a flexible automation and crawling framework. Define both navigation (crawl) and interaction (form fill, clicks, selections) in JSON. The runner connects to a browser (Chromium/Edge) via Playwright Core and executes the defined steps across pages and tabs.

Use cases include:

- Automated sign-up form filling (Exchange Online and other services)
- Site crawling and link discovery
- Data extraction (scraping) with selector-based extraction steps
- Multi-step workflows spanning multiple pages and tabs
- Reproducible workflows defined as JSON files for batch runs or CI

## Key Concepts

- JSON-based Workflows: Everything the runner does is defined as a JSON array of step objects.
- Crawling primitives: Start from seed URLs, follow links, control depth and concurrency through JSON operations.
- Extraction operations: Capture text, attributes, or take page snapshots for reporting.
- Interaction operations: Fill inputs, click buttons, select options, press keys.
- Browser control: Connect to an existing browser (Edge/Chromium) or launch a disposable browser instance.

## Features

- JSON-based Workflows: Use readable JSON to describe navigation, crawling and interactions.
- Crawler controls: Define start URLs, max depth, allowed domains, link selectors, and rate limits via JSON steps.
- Flexible Element Locators: Support for CSS selectors, ARIA roles, labels, placeholders, and text content.
- Robust Element Interaction: Handles scrolling, waiting for elements, and network idle states.
- Multi-tab Support: Tracks and switches between tabs automatically during workflows.
- Data Extraction: Extract text or attributes and save results in the final report.
- Error Handling: Graceful failure reporting with detailed step-by-step logging.
- Page Snapshots: Capture page screenshots and HTML snapshots for debugging and audit.

## Installation

### Prerequisites

- Node.js 14 or higher
- npm

### Setup

1. Clone the repository:
```bash
git clone https://github.com/05-14th/ms-signup.git
cd ms-signup
```

2. Install dependencies:
```bash
npm install
```

## Usage

Run the automation/crawler script with a steps JSON file:

```bash
node act.js steps.json
```

The runner loads the JSON workflow and executes steps sequentially. Workflows can include high-level crawl ops and fine-grained interactions.

### Example Workflow (crawl + fill)

```json
[
  { "op": "crawl_start", "urls": ["https://example.com"], "maxDepth": 2, "linkSelector": "a[href]", "allowedDomains": ["example.com"] },
  { "op": "wait", "ms": 1000 },
  { "op": "goto", "url": "https://example.com/signup" },
  { "op": "fill", "label": "Email address", "value": "user@example.com" },
  { "op": "click", "role": "button", "name": "Next" },
  { "op": "waitfor", "text": "Enter password" },
  { "op": "fill", "label": "Password", "value": "SecurePassword123!" },
  { "op": "click", "role": "button", "name": "Sign up" },
  { "op": "extract", "css": "#confirmation", "as": "confirmation_text" },
  { "op": "snapshot" },
  { "op": "crawl_finish" }
]
```

- crawl_start / crawl_finish are high-level control ops used to mark crawler runs. The runner will follow links discovered with `linkSelector`, honoring `maxDepth` and `allowedDomains` when present.
- extract captures element content into the final report.

### Supported Step Operations (overview)

| Operation | Description | Example |
|-----------|-------------|---------|
| `goto` | Navigate to a URL | `{"op":"goto", "url":"https://..."}` |
| `click` | Click an element | `{"op":"click", "role":"button", "name":"Buy now"}` |
| `fill` | Fill a text input | `{"op":"fill", "label":"Email", "value":"x@y.com"}` |
| `select` | Select an option from dropdown | `{"op":"select", "css":"select#employees", "value":"10-24"}` |
| `press` | Press a keyboard key | `{"op":"press", "key":"Enter"}` |
| `wait` | Wait for specified milliseconds | `{"op":"wait", "ms":2000}` |
| `waitfor` | Wait for element or text to appear | `{"op":"waitfor", "text":"Verify"}` |
| `scroll` | Scroll to position | `{"op":"scroll", "to":"bottom"}` |
| `jsclick` | Trigger native JavaScript click | `{"op":"jsclick", "css":"selector", "text":"Option"}` |
| `extract` | Extract text or attribute from an element | `{"op":"extract", "css":".price", "attr":"textContent", "as":"price"}` |
| `snapshot` | Capture screenshot and HTML snapshot | `{"op":"snapshot"}` |
| `crawl_start` | Begin a crawl run with options | `{"op":"crawl_start", "urls":["https://..."], "maxDepth":2}` |
| `crawl_finish` | End a crawl run and flush results | `{"op":"crawl_finish"}` |

### Element Locator Options

- `css`: CSS selector (e.g., `"#form-id"`, `".button-class"`)
- `role` + `name`: ARIA role and accessible name (e.g., `"role":"button"`, `"name":"Submit"`)
- `label`: Form label text
- `placeholder`: Input placeholder text
- `text`: Element text content
- `nth`: Target nth matching element (0-indexed)
- `exact`: Require exact text match (boolean)

## Edge debug mode (REQUIRED when connecting to Edge)

When using Microsoft Edge as the remote browser target, start Edge in remote debugging mode and connect via Playwright's CDP/remote debugging features. Edge must be in debug mode so the runner can attach to the browser.

1. Start Edge with remote debugging enabled (example on Windows):

```powershell
"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --remote-debugging-port=9222
```

On macOS:

```bash
/Applications/Microsoft\ Edge.app/Contents/MacOS/Microsoft\ Edge --remote-debugging-port=9222
```

2. Configure the runner to connect to the CDP endpoint (example environment variable or connection option depends on your setup). The repository uses Playwright Core; typical connection code uses connectOverCDP to attach to the debug port.

If you do not start Edge in debug mode, the runner will not be able to attach and your run will fail. For local testing you can also use a launched Chromium instance, but for production/targeting Edge, debug mode is required.

## Project Structure

```
ms-signup/
├── act.js              # Main automation script
├── lib.js              # Utility functions for browser management
├── package.json        # Project configuration and dependencies
├── package-lock.json   # Dependency lock file
├── steps.json          # Example workflow steps
├── focus.js            # Focus handling utilities
├── dropdown.js         # Dropdown interaction utilities
├── dd.js               # Additional dropdown handling
├── probe.js            # Page probing utilities
├── snap.js              # Screenshot/snapshot utilities
└── README.md           # This file
```

## Key Modules

### act.js

The main entry point that:
- Loads a steps JSON file
- Connects to a browser via Playwright
- Executes each step sequentially
- Handles errors and logs results
- Reports final page state and all open tabs

### lib.js

Core library functions:
- Browser connection management
- Page selection and switching
- Page snapshots and reporting

### Utility Modules

- `focus.js`: Handle focus state during automation
- `dropdown.js`: Enhanced dropdown menu handling
- `dd.js`: Additional dropdown utilities
- `probe.js`: Probe and inspect page state
- `snap.js`: Screenshot and snapshot functionality

## Error Handling

The script stops on the first failed step and provides:
- A detailed error message
- The step that failed
- All parameters used in that step
- A list of all browser tabs and their URLs

## Output

After completing the workflow (or on failure), the script:
1. Captures a snapshot of the active page
2. Generates a detailed report showing:
   - Step-by-step execution log
   - Success/failure status for each step
   - All open browser tabs
   - Final page state and extracted data
3. Closes the browser

## Dependencies

- `playwright-core` (^1.62.1): Core browser automation library

## Notes

- The script waits up to 30 seconds for element visibility by default
- Network idle state is awaited with an 8-second timeout between steps
- The script deliberately avoids using `bringToFront()` to prevent focus issues with Fluent UI callouts (dropdown menus) that dismiss on blur
- Failed steps prevent subsequent execution to avoid unintended side effects

## License

ISC

## Author

05-14th

---

For more information about Playwright Core, visit: https://playwright.dev/
