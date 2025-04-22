# OpenAI.fm Automation Script

This script automates the usage of [OpenAI.fm](https://www.openai.fm/) to play long texts in chunks. It splits the input text into chunks that don't exceed the character limit, then sequentially plays each chunk using the website's play button.

## Features

- Automatically detects and respects the 999 character limit of OpenAI.fm
- Splits text into chunks without cutting words mid-way
- Sequentially processes each chunk, waiting for audio playback to complete
- Shows progress information during execution
- Supports both direct text input and reading from files
- Allows customization of voice and vibe options
- Works with both headless and visible browser modes

## Requirements

- Node.js
- Playwright

## Installation

1. Clone or download this repository
2. Install dependencies:

```bash
npm install
```

## Usage

```bash
node openai_fm_automation.js [options] <text or file path>
```

### Options

- `--file, -f`: Treat the input as a file path instead of direct text
- `--headless, -h`: Run in headless mode (no browser UI)
- `--voice, -v`: Specify the voice to use (default: NYC Cabbie)
- `--vibe, -b`: Specify the vibe to use (default: Calm)
- `--help`: Show help message

### Examples

```bash
# Convert direct text to speech
node openai_fm_automation.js "This is the text to convert to speech"

# Convert text from a file
node openai_fm_automation.js -f path/to/text/file.txt

# Specify voice and vibe
node openai_fm_automation.js -v "Echo" -b "Friendly" "This is the text to convert"

# Run in headless mode
node openai_fm_automation.js -h -f path/to/text/file.txt
```

## How It Works

1. The script splits the input text into chunks of approximately 999 characters (the maximum allowed by OpenAI.fm)
2. It launches a browser and navigates to OpenAI.fm
3. For each chunk:
   - It pastes the chunk into the input field
   - Clicks the "Play" button
   - Waits for the audio to finish playing (when the button changes back to "Play")
   - Proceeds to the next chunk
4. Progress is displayed in the console

## Files

- `openai_fm_automation.js`: Main script file
- `text_splitter.js`: Module for splitting text into chunks

## License

ISC
