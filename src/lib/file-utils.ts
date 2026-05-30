import * as FileSystem from 'expo-file-system/legacy';

const getDocumentDirectory = () => {
  return FileSystem.documentDirectory || '';
};

/**
 * Resolves a file URI that might be stored as an absolute path or a relative path.
 * In iOS, absolute paths change between app launches due to the container UUID changing.
 * This utility ensures we always use the current document directory.
 */
export const resolveFileUri = (uri: string | null | undefined): string => {
  if (!uri) return '';
  
  const docDir = getDocumentDirectory();
  
  // If it's already a relative path (doesn't start with file:// or /)
  if (!uri.startsWith('file://') && !uri.startsWith('/')) {
    return `${docDir}${uri}`;
  }

  // If it's an absolute path, try to extract the relative part (books/...)
  // This handles stale paths from previous app containers on iOS
  const booksMatch = uri.match(/\/books\/.+$/);
  if (booksMatch) {
    const relativePath = booksMatch[0].startsWith('/') ? booksMatch[0].substring(1) : booksMatch[0];
    return `${docDir}${relativePath}`;
  }

  return uri;
};

/**
 * Gets the relative path for a file URI to be stored in the database.
 */
export const getRelativePath = (uri: string): string => {
  if (!uri) return '';
  
  const booksMatch = uri.match(/\/books\/.+$/);
  if (booksMatch) {
    return booksMatch[0].startsWith('/') ? booksMatch[0].substring(1) : booksMatch[0];
  }
  
  return uri;
};
