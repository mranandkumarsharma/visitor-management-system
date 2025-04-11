import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  IconButton,
} from "@mui/material";
import Webcam from "react-webcam";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import ReplayIcon from "@mui/icons-material/Replay";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";

const PhotoCapture = ({ open, onClose, onCapture, visitorName }) => {
  const webcamRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCapture = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    setCapturedImage(imageSrc);
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  const handleConfirm = async () => {
    if (!capturedImage) return;

    try {
      setLoading(true);
      setError(null);

      // Convert base64 image to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();

      // Pass the blob to parent component
      onCapture(blob);
    } catch (err) {
      setError("Failed to process the captured image");
      console.error("Error processing image:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDialog = () => {
    setCapturedImage(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
      <DialogTitle>
        Capture Photo
        {visitorName && (
          <Typography variant="subtitle2" color="text.secondary">
            for {visitorName}
          </Typography>
        )}
        <IconButton
          onClick={handleCloseDialog}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Typography color="error" gutterBottom>
            {error}
          </Typography>
        )}

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {!capturedImage ? (
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              width="100%"
              videoConstraints={{
                width: 480,
                height: 360,
                facingMode: "user",
              }}
              style={{
                borderRadius: "4px",
                border: "1px solid #ddd",
              }}
            />
          ) : (
            <Box
              component="img"
              src={capturedImage}
              alt="Captured photo"
              sx={{
                width: "100%",
                maxHeight: 360,
                borderRadius: "4px",
                border: "1px solid #ddd",
              }}
            />
          )}

          <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
            {!capturedImage ? (
              <Button
                variant="contained"
                color="primary"
                startIcon={<CameraAltIcon />}
                onClick={handleCapture}
                disabled={loading}
              >
                Capture
              </Button>
            ) : (
              <>
                <Button
                  variant="outlined"
                  startIcon={<ReplayIcon />}
                  onClick={handleRetake}
                  disabled={loading}
                >
                  Retake
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={
                    loading ? <CircularProgress size={24} /> : <CheckIcon />
                  }
                  onClick={handleConfirm}
                  disabled={loading}
                >
                  Confirm
                </Button>
              </>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseDialog} disabled={loading}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PhotoCapture;
