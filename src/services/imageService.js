import imageCompression from 'browser-image-compression';

import {
  deleteObject,
  ref,
  uploadBytesResumable,
} from 'firebase/storage';

import { storage } from '../firebase/config';

export const IMAGE_MAX_BYTES = 5_000_000;

export const SUPPORTED_IMAGE_TYPES = Object.freeze([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export const SUPPORTED_SOURCE_IMAGE_TYPES = Object.freeze([
  ...SUPPORTED_IMAGE_TYPES,
  'image/heic',
  'image/heif',
]);

const COMPRESSION_OPTIONS = Object.freeze({
  maxSizeMB: 4.5,
  maxWidthOrHeight: 1800,
  initialQuality: 0.82,
  useWebWorker: true,
});

function isHeicFile(file) {
  const type = file?.type?.toLowerCase();

  return type === 'image/heic'
    || type === 'image/heif'
    || /\.(heic|heif)$/i.test(file?.name ?? '');
}

function isSupportedSourceImage(file) {
  const type = file?.type?.toLowerCase();

  return Boolean(file) && (
    SUPPORTED_SOURCE_IMAGE_TYPES.includes(type)
    || isHeicFile(file)
  );
}

async function defaultHeicConverter(options) {
  const module = await import('heic2any');
  return module.default(options);
}

async function convertHeicToJpeg(
  file,
  heicConverter,
) {
  const converted = await heicConverter({
    blob: file,
    toType: 'image/jpeg',
    quality: 0.9,
  });

  const blob = Array.isArray(converted)
    ? converted[0]
    : converted;

  if (!blob || typeof blob.size !== 'number') {
    throw new Error(
      'HEIC conversion returned no image',
    );
  }

  const jpegName = (
    file.name || 'photo.heic'
  ).replace(
    /\.(heic|heif)$/i,
    '.jpg',
  );

  return new File(
    [blob],
    jpegName,
    {
      type: 'image/jpeg',
      lastModified: file.lastModified,
    },
  );
}

export function validateImageFile(file) {
  if (
    !file
    || !SUPPORTED_IMAGE_TYPES.includes(
      file.type?.toLowerCase(),
    )
  ) {
    return {
      valid: false,
      error:
        'Please select a supported image file (JPEG, PNG, or WebP).',
    };
  }

  if (file.size > IMAGE_MAX_BYTES) {
    return {
      valid: false,
      error:
        'Image must be 5 MB or smaller after compression.',
    };
  }

  return {
    valid: true,
    error: null,
  };
}

export async function prepareImage(
  file,
  {
    compressor = imageCompression,
    heicConverter = defaultHeicConverter,
  } = {},
) {
  if (!isSupportedSourceImage(file)) {
    throw new Error(
      'Please select a supported image file (JPEG, PNG, WebP, HEIC, or HEIF).',
    );
  }

  try {
    const source = isHeicFile(file)
      ? await convertHeicToJpeg(
        file,
        heicConverter,
      )
      : file;

    /*
     * Fast path:
     *
     * If the image is already in a Storage-safe format
     * and is within the 2.5 MB budget, upload it as-is.
     *
     * This avoids an unnecessary browser decode,
     * canvas resize and JPEG/WebP encode cycle.
     */
    const directValidation =
      validateImageFile(source);

    if (directValidation.valid) {
      return source;
    }

    const fileType =
      SUPPORTED_IMAGE_TYPES.includes(
        source.type?.toLowerCase(),
      )
        ? source.type.toLowerCase()
        : 'image/jpeg';

    /*
     * Oversized images get one compression pass only.
     * Do not repeatedly encode toward a sub-1 MB target.
     */
    const compressed = await compressor(
      source,
      {
        ...COMPRESSION_OPTIONS,
        fileType,
      },
    );

    const validation =
      validateImageFile(compressed);

    if (!validation.valid) {
      throw new Error(
        validation.error,
      );
    }

    return compressed;
  } catch (error) {
    throw new Error(
      `Image processing failed: ${
        error?.message ?? 'unknown error'
      }`,
      {
        cause: error,
      },
    );
  }
}

export function compressImage(file) {
  return prepareImage(file);
}

export async function uploadPreparedImage(
  path,
  preparedFile,
) {
  const validation =
    validateImageFile(preparedFile);

  if (!validation.valid) {
    throw new Error(
      validation.error,
    );
  }

  const objectRef = ref(
    storage,
    path,
  );

  const snapshot =
    await uploadBytesResumable(
      objectRef,
      preparedFile,
      {
        contentType:
          preparedFile.type,
      },
    );

  return {
    path: snapshot.ref.fullPath,
  };
}

export async function uploadManagedImage(
  path,
  file,
) {
  const prepared =
    await prepareImage(file);

  // Persist only the managed Storage object path.
  // Download-token URLs are bearer credentials.
  return uploadPreparedImage(
    path,
    prepared,
  );
}

export function deleteManagedImage(path) {
  return deleteObject(
    ref(storage, path),
  );
}
