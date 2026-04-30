const MB = 1024 * 1024;

export const MAX_IMAGE_FILE_SIZE_BYTES = 2 * MB;
const DEFAULT_ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

type ValidateImageFileOptions = {
  maxBytes?: number;
  allowedTypes?: string[];
  label?: string;
};

export function validateImageFile(
  file: File,
  {
    maxBytes = MAX_IMAGE_FILE_SIZE_BYTES,
    allowedTypes = DEFAULT_ALLOWED_IMAGE_TYPES,
    label = 'Image',
  }: ValidateImageFileOptions = {},
) {
  if (!allowedTypes.includes(file.type)) {
    return {
      ok: false as const,
      message: `${label} must be a JPG, PNG, or WebP file`,
    };
  }

  if (file.size > maxBytes) {
    return {
      ok: false as const,
      message: `${label} must be under ${Math.floor(maxBytes / MB)}MB`,
    };
  }

  return { ok: true as const };
}
