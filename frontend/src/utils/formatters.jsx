import { format } from "date-fns";

export const formatDateTime = (dateString) => {
  if (!dateString) return "N/A";
  return format(new Date(dateString), "yyyy-MM-dd HH:mm");
};

export const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return format(new Date(dateString), "yyyy-MM-dd");
};

export const formatStatus = (status) => {
  if (!status) return "Unknown";

  return status
    .replace("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

export const getStatusColor = (status) => {
  if (!status) return "default";

  switch (status.toUpperCase()) {
    case "PENDING":
      return "warning";
    case "APPROVED":
      return "info";
    case "REJECTED":
      return "error";
    case "CHECKED_IN":
      return "success";
    case "CHECKED_OUT":
      return "default";
    case "EXPIRED":
      return "error";
    default:
      return "default";
  }
};
