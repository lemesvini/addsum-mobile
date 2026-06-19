import { uploadApi } from "@/common/api/upload";

export function isRemoteUrl(value: unknown): value is string {
  return (
    typeof value === "string" &&
    (value.startsWith("http://") || value.startsWith("https://"))
  );
}

function uploadMetaFromUri(uri: string, fallbackPrefix: string) {
  const fallbackExt = "jpg";
  const rawFileName =
    uri.split("?")[0]?.split("#")[0]?.split("/").pop() ||
    `${fallbackPrefix}-${Date.now()}.${fallbackExt}`;
  const fileName =
    rawFileName || `${fallbackPrefix}-${Date.now()}.${fallbackExt}`;
  const ext = fileName.includes(".")
    ? (fileName.split(".").pop() || "").toLowerCase()
    : "";
  const fileType =
    ext === "jpg" || ext === "jpeg"
      ? "image/jpeg"
      : ext === "png"
        ? "image/png"
        : ext
          ? `image/${ext}`
          : "image/jpeg";
  return { fileName, fileType };
}

export async function uploadLocalImageUrl(
  value: unknown,
  fallbackPrefix: string,
): Promise<string | undefined> {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const currentUrl = value.trim();
  if (isRemoteUrl(currentUrl)) return currentUrl;

  const { fileName, fileType } = uploadMetaFromUri(currentUrl, fallbackPrefix);
  return uploadApi.uploadFile({
    uri: currentUrl,
    fileName,
    fileType,
  });
}

export function uploadLocalAvatarUrl(
  avatarUrl: unknown,
): Promise<string | undefined> {
  return uploadLocalImageUrl(avatarUrl, "user-avatar");
}

export function uploadLocalGroupImageUrl(
  imageUrl: unknown,
): Promise<string | undefined> {
  return uploadLocalImageUrl(imageUrl, "group-image");
}

export function uploadLocalReceiptImageUrl(
  receiptUrl: unknown,
): Promise<string | undefined> {
  return uploadLocalImageUrl(receiptUrl, "expense-receipt");
}
