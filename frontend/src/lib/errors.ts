import axios from "axios";

type ErrorDetail =
  | string
  | string[]
  | Record<string, string | string[]>
  | undefined;

function flattenErrorDetail(detail: ErrorDetail): string | null {
  if (!detail) {
    return null;
  }

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail.join(" ");
  }

  const firstValue = Object.values(detail)[0];
  if (Array.isArray(firstValue)) {
    return firstValue.join(" ");
  }

  return firstValue ?? null;
}

export function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { detail?: ErrorDetail; non_field_errors?: ErrorDetail }
      | Record<string, ErrorDetail>
      | undefined;

    if (data) {
      return (
        flattenErrorDetail(data.detail) ??
        flattenErrorDetail(data.non_field_errors) ??
        flattenErrorDetail(data as Record<string, string | string[]>)
      );
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}
