import React from "react";
import { Alert, AlertTitle } from "@mui/material";

const ErrorAlert = ({ error, onClose }) => {
  if (!error) return null;

  let errorMessage = "An unknown error occurred.";

  if (typeof error === "string") {
    errorMessage = error;
  } else if (error.message) {
    errorMessage = error.message;
  } else if (error.response?.data?.detail) {
    errorMessage = error.response.data.detail;
  }

  return (
    <Alert severity="error" onClose={onClose} sx={{ mb: 2 }}>
      <AlertTitle>Error</AlertTitle>
      {errorMessage}
    </Alert>
  );
};

export default ErrorAlert;
