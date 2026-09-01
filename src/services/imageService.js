import imageCompression from 'browser-image-compression';
import { deleteObject, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../firebase/config';

export const IMAGE_MAX_BYTES = 1_000_000;
export const SUPPORTED_IMAGE_TYPES = Object.freeze(['image/jpeg', 'image/png', 'image/webp']);
export const SUPPORTED_SOURCE_IMAGE_TYPES = Object.freeze([
  ...SUPPORTED_IMAGE_TYPES,
  'image/heic',
  'image/heif',
]);

const STANDARD_COMPRESSION_OPTIONS = Object.freeze({
  maxSizeMB: 0.95,
  maxWidthOrHeight: 1600,
  initialQuality: 0.8,
  useWebWorker: true,
});

const FALLBACK_COMPRESSION_OPTIONS = Object.freeze({
  maxSizeMB: 0.8,
  maxWidthOrHeight: 1400,
  initialQuality: 0.75,
  useWebWorker: true,
});

function isHeicFile(file) {
  const type = file?.type?.toLowerCase();
  return type === 'image/heic'
    || type === 'image/heif'
    || /\.(heic|heif)$/i.test(file?.name ?? '');
}

function isSupportedSourceImage(file) {
  return Boolean(file) && (
    SUPPORTED_SOURCE_IMAGE_TYPES.includes(file.type?.toLowerCase())
    || isHeicFile(file)
  );
}

async function defaultHeicConverter(options) {
  const module = await import('heic2any');
  return module.default(options);
}

async function convertHeicToJpeg(file, heicConverter) {
  const converted = await heicConverter({
    blob: file,
    toType: 'image/jpeg',
    quality: 0.9,
  });
  const blob = Array.isArray(converted) ? converted[0] : converted;

  if (!blob || typeof blob.size !== 'number') {
    throw new Error('HEIC conversion returned no image');
  }

  const jpegName = (file.name || 'photo.heic').replace(/\.(heic|heif)$/i, '.jpg');
  return new File([blob], jpegName, {
    type: 'image/jpeg',
    lastModified: file.lastModified,
  });
}

export function validateImageFile(file) {
  if (!file || !SUPPORTED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: 'Please select a supported image file (JPEG, PNG, or WebP).' };
  }
  if (file.size > IMAGE_MAX_BYTES) {
    return { valid: false, error: 'Image must be 1 MB or smaller after compression.' };
  }
  return { valid: true, error: null };
}

export async function prepareImage(
  file,
  {
    compressor = imageCompression,
    heicConverter = defaultHeicConverter,
  } = {},
) {
  if (!isSupportedSourceImage(file)) {
    throw new Error('Please select a supported image file (JPEG, PNG, WebP, HEIC, or HEIF).');
  }

  try {
    const source = isHeicFile(file)
      ? await convertHeicToJpeg(file, heicConverter)
      : file;
    const fileType = SUPPORTED_IMAGE_TYPES.includes(source.type)
      ? source.type
      : 'image/jpeg';
    const compressed = await compressor(source, {
      ...STANDARD_COMPRESSION_OPTIONS,
      fileType,
    });
    const firstValidation = validateImageFile(compressed);

    if (firstValidation.valid) return compressed;

    const fallback = await compressor(compressed, {
      ...FALLBACK_COMPRESSION_OPTIONS,
      fileType,
    });
    const fallbackValidation = validateImageFile(fallback);

    if (!fallbackValidation.valid) throw new Error(fallbackValidation.error);
    return fallback;
  } catch (error) {
    throw new Error(`Image processing failed: ${error?.message ?? 'unknown error'}`, {
      cause: error,
    });
  }
}

export function compressImage(file) {
  return prepareImage(file);
}

export async function uploadPreparedImage(path, preparedFile) {
  const validation = validateImageFile(preparedFile);
  if (!validation.valid) throw new Error(validation.error);
  const objectRef = ref(storage, path);
  const snapshot = await uploadBytes(objectRef, preparedFile, { contentType: preparedFile.type });
  return { path: snapshot.ref.fullPath };
}

export async function uploadManagedImage(path, file) {
  const compressed = await prepareImage(file);
  // Persist only the object path. Download-token URLs are bearer credentials and
  // would allow anyone holding the URL to bypass Storage Rules.
  return uploadPreparedImage(path, compressed);
}

export function deleteManagedImage(path) {
  return deleteObject(ref(storage, path));
}
