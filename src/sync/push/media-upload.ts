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

/** Resolves a local `file:` / `content:` URI to a remote HTTPS URL; passes through HTTPS as-is. */
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

export async function transformPayloadWithUploadedMedia(
  collectionName: string,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if (collectionName === "users") {
    const out = { ...payload };
    if ("avatarUrl" in out) {
      const uploaded = await uploadLocalImageUrl(out.avatarUrl, "user-avatar");
      if (uploaded !== undefined) {
        out.avatarUrl = uploaded;
      }
    }
    return out;
  }

  if (collectionName === "groups") {
    const out = { ...payload };
    if ("imageUrl" in out) {
      const uploaded = await uploadLocalImageUrl(out.imageUrl, "group-image");
      if (uploaded !== undefined) {
        out.imageUrl = uploaded;
      }
    }
    return out;
  }

  if (collectionName === "expenses") {
    const out = { ...payload };
    if ("receiptImageUrl" in out) {
      const uploaded = await uploadLocalImageUrl(
        out.receiptImageUrl,
        "expense-receipt",
      );
      if (uploaded !== undefined) {
        out.receiptImageUrl = uploaded;
      }
    }
    return out;
  }

  return payload;
}
