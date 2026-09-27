/**
 * CloudinaryImageUploader
 *
 * Reusable image uploader component that:
 * - Allows selecting up to MAX_ROOM_IMAGES (5) images
 * - Previews images before uploading
 * - Uploads directly to Cloudinary (unsigned)
 * - Supports adding, removing, and re-ordering existing images
 * - Works for both room owners and admins
 *
 * Props:
 *   existingImages  - Array of existing image values (URL strings or Cloudinary objects)
 *   onChange        - Called with the full updated images array (mixed old URLs + new objects)
 *   disabled        - Disables all interactions
 *   label           - Section label (default "Room Images")
 *   required        - Whether at least one image is required (shows asterisk)
 */

import { useState, useRef, useCallback } from 'react';
import { Upload, X, ImageIcon, Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import {
  validateImageFile,
  uploadImageToCloudinary,
  getImageUrl,
  CLOUD_NAME,
  UPLOAD_PRESET,
  MAX_ROOM_IMAGES
} from '../utils/cloudinaryUpload.js';

/**
 * Returns a display-friendly URL from a mixed image value.
 */
function resolveDisplayUrl(image) {
  if (!image) return null;
  // Blob preview from newly selected file
  if (image._previewUrl) return image._previewUrl;
  return getImageUrl(image);
}

const CloudinaryImageUploader = ({
  existingImages = [],
  onChange,
  disabled = false,
  label = 'Room Images',
  required = false
}) => {
  // Combined list of current images (existing + newly uploaded objects)
  // Filters out dead blob URLs and invalid placeholders from legacy documents
  const [images, setImages] = useState(() => existingImages.map((img) => {
    const validUrl = getImageUrl(img);
    if (!validUrl) return null;
    if (typeof img === 'string') return { _legacy: true, url: validUrl };
    if (img && typeof img === 'object') return { ...img, url: validUrl };
    return null;
  }).filter(Boolean));

  // Files the user has selected but not yet uploaded
  const [pendingFiles, setPendingFiles] = useState([]);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [uploadError, setUploadError] = useState('');
  const [validationError, setValidationError] = useState('');

  const fileInputRef = useRef(null);

  const totalCount = images.length + pendingFiles.length;
  const canAddMore = totalCount < MAX_ROOM_IMAGES && !disabled;
  const isCloudinaryConfigured = Boolean(CLOUD_NAME && UPLOAD_PRESET);

  // Sync internal state up to parent
  const notifyParent = useCallback((newImages) => {
    if (!onChange) return;
    // Convert internal representation back to a clean format for Firestore
    onChange(newImages.map((img) => {
      if (img._legacy) return img.url; // keep old URL strings as-is
      const { _previewUrl, _file, _legacy, ...clean } = img; // strip internal-only keys
      return clean;
    }));
  }, [onChange]);

  // Execute upload of pending files
  const executeUpload = async (filesToUpload) => {
    if (!filesToUpload || !filesToUpload.length) return;
    setIsUploading(true);
    setUploadError('');
    setUploadProgress({ current: 0, total: filesToUpload.length });

    const uploaded = [];
    const remainingPending = [...filesToUpload];

    for (let i = 0; i < filesToUpload.length; i++) {
      const pending = filesToUpload[i];
      try {
        const result = await uploadImageToCloudinary(pending._file);
        const imageObj = {
          ...result,
          uploadedAt: new Date().toISOString()
        };
        uploaded.push(imageObj);
        // Remove uploaded from pending
        remainingPending.shift();
        setUploadProgress({ current: i + 1, total: filesToUpload.length });
      } catch (err) {
        console.error('[Cloudinary Upload Error]', err);
        setUploadError(err.message || 'Image upload failed. Please try again.');
        setIsUploading(false);
        setPendingFiles(remainingPending);
        return;
      }
    }

    // Clean up preview URLs for succeeded uploads
    filesToUpload.forEach((pf) => {
      if (pf._previewUrl) URL.revokeObjectURL(pf._previewUrl);
    });

    const newImages = [...images, ...uploaded];
    setImages(newImages);
    setPendingFiles([]);
    setIsUploading(false);
    setUploadProgress({ current: 0, total: 0 });
    notifyParent(newImages);
  };

  const handleFileSelect = (e) => {
    setValidationError('');
    setUploadError('');
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // How many slots are still available
    const slotsLeft = MAX_ROOM_IMAGES - images.length;
    if (slotsLeft <= 0) {
      setValidationError(`Maximum ${MAX_ROOM_IMAGES} room images allowed.`);
      e.target.value = '';
      return;
    }

    const accepted = [];
    let firstError = '';

    for (const file of files) {
      if (accepted.length >= slotsLeft) {
        firstError = `Maximum ${MAX_ROOM_IMAGES} room images allowed.`;
        break;
      }
      const validation = validateImageFile(file);
      if (!validation.valid) {
        firstError = validation.error;
        continue;
      }
      // Check for duplicates by name+size
      const isDuplicate = pendingFiles.some(
        (pf) => pf.name === file.name && pf.size === file.size
      );
      if (isDuplicate) continue;

      accepted.push(file);
    }

    if (firstError) setValidationError(firstError);
    if (!accepted.length) {
      e.target.value = '';
      return;
    }

    // Create preview URLs
    const withPreviews = accepted.map((file) => ({
      _file: file,
      _previewUrl: URL.createObjectURL(file),
      name: file.name,
      size: file.size
    }));

    setPendingFiles((prev) => [...prev, ...withPreviews]);
    e.target.value = '';

    // Automatically begin upload
    executeUpload([...pendingFiles, ...withPreviews]);
  };

  const removePendingFile = (index) => {
    setPendingFiles((prev) => {
      const item = prev[index];
      if (item._previewUrl) URL.revokeObjectURL(item._previewUrl);
      return prev.filter((_, i) => i !== index);
    });
    setValidationError('');
    setUploadError('');
  };

  const removeUploadedImage = (index) => {
    const updated = images.filter((_, i) => i !== index);
    setImages(updated);
    notifyParent(updated);
  };

  const handleRetryUpload = () => {
    if (pendingFiles.length > 0) {
      executeUpload(pendingFiles);
    }
  };

  return (
    <div className="space-y-3">
      {/* Label */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          <ImageIcon className="w-4 h-4 inline mr-1" />
          {label}{required && ' *'}
        </label>
        <span className="text-xs text-gray-500">
          {totalCount}/{MAX_ROOM_IMAGES} images
        </span>
      </div>

      {/* Existing / Uploaded Image Previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((img, idx) => {
            const url = resolveDisplayUrl(img);
            return (
              <div key={idx} className="relative group aspect-video rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                {url ? (
                  <img
                    src={url}
                    alt={`Room image ${idx + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeUploadedImage(idx)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    aria-label={`Remove image ${idx + 1}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
                {img.storage === 'cloudinary' && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-[9px] px-1 py-0.5 text-center truncate">
                    Cloudinary
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pending Files Preview (not yet uploaded) */}
      {pendingFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-amber-700">
            Ready to upload ({pendingFiles.length} file{pendingFiles.length > 1 ? 's' : ''}):
          </p>
          <div className="grid grid-cols-3 gap-2">
            {pendingFiles.map((pf, idx) => (
              <div key={idx} className="relative group aspect-video rounded-lg overflow-hidden border-2 border-amber-300 bg-amber-50">
                <img
                  src={pf._previewUrl}
                  alt={pf.name}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePendingFile(idx)}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  aria-label="Remove pending image"
                >
                  <X className="w-3 h-3" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-amber-500/80 text-white text-[9px] px-1 py-0.5 text-center truncate">
                  Not uploaded
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Loader2 className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-blue-800 font-medium">
              Uploading {uploadProgress.current} of {uploadProgress.total}…
            </p>
            <div className="w-full bg-blue-200 rounded-full h-1.5 mt-1">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: `${uploadProgress.total > 0 ? (uploadProgress.current / uploadProgress.total) * 100 : 0}%`
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Configuration Warning if env is missing */}
      {!isCloudinaryConfigured && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-800 text-xs">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Cloudinary Not Configured: </span>
            Please add your <code className="bg-amber-100 px-1 rounded">VITE_CLOUDINARY_CLOUD_NAME</code> and <code className="bg-amber-100 px-1 rounded">VITE_CLOUDINARY_UPLOAD_PRESET</code> to your <code className="bg-amber-100 px-1 rounded">.env</code> file.
          </div>
        </div>
      )}

      {/* Validation / Upload Errors */}
      {validationError && (
        <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded-md">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{validationError}</p>
        </div>
      )}

      {uploadError && (
        <div className="flex flex-col gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 font-medium break-words flex-1">{uploadError}</p>
          </div>
          {pendingFiles.length > 0 && !isUploading && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRetryUpload}
                className="text-red-700 border-red-300 hover:bg-red-100 h-7 text-xs"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry Upload
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {/* Select Files */}
        {canAddMore && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              disabled={disabled || isUploading}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading}
              className="text-orange-600 border-orange-300 hover:bg-orange-50"
            >
              <Upload className="w-4 h-4 mr-1.5" />
              {images.length === 0 && pendingFiles.length === 0
                ? 'Select Images'
                : 'Add More'}
            </Button>
          </>
        )}

        {/* Retry / Upload Button */}
        {pendingFiles.length > 0 && !isUploading && (
          <Button
            type="button"
            size="sm"
            onClick={handleRetryUpload}
            disabled={disabled}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            Upload {pendingFiles.length} Image{pendingFiles.length > 1 ? 's' : ''}
          </Button>
        )}
      </div>

      {/* Helper Text */}
      {!disabled && (
        <p className="text-xs text-gray-500">
          JPG, PNG or WEBP &middot; Max 5 MB each &middot; Max {MAX_ROOM_IMAGES} images
        </p>
      )}

      {/* Max limit reached */}
      {totalCount >= MAX_ROOM_IMAGES && (
        <p className="text-xs text-amber-600 font-medium">
          Maximum {MAX_ROOM_IMAGES} room images allowed.
        </p>
      )}
    </div>
  );
};

export default CloudinaryImageUploader;
