import axios, { isAxiosError } from "axios";
import { api } from "@/common/api/api-client";

export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9\-_.]/g, "")
    .toLowerCase()
    .replace(/(.+)\.(.+)$/, `$1-${Date.now()}.$2`);
}

interface GetPresignedUrlRequest {
  filename: string;
  filetype: string;
}

interface PresignedUrlPayload {
  presignedUrl: string;
  previewUrl: string;
}

interface GetPresignedUrlResponse {
  presignedUrl?: string;
  previewUrl?: string;
  data?: PresignedUrlPayload;
}

interface UploadFileOptions {
  uri: string;
  fileName: string;
  fileType: string;
}

function unwrapPresignedResponse(
  response: GetPresignedUrlResponse,
): PresignedUrlPayload {
  if (response.data && typeof response.data === "object") {
    return response.data;
  }
  if (response.presignedUrl && response.previewUrl) {
    return {
      presignedUrl: response.presignedUrl,
      previewUrl: response.previewUrl,
    };
  }
  throw new Error("Presigned URL or Preview URL não foi retornado pela API");
}

export const uploadApi = {
  getPresignedUrl: (data: GetPresignedUrlRequest) => {
    return api.post<GetPresignedUrlResponse>("/uploads/presigned-url", data);
  },

  async uploadFile({
    uri,
    fileName,
    fileType,
  }: UploadFileOptions): Promise<string> {
    try {
      const sanitizedFileName = sanitizeFileName(fileName);
      const response = await this.getPresignedUrl({
        filename: sanitizedFileName,
        filetype: fileType,
      });
      const { presignedUrl, previewUrl } = unwrapPresignedResponse(response);

      const fileResponse = await fetch(uri);
      if (!fileResponse.ok) {
        throw new Error(
          `Failed to fetch file from URI: ${fileResponse.status}`,
        );
      }
      const blob = await fileResponse.blob();

      let uploadUrl = presignedUrl;
      try {
        const url = new URL(presignedUrl);
        url.searchParams.delete("x-amz-acl");
        url.searchParams.delete("acl");
        uploadUrl = url.toString();
      } catch {
        // Could not parse presigned URL, using as-is
      }

      const uploadHeaders: Record<string, string> = {
        "Content-Type": fileType,
      };

      try {
        await axios.put(uploadUrl, blob, {
          headers: uploadHeaders,
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          transformRequest: [
            (data, headers) => {
              delete headers?.["x-amz-acl"];
              delete headers?.["acl"];
              return data;
            },
          ],
        });
      } catch (error: unknown) {
        let errorMessage =
          error instanceof Error ? error.message : "Erro desconhecido";
        if (isAxiosError(error) && typeof error.response?.data === "string") {
          const xmlMatch = error.response.data.match(
            /<Message>(.*?)<\/Message>/,
          );
          if (xmlMatch) {
            errorMessage = xmlMatch[1];
          }
        }

        throw new Error(`Falha ao fazer upload: ${errorMessage}`);
      }

      return previewUrl;
    } catch (error) {
      if (isAxiosError(error)) {
        console.error("[Upload] Axios error details:", {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
        });
      }
      throw error;
    }
  },

  validateImage(fileSize: number): { isValid: boolean; error?: string } {
    if (fileSize > 5 * 1024 * 1024) {
      return {
        isValid: false,
        error: "A imagem deve ter no máximo 5MB",
      };
    }

    return { isValid: true };
  },
};
