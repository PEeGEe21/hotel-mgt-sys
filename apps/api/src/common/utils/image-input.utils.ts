import {
  ValidationArguments,
  ValidationOptions,
  registerDecorator,
} from 'class-validator';

const DATA_URL_PREFIX = /^data:image\/([a-zA-Z0-9.+-]+);base64,/i;
const ALLOWED_HTTP_PROTOCOLS = new Set(['http:', 'https:']);

type ImageReferenceOptions = {
  allowDataUrl?: boolean;
  allowHttpUrl?: boolean;
  maxBytes?: number;
};

function getApproximateDataUrlBytes(value: string) {
  const match = value.match(DATA_URL_PREFIX);
  if (!match) return null;
  const base64 = value.slice(match[0].length).replace(/\s+/g, '');
  if (!base64) return 0;

  try {
    return Buffer.byteLength(base64, 'base64');
  } catch {
    return null;
  }
}

export function isSafeImageReference(
  value: unknown,
  {
    allowDataUrl = true,
    allowHttpUrl = true,
    maxBytes,
  }: ImageReferenceOptions = {},
) {
  if (typeof value !== 'string') return false;

  const trimmed = value.trim();
  if (!trimmed) return false;

  if (allowDataUrl && DATA_URL_PREFIX.test(trimmed)) {
    const bytes = getApproximateDataUrlBytes(trimmed);
    if (bytes === null) return false;
    if (maxBytes && bytes > maxBytes) return false;
    return true;
  }

  if (!allowHttpUrl) return false;

  try {
    const url = new URL(trimmed);
    return ALLOWED_HTTP_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
}

export function IsSafeImageReference(
  options: ImageReferenceOptions = {},
  validationOptions?: ValidationOptions,
) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isSafeImageReference',
      target: object.constructor,
      propertyName,
      constraints: [options],
      options: validationOptions,
      validator: {
        validate(value: unknown, args?: ValidationArguments) {
          const [imageOptions] = (args?.constraints ?? []) as [ImageReferenceOptions];
          return isSafeImageReference(value, imageOptions);
        },
        defaultMessage(args?: ValidationArguments) {
          const [imageOptions] = (args?.constraints ?? []) as [ImageReferenceOptions];
          const sizeLabel = imageOptions?.maxBytes
            ? ` and must be under ${Math.floor(imageOptions.maxBytes / (1024 * 1024))}MB`
            : '';
          return `${args?.property ?? 'value'} must be an http(s) image URL or base64 image data${sizeLabel}`;
        },
      },
    });
  };
}
