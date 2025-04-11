const puppeteer = require('puppeteer'); // Puppeteer is used to capture screenshots of web pages.
const fs = require('fs'); // The 'fs' module allows us to work with file systems (read/write files).
const fsExtra = require('fs-extra'); // 'fs-extra' is an extension of 'fs' that adds more features, like ensuring a directory exists.
const { PNG } = require('pngjs'); // 'pngjs' is used for reading and manipulating PNG images.
const pixelmatch = require('pixelmatch').default || require('pixelmatch'); // 'pixelmatch' compares two images pixel by pixel and highlights differences.


// Function to capture a full-page screenshot of a given URL and save it to a file
const captureScreenshot = async (url, filePath) => {
    const browser = await puppeteer.launch(); // Launch a new headless browser instance.
    const page = await browser.newPage(); // Open a new page in the browser.
  
    await page.goto(url, { waitUntil: 'networkidle0' }); // Go to the URL and wait until the page has fully loaded.
    await page.screenshot({ path: filePath, fullPage: true }); // Take a full-page screenshot and save it to the file path.
    await browser.close(); // Close the browser when done.
  };
  

// Function to compare two PNG images and save the diff image
const compareImages = (pathA, pathB, diffPath) => {
    const imgA = PNG.sync.read(fs.readFileSync(pathA)); // Read image A from the file system.
    const imgB = PNG.sync.read(fs.readFileSync(pathB)); // Read image B from the file system.
  
    // Get the maximum width and height of both images to accommodate padding.
    const maxWidth = Math.max(imgA.width, imgB.width);
    const maxHeight = Math.max(imgA.height, imgB.height);
  
    // Create new blank images of the maximum size (white background).
    const paddedA = new PNG({ width: maxWidth, height: maxHeight });
    const paddedB = new PNG({ width: maxWidth, height: maxHeight });
  
    // Fill the new blank images with white (optional: change to transparent if desired).
    paddedA.data.fill(255);
    paddedB.data.fill(255);
  
    // Copy image A into the padded version at the top-left corner.
    PNG.bitblt(imgA, paddedA, 0, 0, imgA.width, imgA.height, 0, 0);
  
    // Copy image B into the padded version at the top-left corner.
    PNG.bitblt(imgB, paddedB, 0, 0, imgB.width, imgB.height, 0, 0);
  
    // Create a blank image to store the differences between the two images.
    const diff = new PNG({ width: maxWidth, height: maxHeight });
  
    // Compare the padded images and generate the diff image.
    const numDiffPixels = pixelmatch(
      paddedA.data, // Image A data
      paddedB.data, // Image B data
      diff.data, // Where to store the diff result
      maxWidth, // Width of the diff image
      maxHeight, // Height of the diff image
      { threshold: 0.1 } // Sensitivity of the comparison (0.1 means small differences are detected)
    );
  
    // Write the diff image to a file.
    fs.writeFileSync(diffPath, PNG.sync.write(diff));
  
    return numDiffPixels; // Return the number of pixels that differ.
  };
  
  
// Main function to drive the process
const main = async () => {
    // Read URLs from command line arguments (e.g., 'node compare-urls.js <urlA> <urlB>').
    const urlA = process.argv[2]; // First URL to capture.
    const urlB = process.argv[3]; // Second URL to capture.
  
    // Validate input. If URLs are missing, display an error message and exit the process.
    if (!urlA || !urlB) {
      console.error('Usage: node compare-urls.js <urlA> <urlB>');
      process.exit(1); // Exit the program if URLs are not provided.
    }
  
    // Ensure the output folder exists (using 'fs-extra' for convenience).
    await fsExtra.ensureDir('output');
  
    // Define file paths for screenshots and the diff image.
    const pathA = 'output/urlA.png'; // Path to save the screenshot of URL A.
    const pathB = 'output/urlB.png'; // Path to save the screenshot of URL B.
    const diffPath = 'output/diff.png'; // Path to save the diff image.
  
    // Log that URL A is being captured.
    console.log(`Capturing URL A: ${urlA}`);
    await captureScreenshot(urlA, pathA); // Capture the screenshot for URL A.
  
    // Log that URL B is being captured.
    console.log(`Capturing URL B: ${urlB}`);
    await captureScreenshot(urlB, pathB); // Capture the screenshot for URL B.
  
    // Log that the comparison is starting.
    console.log('Comparing screenshots...');
    const diffPixels = compareImages(pathA, pathB, diffPath); // Compare the two screenshots.
  
    // Output the result: how many pixels differ and where the diff is saved.
    console.log(`✅ Done. ${diffPixels} pixels different.`);
    console.log(`🖼️ Diff saved to ${diffPath}`);
  };
  
  // Run the main function.
  main();
  