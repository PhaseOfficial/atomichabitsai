import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';

const SUPABASE_STORAGE_URL = 'https://xhkkjelhmvepsouuibvs.supabase.co/storage/v1/object/public/books';

export const getDocumentDirectory = () => {
  return FileSystem.documentDirectory || '';
};

/**
 * Resolves a file URI that might be stored as an absolute path or a relative path.
 * In iOS, absolute paths change between app launches due to the container UUID changing.
 * This utility ensures we always use the current document directory.
 */
export const resolveFileUri = (uri: string | null | undefined): string => {
  if (!uri) return '';
  
  // If it's already a full URL or a resolved file path
  if (uri.startsWith('http') || uri.startsWith('file://') || uri.startsWith('content://')) {
    // If it's an absolute path but might be stale (iOS container ID change)
    if (uri.startsWith('file:///')) {
        const docDir = getDocumentDirectory();
        const booksMatch = uri.match(/\/books\/.+$/);
        if (booksMatch && docDir) {
            const relativePath = booksMatch[0].startsWith('/') ? booksMatch[0].substring(1) : booksMatch[0];
            return `${docDir}${relativePath}`;
        }
    }
    return uri;
  }

  const docDir = getDocumentDirectory();
  
  if (docDir) {
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
    
    return uri.startsWith('/') ? `file://${uri}` : uri;
  }

  // Fallback to Supabase Storage if local directory is not available (e.g. web or init issue)
  let remotePath = uri;
  if (uri.startsWith('books/')) {
    remotePath = uri.replace('books/', '');
  } else if (uri.startsWith('/books/')) {
    remotePath = uri.replace('/books/', '');
  }
  
  return `${SUPABASE_STORAGE_URL}/${remotePath}`;
};

/**
 * Ensures a book is available locally by downloading it from Supabase if missing.
 */
export const downloadBook = async (relativeUri: string): Promise<string> => {
    const docDir = getDocumentDirectory();
    if (!docDir) throw new Error('Document directory not available');

    const localUri = resolveFileUri(relativeUri);
    const fileInfo = await FileSystem.getInfoAsync(localUri);

    if (fileInfo.exists) {
        return localUri;
    }

    // Create directory if it doesn't exist
    const dirPath = localUri.substring(0, localUri.lastIndexOf('/'));
    await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });

    // Construct download URL
    let remotePath = relativeUri;
    if (relativeUri.startsWith('books/')) {
        remotePath = relativeUri.replace('books/', '');
    } else if (relativeUri.startsWith('/books/')) {
        remotePath = relativeUri.replace('/books/', '');
    }

    // Try to get a signed URL first (in case the bucket is private)
    let downloadUrl = '';
    const { data: signedData, error: signedError } = await supabase.storage.from('books').createSignedUrl(remotePath, 3600);
    
    if (signedError) {
        console.error('[downloadBook] Signed URL error:', signedError);
    }

    if (signedData?.signedUrl) {
        downloadUrl = signedData.signedUrl;
    } else {
        // Fallback to public URL
        const { data: publicData } = supabase.storage.from('books').getPublicUrl(remotePath);
        downloadUrl = publicData.publicUrl;
    }

    console.log('[downloadBook] Downloading from:', downloadUrl);
    console.log('[downloadBook] To:', localUri);

    try {
        const downloadRes = await FileSystem.downloadAsync(downloadUrl, localUri);
        
        if (downloadRes.status !== 200) {
            // Clean up the potentially empty/corrupted file
            await FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {});
            throw new Error(`Download failed with status ${downloadRes.status}`);
        }
    } catch (e: any) {
        console.error('[downloadBook] Download error:', e);
        throw e;
    }

    return localUri;
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
