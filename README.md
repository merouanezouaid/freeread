# FreeRead

freeread is a command-line tool that reads long pieces of text out loud using OpenAI.fm.
it takes your input: a sentence or an entire essay, and turns it into a clean audio playback, chunk by chunk.

no more character limit errors. no more awkward copy-pasting. just plug in your text and let FreeRead handle the rest.

![demo](demo.gif)
(integrated in freewrite windows version soon)

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

1.  **Prerequisites:**
    *   Node.js (which includes npm) installed.
    *   `ffmpeg` installed and accessible in your system's PATH (required only for the `--download` option with MP3 merging). Download from [ffmpeg.org](https://ffmpeg.org/download.html).
2.  **Install the package:**
    *   **From local source:** If you have cloned the repository, navigate to the project directory in your terminal and run:
        ```bash
        npm install -g .
        ```
    *   **(Optional) From npm (if published):** If this package were published to the npm registry under the name `freeread`, you would install it using:
        ```bash
        npm install -g freeread
        ```

## Usage

Once installed globally, you can run the command `freeread` from any directory:

```bash
freeread [options] <text or file path>
```

### Options

- `--file, -f`: Treat the input as a file path instead of direct text
- `--headless, -h`: Run in headless mode (no browser UI)
- `--voice, -v`: Specify the voice to use (default: Coral)
- `--vibe, -b`: Specify the vibe to use (default: Calm)
- `--download, -d`: Download audio chunks and combine them into `combined_output.mp3` (requires ffmpeg). If not used, audio is played directly.
- `--help`: Show help message

### Examples

```bash
# Convert direct text to speech and play it
freeread "This is the text to convert to speech"

# Convert text from a file and play it
freeread -f path/to/text/file.txt

# Specify voice and vibe, play the audio
freeread -v "Echo" -b "Friendly" "This is the text to convert"

# Convert text from a file, download chunks, and combine to a timestamped mp3
freeread -d -f path/to/text/file.txt

# Run headless, download and combine audio from a file
freeread -h -d -f path/to/text/file.txt
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

- `freeread.js`: Main script file
- `text_splitter.js`: Module for splitting text into chunks

## License

MIT
