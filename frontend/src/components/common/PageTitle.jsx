import React from "react";
import { Typography, Box, Divider } from "@mui/material";

const PageTitle = ({ title, subtitle }) => {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="subtitle1" color="text.secondary">
          {subtitle}
        </Typography>
      )}
      <Divider sx={{ mt: 1 }} />
    </Box>
  );
};

export default PageTitle;
