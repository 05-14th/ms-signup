# MS Signup Form Filler

Automated sign-up form filler for MS Exchange Online using Playwright Core for browser automation.

## Overview

This project provides a robust automation framework to programmatically fill out and submit Microsoft Exchange Online sign-up forms. It uses Playwright Core to control a browser, execute a sequence of actions defined in JSON, and capture the results.

## Features

- **JSON-based Workflows**: Define automation steps in simple, readable JSON format
- **Flexible Element Locators**: Support for CSS selectors, ARIA roles, labels, placeholders, and text content
- **Robust Element Interaction**: Handles scrolling, waiting for elements, and network idle states
- **Multi-tab Support**: Automatically tracks and switches between browser tabs
- **Error Handling**: Graceful failure reporting with detailed step-by-step logging
- **Page Snapshots**: Captures final page state and renders detailed reports

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

Run the automation script with a steps JSON file:

```bash
node act.js steps.json
```

### Step Definitions

Steps are defined as JSON objects with an `op` field indicating the operation type. Here are the supported operations:

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

### Element Locator Options

Steps support multiple ways to locate elements:

- **`css`**: CSS selector (e.g., `"#form-id"`, `".button-class"`)
- **`role` + `name`**: ARIA role and accessible name (e.g., `"role":"button"`, `"name":"Submit"`)
- **`label`**: Form label text
- **`placeholder`**: Input placeholder text
- **`text`**: Element text content
- **`nth`**: Target nth matching element (0-indexed)
- **`exact`**: Require exact text match (boolean)

### Example Workflow

```json
[
  {
    "op": "goto",
    "url": "https://signup.microsoft.com/get-started/signup?products=..."
  },
  {
    "op": "wait",
    "ms": 5000
  },
  {
    "op": "fill",
    "label": "Email address",
    "value": "user@example.com"
  },
  {
    "op": "click",
    "role": "button",
    "name": "Next"
  },
  {
    "op": "waitfor",
    "text": "Enter password"
  },
  {
    "op": "fill",
    "label": "Password",
    "value": "SecurePassword123!"
  },
  {
    "op": "click",
    "role": "button",
    "name": "Sign up"
  },
  {
    "op": "wait",
    "ms": 3000
  }
]
```

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
├── snap.js             # Screenshot/snapshot utilities
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
- **focus.js**: Handle focus state during automation
- **dropdown.js**: Enhanced dropdown menu handling
- **dd.js**: Additional dropdown utilities
- **probe.js**: Probe and inspect page state
- **snap.js**: Screenshot and snapshot functionality

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
   - Final page state
3. Closes the browser

## Dependencies

- **playwright-core** (^1.62.1): Core browser automation library

## Notes

- The script waits up to 30 seconds for element visibility by default
- Network idle state is awaited with an 8-second timeout between steps
- **Important**: The script deliberately avoids using `bringToFront()` to prevent focus issues with Fluent UI callouts (dropdown menus) that dismiss on blur
- Failed steps prevent subsequent execution to avoid unintended side effects

## License

ISC

## Author

05-14th

---

For more information about Playwright Core, visit: https://playwright.dev/
