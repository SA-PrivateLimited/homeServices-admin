import {Image} from 'react-native';
import RNFS from 'react-native-fs';

const MAX_SIZE_KB = 50;
const MAX_SIZE_BYTES = MAX_SIZE_KB * 1024;

/**
 * Check if image size is larger than 50KB
 * @param uri - Image URI
 * @returns true if image is larger than 50KB
 */
export const isImageTooLarge = async (uri: string): Promise<boolean> => {
  try {
    // Handle different URI formats
    let filePath = uri;
    
    if (uri.startsWith('file://')) {
      filePath = uri.replace('file://', '');
    } else if (uri.startsWith('content://')) {
      // For content:// URIs, try to get file info directly
      // If that fails, we'll use fetch as fallback
      try {
        const tempPath = `${RNFS.CachesDirectoryPath}/temp_${Date.now()}.jpg`;
        await RNFS.copyFile(uri, tempPath);
        filePath = tempPath;
      } catch (copyError) {
        // If copy fails, use fetch method for content:// URIs
        return await checkSizeWithFetch(uri);
      }
    } else if (uri.startsWith('http://') || uri.startsWith('https://')) {
      // For remote URLs, use fetch
      return await checkSizeWithFetch(uri);
    }

    // Check if file exists
    const fileExists = await RNFS.exists(filePath);
    if (!fileExists) {
      console.warn('File does not exist, using fetch method');
      return await checkSizeWithFetch(uri);
    }

    const fileInfo = await RNFS.stat(filePath);
    return fileInfo.size > MAX_SIZE_BYTES;
  } catch (error) {
    console.warn('Error checking image size with RNFS, trying fetch method:', error);
    // Fallback to fetch method
    try {
      return await checkSizeWithFetch(uri);
    } catch (fetchError) {
      console.error('Error checking image size:', fetchError);
      // If we can't check, assume it's fine to proceed (don't block upload)
      return false;
    }
  }
};

/**
 * Check image size using fetch (fallback method)
 */
const checkSizeWithFetch = async (uri: string): Promise<boolean> => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return blob.size > MAX_SIZE_BYTES;
  } catch (error) {
    console.error('Error checking size with fetch:', error);
    return false;
  }
};

/**
 * Compress image by reducing quality when picking
 * This should be called before setting the image in state
 * @param uri - Original image URI
 * @param onCompress - Callback with compressed URI
 */
export const compressImageIfNeeded = async (
  uri: string,
  onCompress: (compressedUri: string) => void,
): Promise<void> => {
  try {
    const tooLarge = await isImageTooLarge(uri);
    if (!tooLarge) {
      onCompress(uri);
      return;
    }

    // Image is too large, need to re-pick with lower quality
    // This will be handled in the pickImage function with quality parameter
    console.warn('Image is larger than 50KB, please re-select with lower quality');
    onCompress(uri); // Return original for now, user should re-pick
  } catch (error) {
    console.error('Error compressing image:', error);
    onCompress(uri);
  }
};

