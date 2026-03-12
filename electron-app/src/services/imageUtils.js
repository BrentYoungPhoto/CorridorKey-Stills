/**
 * Image utility functions for encoding/decoding between formats.
 */

/**
 * Convert a base64-encoded PNG string to an HTMLImageElement.
 * @param {string} base64Png - Base64 string (without data: prefix)
 * @returns {Promise<HTMLImageElement>}
 */
export function base64ToImage(base64Png) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `data:image/png;base64,${base64Png}`;
  });
}

/**
 * Read a File as a data URL string.
 * @param {File} file
 * @returns {Promise<string>}
 */
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Get image dimensions from a File.
 * @param {File} file
 * @returns {Promise<{width: number, height: number}>}
 */
export async function getImageDimensions(file) {
  const url = await fileToDataUrl(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Download a base64-encoded image as a file.
 * @param {string} base64Data - Base64 string
 * @param {string} filename - Download filename
 */
export function downloadBase64Image(base64Data, filename) {
  const link = document.createElement("a");
  link.href = `data:image/png;base64,${base64Data}`;
  link.download = filename;
  link.click();
}
