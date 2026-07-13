import { Platform } from "react-native";

/**
 * iOS presents a transparent form-sheet (the screen paints its own background).
 * Android doesn't support the transparent form-sheet the same way, so it falls
 * back to a normal full-screen card — make sure such screens paint a solid
 * background themselves.
 */
export const FORM_SHEET_OPTIONS =
  Platform.OS === "ios"
    ? {
        presentation: "formSheet" as const,
        sheetGrabberVisible: true,
        sheetAllowedDetents: [0.5, 1.0],
        contentStyle: { backgroundColor: "transparent" },
      }
    : undefined;
