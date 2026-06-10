import type {
  ExportOrigin,
  ExportParams,
  ExportResponse,
  SelectableFieldsResponse,
} from "@/common/types/export";
import { api } from "./api-client";

export async function getSelectableFields(origin: ExportOrigin) {
  return api.get<SelectableFieldsResponse>(`/${origin}/export/selectable-fields`);
}

export async function exportEntity(origin: ExportOrigin, params: ExportParams) {
  const { selectedFields, filters, search, format } = params;

  return api.get<ExportResponse>(`/${origin}/export`, {
    params: {
      format,
      selectedFields: selectedFields.join(","),
      ...(filters ? { filters } : {}),
      ...(search ? { search } : {}),
    },
  });
}
