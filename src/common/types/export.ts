export type ExportFormat = "pdf" | "csv";

export type ExportOrigin = "users" | "movies" | "producers";

export type SelectableField = {
  field: string;
  label: string;
};

export type SelectableFieldsResponse = {
  message: string;
  data: SelectableField[];
};

export type ExportResponse = {
  message: string;
  data: {
    fileUrl: string;
    filename: string;
  };
};

export type ExportParams = {
  format: ExportFormat;
  selectedFields: string[];
  filters?: string;
  search?: string;
};
