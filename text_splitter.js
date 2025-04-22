/**
 * Text splitter function for OpenAI.fm
 * Splits text into chunks of approximately 999 characters without cutting words
 */

/**
 * Splits a long text into chunks that don't exceed the maximum character limit
 * @param {string} text - The full text to split
 * @param {number} maxChars - Maximum characters per chunk (default: 999)
 * @returns {string[]} Array of text chunks
 */
function splitText(text, maxChars = 999) {
  // If text is already within limit, return it as a single chunk
  if (text.length <= maxChars) {
    return [text];
  }

  const chunks = [];
  let remainingText = text;

  while (remainingText.length > 0) {
    let chunkEnd = maxChars;
    
    // If remaining text is shorter than max, use all of it
    if (remainingText.length <= maxChars) {
      chunks.push(remainingText);
      break;
    }
    
    // Find the last space before the character limit to avoid cutting words
    while (chunkEnd > 0 && remainingText[chunkEnd] !== ' ') {
      chunkEnd--;
    }
    
    // If no space found (very long word), force split at max chars
    if (chunkEnd === 0) {
      chunkEnd = maxChars;
    }
    
    // Add the chunk and remove it from remaining text
    const chunk = remainingText.substring(0, chunkEnd).trim();
    chunks.push(chunk);
    remainingText = remainingText.substring(chunkEnd).trim();
  }

  return chunks;
}

// Export the function for use in other modules
module.exports = { splitText };

// Example usage (for testing)
if (require.main === module) {
  const testText = "This is a test text that will be split into multiple chunks. " + 
                  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. " +
                  "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ".repeat(10);
  
  const chunks = splitText(testText);
  console.log(`Split text into ${chunks.length} chunks:`);
  chunks.forEach((chunk, index) => {
    console.log(`\nChunk ${index + 1} (${chunk.length} chars):`);
    console.log(chunk);
  });
}
