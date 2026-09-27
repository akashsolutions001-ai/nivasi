/**
 * Cloudinary Upload Utility
 *
 * Uploads images directly to Cloudinary using an unsigned upload preset.
 * No API Secret is used — safe to run entirely in the browser.
 *
 * Config is read from Vite environment variables:
 *   VITE_CLOUDINARY_CLOUD_NAME
 *   VITE_CLOUDINARY_UPLOAD_PRESET
 */

// Read from Vite env
export const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'hrluf2ir';
export const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'nivasispace_rooms';


// Allowed image MIME types
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// Max file size: 5 MB
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

// Max images per room
export const MAX_ROOM_IMAGES = 5;

/**
 * Validates a file before uploading.
 * @param {File} file
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateImageFile(file) {
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Image must be JPG, JPEG, PNG or WEBP and must be smaller than 5 MB.'
    };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: 'Image must be JPG, JPEG, PNG or WEBP and must be smaller than 5 MB.'
    };
  }
  return { valid: true };
}

/**
 * Uploads a single File to Cloudinary via the unsigned upload API.
 *
 * @param {File} file - The image file to upload
 * @param {function(number): void} [onProgress] - Optional progress callback (0-100)
 * @returns {Promise<Object>} Resolved with upload result
 */
export async function uploadImageToCloudinary(file, onProgress) {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      'Cloudinary is not configured. Please set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in your .env file.'
    );
  }

  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

  console.log('[Cloudinary] Uploading to:', endpoint, '| Preset:', UPLOAD_PRESET);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint);

    if (onProgress && xhr.upload) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      });
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        let data;
        try {
          data = JSON.parse(xhr.responseText);
        } catch {
          reject(new Error('Invalid response from Cloudinary.'));
          return;
        }
        resolve({
          url: data.secure_url,
          publicId: data.public_id,
          originalName: data.original_filename || file.name,
          format: data.format,
          resourceType: data.resource_type,
          bytes: data.bytes,
          width: data.width,
          height: data.height,
          storage: 'cloudinary'
        });
      } else {
        let errMessage = `Cloudinary upload failed (HTTP ${xhr.status}).`;
        try {
          const errData = JSON.parse(xhr.responseText);
          if (errData && errData.error && errData.error.message) {
            const rawMsg = errData.error.message;
            if (rawMsg.toLowerCase().includes('upload preset not found')) {
              errMessage = `Upload preset "${UPLOAD_PRESET}" not found on Cloudinary account "${CLOUD_NAME}". Ensure the preset is created in Cloudinary (Settings > Upload > Upload Presets) and set to "Unsigned".`;
            } else if (rawMsg.toLowerCase().includes('unknown api key') || rawMsg.toLowerCase().includes('invalid cloud_name')) {
              errMessage = `Cloudinary cloud name "${CLOUD_NAME}" is invalid. Please verify VITE_CLOUDINARY_CLOUD_NAME in .env.`;
            } else {
              errMessage = rawMsg;
            }
          }
        } catch {
          // ignore parse error
        }
        reject(new Error(errMessage));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error during Cloudinary upload. Please check your connection and try again.'));
    };

    xhr.ontimeout = () => {
      reject(new Error('Cloudinary upload timed out. Please try again.'));
    };

    xhr.timeout = 60000;
    xhr.send(formData);
  });
}

/**
 * Uploads multiple files to Cloudinary sequentially.
 * @param {File[]} files
 * @param {function(number, number): void} [onFileProgress] - Called with (uploadedCount, totalCount)
 * @returns {Promise<Object[]>}
 */
export async function uploadMultipleImagesToCloudinary(files, onFileProgress) {
  const results = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const result = await uploadImageToCloudinary(file);

    results.push(result);
    if (onFileProgress) {
      onFileProgress(i + 1, files.length);
    }
  }
  return results;
}

/**
 * Normalizes an image value from Firestore into a displayable URL string.
 * Supports both old format (plain URL string) and new format (Cloudinary metadata object).
 * Filters out dead blob URLs and invalid placeholder endpoints.
 *
 * @param {string|{url: string}|null|undefined} image
 * @returns {string|null}
 */
export function getImageUrl(image) {
  if (!image) return null;
  let url = null;
  if (typeof image === 'string') url = image;
  else if (typeof image === 'object' && image.url) url = image.url;

  if (!url || typeof url !== 'string') return null;

  // Filter out dummy/mock placeholders that 404
  if (url.includes('/api/placeholder') || url.includes('api/placeholder')) {
    return null;
  }

  // Filter out dead blob: URLs saved in database from previous browser sessions
  // Browsers block loading cross-session or external blob URLs ("Not allowed to load local resource")
  if (url.startsWith('blob:')) {
    return null;
  }

  return url;
}

/**
 * Returns an optimized Cloudinary URL. Falls back for non-Cloudinary URLs.
 *
 * @param {string|{url: string}|null|undefined} image
 * @param {number} [width=800] - Target width in pixels
 * @returns {string|null}
 */
export function getOptimizedImageUrl(image, width = 800) {
  const url = getImageUrl(image);
  if (!url) return null;

  if (url.includes('res.cloudinary.com')) {
    return url.replace('/upload/', `/upload/w_${width},c_limit,f_auto,q_auto/`);
  }
  return url;
}

/**
 * Returns all displayable image URLs from a room's images array.
 * Handles mixed arrays of strings and objects.
 *
 * @param {Array} images
 * @returns {string[]}
 */
export function getRoomImageUrls(images) {
  if (!Array.isArray(images)) return [];
  return images.map(getImageUrl).filter(Boolean);
}
