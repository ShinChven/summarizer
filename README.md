# AI Voice Summarizer 🎙️✨

A modern Chrome extension that uses the **Gemini 3.1 Flash Live** model (released March 2026) to instantly summarize web pages and read them aloud with ultra-low latency.

![Extension Icon](icon48.png)

## Features

- **Real-time Summarization:** Leverages the `gemini-3.1-flash-live-preview` model for instant, high-quality summaries.
- **Native Audio Output:** Receives raw 24kHz PCM audio streams directly from the AI, providing a natural and engaging voice experience.
- **Live Transcription:** See the summary text appear in real-time as the AI speaks.
- **Ultra-Low Latency:** Optimized with `thinkingLevel: 'minimal'` for a "live" conversational feel.
- **Modern UI:** A clean, Google-inspired side panel interface with a "Live" status pulse animation.
- **Secure Key Management:** Store your Google AI Studio API key locally and securely.

## Technical Highlights

- **Gemini Live API:** Built using the `@google/genai` SDK over WebSockets.
- **Web Audio API:** Implements a custom PCM player using `AudioContext` to handle 16-bit little-endian audio chunks with precise timing.
- **Chrome Side Panel:** Utilizes the latest Manifest V3 `sidePanel` API for a non-intrusive user experience.
- **Zero Content Script Overhead:** Uses `chrome.scripting.executeScript` to extract page text on-demand, avoiding unnecessary memory usage on inactive tabs.

## Getting Started

### Prerequisites

- A [Google AI Studio](https://aistudio.google.com/) API Key.
- Node.js installed (for building the extension).

### Installation

1. **Clone or download** this repository.
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Build the extension**:
   ```bash
   npm run build
   ```
4. **Load into Chrome**:
   - Open `chrome://extensions/`
   - Enable **Developer mode** (top right).
   - Click **Load unpacked** and select the project folder.

### Usage

1. Click the **AI Voice Summarizer** icon in your Chrome toolbar.
2. Click the **Gear Icon** ⚙️ in the top right to open Settings.
3. Enter your **Gemini API Key** and click **Save**.
4. Go back to any web page and click **Summarize Page**.
5. Sit back and listen as the AI reads you a concise summary!

## Project Structure

```text
├── manifest.json         # Extension configuration
├── sidepanel.html        # Main UI structure & styles
├── sidepanel.js          # Main logic (Live API connection & Audio handling)
├── sidepanel.dist.js     # Bundled/minified production script
├── background.js         # Side panel management
├── icon.svg              # Source vector icon
└── icon*.png             # Generated PNG assets for Chrome
```

## Development

To make changes to the logic, edit `sidepanel.js` and run the build command:
```bash
npm run build
```

## License
ISC
