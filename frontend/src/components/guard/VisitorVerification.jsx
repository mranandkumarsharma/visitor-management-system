import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Chip,
  Divider,
  Alert,
  Card,
  CardContent,
} from "@mui/material";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import { Html5Qrcode } from "html5-qrcode";
import { verifyBadge } from "../../services/visitorService";
import ErrorAlert from "../common/ErrorAlert";
import Loader from "../common/Loader";
import { formatDateTime, getStatusColor } from "../../utils/formatters";

const VisitorVerification = () => {
  const [scanning, setScanning] = useState(false);
  const [scanData, setScanData] = useState("");
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const scannerRef = useRef(null);
  const scannerContainerRef = useRef(null);

  useEffect(() => {
    // Cleanup function to stop scanner when component unmounts
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch((err) => console.error(err));
      }
    };
  }, []);

  const startScanner = async () => {
    try {
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" }, // Use back camera if available
        {
          fps: 10, // frames per second
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // On success
          setScanData(decodedText);
          stopScanner();
          verifyVisitorBadge(decodedText);
        },
        (errorMessage) => {
          // On error - do nothing as this is called frequently while scanning
          // console.log(errorMessage);
        }
      );
      setScanning(true);
    } catch (err) {
      setError(`Could not start scanner: ${err.message}`);
      console.error(err);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        setScanning(false);
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
  };

  const verifyVisitorBadge = async (qrCode) => {
    try {
      setLoading(true);
      setError(null);

      const result = await verifyBadge(qrCode);
      setVerificationResult(result);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to verify badge");
      console.error("Error verifying badge:", err);
      setVerificationResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleStartScan = () => {
    setVerificationResult(null);
    setError(null);
    startScanner();
  };

  const handleStopScan = () => {
    stopScanner();
  };

  return (
    <Box>
      <ErrorAlert error={error} onClose={() => setError(null)} />

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Visitor Badge Verification
            </Typography>

            <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
              {!scanning ? (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<QrCode2Icon />}
                  onClick={handleStartScan}
                  disabled={loading}
                >
                  Scan Badge QR Code
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={handleStopScan}
                >
                  Stop Scanning
                </Button>
              )}
            </Box>

            <Box
              ref={scannerContainerRef}
              sx={{
                maxWidth: 500,
                margin: "0 auto",
                display: scanning ? "block" : "none",
              }}
            >
              <div id="qr-reader" style={{ width: "100%" }}></div>
              <Typography variant="body2" align="center" sx={{ mt: 1 }}>
                Point the camera at a visitor badge QR code
              </Typography>
            </Box>

            {loading && (
              <Box sx={{ mt: 3 }}>
                <Loader message="Verifying badge..." />
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Verification Result
            </Typography>

            {!verificationResult ? (
              <Typography
                variant="body2"
                color="text.secondary"
                align="center"
                sx={{ py: 4 }}
              >
                Scan a badge to see verification details
              </Typography>
            ) : (
              <Box>
                <Alert
                  severity={verificationResult.valid ? "success" : "error"}
                  sx={{ mb: 3 }}
                >
                  {verificationResult.valid
                    ? "Badge Valid - Visitor Authorized"
                    : "Badge Invalid - Visitor Not Authorized"}
                </Alert>

                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Typography variant="subtitle1">
                          Visitor Information
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Name
                        </Typography>
                        <Typography variant="body1">
                          {verificationResult.visitor_name}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Email
                        </Typography>
                        <Typography variant="body1">
                          {verificationResult.visitor_email}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Host
                        </Typography>
                        <Typography variant="body1">
                          {verificationResult.host_name}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Department
                        </Typography>
                        <Typography variant="body1">
                          {verificationResult.host_department}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Status
                        </Typography>
                        <Chip
                          label={verificationResult.status}
                          color={getStatusColor(verificationResult.status)}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Expiry Time
                        </Typography>
                        <Typography variant="body1">
                          {formatDateTime(verificationResult.expiry_time)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {verificationResult.check_in_time && (
                  <Typography variant="body2" color="text.secondary">
                    Checked in at:{" "}
                    {formatDateTime(verificationResult.check_in_time)}
                  </Typography>
                )}

                {!verificationResult.valid && verificationResult.message && (
                  <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                    Reason: {verificationResult.message}
                  </Typography>
                )}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default VisitorVerification;
