import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

/**
 * Re-encodes a locally picked image to JPEG, regardless of its source format.
 *
 * iOS photo library assets can come back as HEIC — and `expo-image-picker`
 * doesn't reliably report `mimeType` for every asset/OS version, so format
 * checks based on it can be silently skipped. HEIC decodes fine on iOS but
 * not on Android (or in most browsers), so an unconverted HEIC upload shows
 * up broken cross-platform. Re-encoding here guarantees a real JPEG file
 * (and a `.jpg` uri) no matter what the picker handed back.
 */
export async function normalizeToJpeg(
  uri: string,
  quality = 0.85,
): Promise<string> {
  const result = await manipulateAsync(uri, [], {
    compress: quality,
    format: SaveFormat.JPEG,
  });
  return result.uri;
}
