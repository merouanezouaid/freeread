#!/usr/bin/env node

/**
 * OpenAI.fm Automation Script
 * 
 * This script automates the usage of openai.fm to play long texts in chunks.
 * It splits the input text into chunks that don't exceed the character limit,
 * then sequentially plays each chunk using the website's play button.
 * It ensures chunks end at paragraph or sentence boundaries when possible.
 */

const { chromium } = require('playwright');
const { splitText } = require('./text_splitter');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { exec } = require('child_process');

/**
 * Downloads audio from OpenAI.fm API URL
 * @param {string} url - The API URL to download from
 * @param {string} outputPath - Path to save the audio file
 * @returns {Promise} Promise that resolves when download completes
 */
function downloadAudio(url, outputPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(outputPath);
      reject(err);
    });
  });
}

/**
 * Splits text into chunks at paragraph/sentence boundaries
 * @param {string} text - Text to split
 * @param {number} maxChars - Maximum characters per chunk
 * @returns {string[]} Array of text chunks
 */
function splitTextAtBoundaries(text, maxChars = 999) {
  if (text.length <= maxChars) {
    return [text];
  }

  const chunks = [];
  let remainingText = text;

  while (remainingText.length > 0) {
    let chunkEnd = maxChars;

    if (remainingText.length <= maxChars) {
      chunks.push(remainingText);
      break;
    }

    // Try to find paragraph break first
    let paragraphEnd = remainingText.substring(0, maxChars).lastIndexOf('\n\n');
    
    // If no paragraph break, try to find sentence end
    let sentenceEnd = -1;
    if (paragraphEnd === -1) {
      const sentenceEndings = ['. ', '! ', '? '];
      sentenceEnd = Math.max(...sentenceEndings.map(ending => 
        remainingText.substring(0, maxChars).lastIndexOf(ending)
      ));
    }

    // If neither found, find last space
    if (paragraphEnd === -1 && sentenceEnd === -1) {
      while (chunkEnd > 0 && remainingText[chunkEnd] !== ' ') {
        chunkEnd--;
      }
      
      // If no space found, force split at max chars
      if (chunkEnd === 0) {
        chunkEnd = maxChars;
      }
    } else {
      // Use paragraph end if found, otherwise sentence end
      chunkEnd = paragraphEnd !== -1 ? paragraphEnd + 2 : sentenceEnd + 2;
    }

    const chunk = remainingText.substring(0, chunkEnd).trim();
    chunks.push(chunk);
    remainingText = remainingText.substring(chunkEnd).trim();
  }

  return chunks;
}

/**
 * Main function to automate openai.fm text-to-speech
 * @param {string} text - The full text to process
 * @param {Object} options - Configuration options
 */
async function automateOpenAIFM(text, options = {}) {
  const { headless = false, voice = 'Coral', vibe = 'Calm', download = false } = options;
  
  console.log('Starting OpenAI.fm automation...');
  
  // Split text into chunks at natural boundaries
  const chunks = splitTextAtBoundaries(text);
  console.log(`Split text into ${chunks.length} chunks`);
  
  // Launch browser
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const audioUrls = [];
  const downloadedFilePaths = [];
  
  try {
    // Navigate to openai.fm
    console.log('Navigating to openai.fm...');
    await page.goto('https://www.openai.fm/');
    
    // Select voice if specified
    if (voice) {
      console.log(`Selecting voice: ${voice}`);
      const voiceSelector = page.locator(`div[role="button"]:has(span:text-is("${voice}"))`).first();
      await voiceSelector.click();
    }
    
    // Select vibe if specified
    if (vibe) {
      console.log(`Selecting vibe: ${vibe}`);
      try {
      const customVibe = "Delivery: Exaggerated and theatrical, with dramatic pauses, sudden outbursts, and gleeful cackling.\n\nVoice: High-energy, eccentric, and slightly unhinged, with a manic enthusiasm that rises and falls unpredictably.\n\nTone: Excited, chaotic, and grandiose, as if reveling in the brilliance of a mad experiment.\n\nPronunciation: Sharp and expressive, with elongated vowels, sudden inflections, and an emphasis on big words to sound more diabolical.";
      const vibeTextArea = page.locator('textarea').first();
      await vibeTextArea.click();
      await vibeTextArea.fill(customVibe);
      } catch (error) {
        // If vibe not found, input custom vibe text
        console.log('Custom vibe being used...');
        const customVibe = "Delivery: Exaggerated and theatrical, with dramatic pauses, sudden outbursts, and gleeful cackling.\n\nVoice: High-energy, eccentric, and slightly unhinged, with a manic enthusiasm that rises and falls unpredictably.\n\nTone: Excited, chaotic, and grandiose, as if reveling in the brilliance of a mad experiment.\n\nPronunciation: Sharp and expressive, with elongated vowels, sudden inflections, and an emphasis on big words to sound more diabolical.";
        const vibeTextArea = page.locator('textarea').first();
        await vibeTextArea.click();
        await vibeTextArea.fill(customVibe);
      }
    }

    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`\nProcessing chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);
      
      // Clear existing text and input new chunk
      const textArea = page.locator('textarea').nth(1);
      await textArea.click();
      await textArea.fill(chunk);
      
      // Add listeners to log requests
      console.log('Setting up network listeners...');
      const requestListener = request => console.log(`>> Request: ${request.method()} ${request.url()}`);
      const responseListener = response => console.log(`<< Response: ${response.status()} ${response.url()}`);
      page.on('request', requestListener);
      page.on('response', responseListener);

      // Click play button
      console.log('Playing audio...');
      const playButton = page.locator('div[role="button"]:has(span:text-is("Play"))').first();
      // Start waiting for the request *before* clicking
      const apiRequestPromise = page.waitForRequest(request => 
        request.url().startsWith('https://www.openai.fm/api/generate'),
        { timeout: 60000 }
      );
      await playButton.click();

      // Capture API request URL
      try {
        const apiRequest = await apiRequestPromise;
        console.log(`Captured API request: ${apiRequest.url()}`);
        audioUrls.push(apiRequest.url());
      } catch (e) {
        console.error(`Failed to capture API request for chunk ${i + 1}:`, e);
      } finally {
         // Remove listeners
         console.log('Removing network listeners...');
         page.off('request', requestListener);
         page.off('response', responseListener);
      }

      // Wait for the play button to change to stop
      console.log('Waiting for Stop button...');
      await page.locator('div[role="button"]:has(span:text-is("Stop"))').first().waitFor({ timeout: 60000 });
      console.log('Stop button appeared.');
      
      // Wait for audio to finish (button changes back to "Play")
      console.log('Waiting for audio to complete (Play button)...');
      await page.locator('div[role="button"]:has(span:text-is("Play"))').first().waitFor({ timeout: 180000 });
      console.log('Play button reappeared.');

      console.log(`Chunk ${i + 1} completed`);
    }

    console.log('\nAll chunks processed.');

    // Download audio files if requested
    if (download && audioUrls.length > 0) {
      console.log('\nDownloading audio files...');
      for (let i = 0; i < audioUrls.length; i++) {
        try {
          const outputPath = path.resolve(`chunk_${i + 1}.mp3`);
          await downloadAudio(audioUrls[i], outputPath);
          console.log(`Downloaded chunk ${i + 1} to ${outputPath}`);
          downloadedFilePaths.push(outputPath);
        } catch (downloadError) {
           console.error(`Failed to download chunk ${i + 1} from ${audioUrls[i]}:`, downloadError);
        }
      }

      // Combine downloaded files if any were successful
      if (downloadedFilePaths.length > 0) {
        console.log('\nCombining downloaded MP3 files...');
        const outputCombinedFile = path.resolve('combined_output.mp3');
        const ffmpegInput = downloadedFilePaths.map(p => `${p.replace(/\\/g, '/')}`).join('|');
        const command = `ffmpeg -i "concat:${ffmpegInput}" -c copy "${outputCombinedFile}"`;

        console.log(`Executing: ${command}`);

        const execPromise = new Promise((resolve, reject) => {
          exec(command, (error, stdout, stderr) => {
            if (error) {
              console.error(`ffmpeg error: ${error.message}`);
              console.error(`ffmpeg stderr: ${stderr}`);
              reject(error);
              return;
            }
            console.log(`ffmpeg stdout: ${stdout}`);
            console.log(`Successfully combined files into ${outputCombinedFile}`);
            resolve();
          });
        });

        try {
          await execPromise;

          // Optional: Clean up individual chunk files
          console.log('Cleaning up chunk files...');
          for (const filePath of downloadedFilePaths) {
             try {
               fs.unlinkSync(filePath);
               console.log(`Deleted ${filePath}`);
             } catch (unlinkError) {
               console.error(`Failed to delete ${filePath}:`, unlinkError)
             }
          }
        } catch (combineError) {
          console.error('Failed to combine audio files.');
        }
      } else {
        console.log('No files were successfully downloaded to combine.');
      }
    } else if (download) {
        console.log('\nDownload requested, but no audio URLs were captured.');
    }

    console.log('\nAutomation finished successfully!');
    
  } catch (error) {
    console.error('Error during automation:', error);
  } finally {
    // Close browser
    if (browser) {
       await browser.close();
    }
  }
}

// Handle command line arguments if script is run directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  // Show usage if no arguments provided
  if (args.length === 0) {
    console.log(`
Usage: node openai_fm_automation.js [options] <text or file path>

Options:
  --file, -f       Treat the input as a file path instead of direct text
  --headless, -h   Run in headless mode (no browser UI)
  --voice, -v      Specify the voice to use (default: Coral)
  --vibe, -b       Specify the vibe to use (default: Calm)
  --download, -d   Download audio files instead of playing
  --help           Show this help message

Examples:
  node openai_fm_automation.js "This is the text to convert to speech"
  node openai_fm_automation.js -f path/to/text/file.txt
  node openai_fm_automation.js -v "Echo" -b "Friendly" "This is the text to convert"
  node openai_fm_automation.js -d -f journal.txt
    `);
    process.exit(0);
  }
  
  // Parse arguments
  let inputText = '';
  const options = {};
  let isFile = false;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help') {
      console.log(`
Usage: node openai_fm_automation.js [options] <text or file path>

Options:
  --file, -f       Treat the input as a file path instead of direct text
  --headless, -h   Run in headless mode (no browser UI)
  --voice, -v      Specify the voice to use (default: Coral)
  --vibe, -b       Specify the vibe to use (default: Calm)
  --download, -d   Download audio files instead of playing
  --help           Show this help message

Examples:
  node openai_fm_automation.js "This is the text to convert to speech"
  node openai_fm_automation.js -f path/to/text/file.txt
  node openai_fm_automation.js -v "Echo" -b "Friendly" "This is the text to convert"
  node openai_fm_automation.js -d -f journal.txt
      `);
      process.exit(0);
    } else if (arg === '--file' || arg === '-f') {
      isFile = true;
    } else if (arg === '--headless' || arg === '-h') {
      options.headless = true;
    } else if (arg === '--voice' || arg === '-v') {
      options.voice = args[++i];
    } else if (arg === '--vibe' || arg === '-b') {
      options.vibe = args[++i];
    } else if (arg === '--download' || arg === '-d') {
      options.download = true;
    } else {
      inputText = arg;
    }
  }
  
  // Read from file if specified
  if (isFile) {
    try {
      const filePath = path.resolve(inputText);
      inputText = fs.readFileSync(filePath, 'utf8');
      console.log(`Read ${inputText.length} characters from file: ${filePath}`);
    } catch (error) {
      console.error(`Error reading file: ${error.message}`);
      process.exit(1);
    }
  }
  
  // Run automation
  if (inputText) {
    automateOpenAIFM(inputText, options).catch(error => {
      console.error('Automation failed:', error);
      process.exit(1);
    });
  } else {
    console.error('No input text provided. Use --help for usage information.');
    process.exit(1);
  }
}

// Export for use as a module
module.exports = { automateOpenAIFM };
