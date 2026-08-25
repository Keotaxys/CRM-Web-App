import imageCompression from 'browser-image-compression';
import { deleteObject, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../firebase/config';

export const IMAGE_MAX_BYTES = 1_000_000;
export const SUPPORTED_IMAGE_TYPES = Object.freeze(['image/jpeg', 'image/png', 'image/webp']);

export function validateImageFile(file) {
  if (!file || !SUPPORTED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: 'Please select a supported image file (JPEG, PNG, or WebP).' };
  }
  if (file.size > IMAGE_MAX_BYTES) {
    return { valid: false, error: 'Image must be 1 MB or smaller after compression.' };
  }
  return { valid: true, error: null };
}

export async function compressImage(file) {
  if (!SUPPORTED_IMAGE_TYPES.includes(file?.type)) throw new Error('Unsupported image type');
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1280,
    useWebWorker: true,
    fileType: file.type,
  });
  const validation = validateImageFile(compressed);
  if (!validation.valid) throw new Error(validation.error);
  return compressed;
}

export async function uploadManagedImage(path, file) {
  const compressed = await compressImage(file);
  const objectRef = ref(storage, path);
  const snapshot = await uploadBytes(objectRef, compressed, { contentType: compressed.type });
  // Persist only the object path. Download-token URLs are bearer credentials and
  // would allow anyone holding the URL to bypass Storage Rules.
  return { path: snapshot.ref.fullPath };
}

export function deleteManagedImage(path) {
  return deleteObject(ref(storage, path));
}
