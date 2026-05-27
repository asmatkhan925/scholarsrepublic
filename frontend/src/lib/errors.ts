import axios from "axios";

function flattenErrorDetail(detail: unknown): string | null {
  if (!detail) {
    return null;
  }

  if (typeof detail === "string") {
    return detail;
  }

  if (typeof detail === "number" || typeof detail === "boolean") {
    return null;
  }

  if (Array.isArray(detail)) {
    return detail.join(" ");
  }

  if (typeof detail !== "object") {
    return null;
  }

  const firstValue = Object.values(detail).find(
    (value) => typeof value === "string" || Array.isArray(value),
  );
  if (Array.isArray(firstValue)) {
    return firstValue.join(" ");
  }

  return firstValue || null;
}

export function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | {
          detail?: unknown;
          error?: unknown;
          message?: unknown;
          non_field_errors?: unknown;
        }
      | Record<string, unknown>
      | undefined;

    if (data) {
      return (
        flattenErrorDetail(data.detail) ??
        flattenErrorDetail(data.error) ??
        flattenErrorDetail(data.message) ??
        flattenErrorDetail(data.non_field_errors) ??
        flattenErrorDetail(data)
      );
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}
