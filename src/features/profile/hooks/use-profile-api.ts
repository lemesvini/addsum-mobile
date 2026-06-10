import { api } from "@/common/api/api-client";

export type AuthenticatedProfile = {
  _id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  role?: string;
};

export type AuthenticatedProfileResponse = {
  message: string;
  data: AuthenticatedProfile;
};

function parseApiError(err: unknown): string {
  if (typeof err === "object" && err !== null && "response" in err) {
    const data = (err as { response?: { data?: { message?: unknown } } })
      .response?.data;
    const raw = data?.message;
    if (Array.isArray(raw)) return raw.join(", ");
    if (typeof raw === "string" && raw.length > 0) return raw;
  }
  return "Não foi possível carregar o perfil";
}

export async function fetchAuthenticatedProfile(): Promise<AuthenticatedProfile> {
  try {
    const response = await api.get<AuthenticatedProfileResponse>(
      "/auth/authenticated-user",
      { skipErrorAlert: true },
    );
    return response.data;
  } catch (err) {
    throw new Error(parseApiError(err));
  }
}

function parsePatchError(err: unknown): string {
  if (typeof err === "object" && err !== null && "response" in err) {
    const data = (err as { response?: { data?: { message?: unknown } } })
      .response?.data;
    const raw = data?.message;
    if (Array.isArray(raw)) return raw.join(", ");
    if (typeof raw === "string" && raw.length > 0) return raw;
  }
  return "Não foi possível salvar o perfil";
}

export async function updateAuthProfile(payload: {
  fullName: string;
  avatarUrl?: string;
}): Promise<void> {
  try {
    await api.patch("/auth/profile", payload, { skipErrorAlert: true });
  } catch (err) {
    throw new Error(parsePatchError(err));
  }
}
