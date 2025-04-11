// src/pages/VisitorRegistration.js
import React, { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  MenuItem,
  InputLabel,
  FormControl,
  Select,
  Alert,
  FormHelperText,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
} from "@mui/material";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import axios from "axios";
import Webcam from "react-webcam";

const API_URL = "http://localhost:8000/api/v1";
const CLOUDINARY_CLOUD_NAME = "dqqnmd3sz"; // Replace with your actual cloud name
const CLOUDINARY_UPLOAD_PRESET = "visitor_photos"; // Replace with your actual upload preset

const VisitorRegistration = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [visitorid, setvisitorid] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [hosts, setHosts] = useState([]);
  const [loadingHosts, setLoadingHosts] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const webcamRef = useRef(null);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    company: "",
    purpose: "",
    host_id: "",
    scheduled_time: null,
    photo_url: null,
  });

  useEffect(() => {
    const fetchHosts = async () => {
      try {
        setLoadingHosts(true);
        const res = await axios.get(`${API_URL}/visitors/hosts`);
        const hostList = Array.isArray(res.data)
          ? res.data
          : res.data?.results || [];
        setHosts(hostList);
      } catch (err) {
        console.error("Host fetch error:", err);
        setError("Failed to load hosts. Please try again later.");
      } finally {
        setLoadingHosts(false);
      }
    };
    fetchHosts();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: null,
      }));
    }
  };

  const handleDateChange = (date) => {
    setFormData((prev) => ({
      ...prev,
      scheduled_time: date,
    }));
    if (formErrors.scheduled_time) {
      setFormErrors((prev) => ({
        ...prev,
        scheduled_time: null,
      }));
    }
  };

  const captureImage = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) setCapturedImage(imageSrc);
  };

  const uploadToCloudinary = async () => {
    if (!capturedImage) return;
    setUploadingImage(true);
    setError(null);

    try {
      // For base64 data directly to Cloudinary, we need to send the full string
      const data = new FormData();
      data.append("file", capturedImage);
      data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const res = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        data
      );

      const url = res.data.secure_url;
      setImageUrl(url);
      setFormData((prev) => ({ ...prev, photo_url: url }));

      // Show success message for the upload
      setSuccess("Image uploaded successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Image upload failed:", err);
      setError(
        err.response?.data?.error?.message ||
          "Failed to upload image. Please check your Cloudinary configuration or try again."
      );
    } finally {
      setUploadingImage(false);
    }
  };

  // Alternative method using a direct upload approach for base64 images
  const uploadToCloudinaryDirect = async () => {
    if (!capturedImage) return;
    setUploadingImage(true);
    setError(null);

    try {
      // Create a file from the base64 string
      const fetchRes = await fetch(capturedImage);
      const blob = await fetchRes.blob();
      const file = new File([blob], "visitor-photo.jpg", {
        type: "image/jpeg",
      });

      const data = new FormData();
      data.append("file", file);
      data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const res = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        data
      );

      const url = res.data.secure_url;
      setImageUrl(url);
      setFormData((prev) => ({ ...prev, photo_url: url }));

      setSuccess("Image uploaded successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Image upload failed:", err);
      setError(
        err.response?.data?.error?.message ||
          "Failed to upload image. Please check your Cloudinary configuration or try again."
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.full_name) errors.full_name = "Full name is required";
    if (!formData.email) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Invalid email address";
    }
    if (!formData.phone) {
      errors.phone = "Phone number is required";
    } else if (!/^\+?[0-9\s\-()]{8,20}$/.test(formData.phone)) {
      errors.phone = "Invalid phone number";
    }
    if (!formData.purpose) errors.purpose = "Purpose is required";
    if (!formData.host_id) errors.host_id = "Host selection is required";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateForm()) setActiveStep(1);
  };

  const handleBack = () => setActiveStep(0);

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API_URL}/visitors/self-register`, {
        ...formData,
        photo_url: formData.photo_url || null,
      });

      setSuccess(
        res.data.message ||
          "Registration successful! Your host will be notified."
      );
      setvisitorid(res.data.id);
      setFormData({
        full_name: "",
        email: "",
        phone: "",
        company: "",
        purpose: "",
        host_id: "",
        scheduled_time: null,
        photo_url: null,
      });
      setCapturedImage(null);
      setImageUrl(null);
      setActiveStep(2);
    } catch (err) {
      console.error("Registration error:", err);
      setError(
        err.response?.data?.detail || "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const getHostName = (hostId) => {
    const host = hosts.find(
      (h) => h.id === hostId || h.id === parseInt(hostId)
    );
    return host ? `${host.name} (${host.department})` : "";
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" align="center" gutterBottom>
            Visitor Self-Registration
          </Typography>

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            <Step>
              <StepLabel>Visitor Information</StepLabel>
            </Step>
            <Step>
              <StepLabel>Review & Submit</StepLabel>
            </Step>
            <Step>
              <StepLabel>Confirmation</StepLabel>
            </Step>
          </Stepper>

          {error && (
            <Alert
              severity="error"
              sx={{ mb: 3 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          {success && (
            <Alert
              severity="success"
              sx={{ mb: 3 }}
              onClose={() => setSuccess(null)}
            >
              {success}
            </Alert>
          )}

          {activeStep === 0 && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="full_name"
                    label="Full Name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    fullWidth
                    required
                    error={!!formErrors.full_name}
                    helperText={formErrors.full_name}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="email"
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    fullWidth
                    required
                    error={!!formErrors.email}
                    helperText={formErrors.email}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="phone"
                    label="Phone Number"
                    value={formData.phone}
                    onChange={handleInputChange}
                    fullWidth
                    required
                    error={!!formErrors.phone}
                    helperText={formErrors.phone}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="company"
                    label="Company (Optional)"
                    value={formData.company}
                    onChange={handleInputChange}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required error={!!formErrors.purpose}>
                    <InputLabel>Purpose of Visit</InputLabel>
                    <Select
                      name="purpose"
                      value={formData.purpose}
                      onChange={handleInputChange}
                      label="Purpose of Visit"
                    >
                      <MenuItem value="meeting">Meeting</MenuItem>
                      <MenuItem value="interview">Interview</MenuItem>
                      <MenuItem value="delivery">Delivery</MenuItem>
                      <MenuItem value="maintenance">Maintenance</MenuItem>
                      <MenuItem value="other">Other</MenuItem>
                    </Select>
                    {formErrors.purpose && (
                      <FormHelperText>{formErrors.purpose}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required error={!!formErrors.host_id}>
                    <InputLabel>Select Host</InputLabel>
                    <Select
                      name="host_id"
                      value={formData.host_id}
                      onChange={handleInputChange}
                      label="Select Host"
                      disabled={loadingHosts}
                    >
                      {loadingHosts ? (
                        <MenuItem value="" disabled>
                          Loading hosts...
                        </MenuItem>
                      ) : hosts.length === 0 ? (
                        <MenuItem value="" disabled>
                          No hosts available
                        </MenuItem>
                      ) : (
                        hosts.map((host) => (
                          <MenuItem key={host.id} value={host.id.toString()}>
                            {host.name} ({host.department})
                          </MenuItem>
                        ))
                      )}
                    </Select>
                    {formErrors.host_id && (
                      <FormHelperText>{formErrors.host_id}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <DateTimePicker
                    label="Preferred Visit Time (Optional)"
                    value={formData.scheduled_time}
                    onChange={handleDateChange}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!formErrors.scheduled_time,
                        helperText: formErrors.scheduled_time,
                      },
                    }}
                    minDateTime={new Date()}
                  />
                </Grid>
              </Grid>
              <Grid container sx={{ mt: 3 }}>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Capture Visitor Photo (Optional)
                  </Typography>

                  {!capturedImage ? (
                    <Box sx={{ mb: 2 }}>
                      <Webcam
                        audio={false}
                        height={240}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        width="100%"
                        videoConstraints={{ facingMode: "user" }}
                      />
                      <Button
                        variant="outlined"
                        onClick={captureImage}
                        sx={{ mt: 1 }}
                      >
                        Capture Image
                      </Button>
                    </Box>
                  ) : (
                    <Box sx={{ mb: 2 }}>
                      <img
                        src={capturedImage}
                        alt="Captured"
                        style={{
                          width: "100%",
                          maxHeight: "300px",
                          objectFit: "contain",
                        }}
                      />
                      <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                        <Button
                          variant="outlined"
                          onClick={() => setCapturedImage(null)}
                        >
                          Retake
                        </Button>
                        <Button
                          variant="contained"
                          onClick={uploadToCloudinaryDirect}
                          disabled={uploadingImage}
                          startIcon={
                            uploadingImage && <CircularProgress size={20} />
                          }
                        >
                          {uploadingImage ? "Uploading..." : "Upload"}
                        </Button>
                      </Box>
                      {imageUrl && (
                        <Typography
                          variant="body2"
                          color="success.main"
                          sx={{ mt: 1 }}
                        >
                          Image uploaded successfully
                        </Typography>
                      )}
                    </Box>
                  )}
                </Grid>
              </Grid>

              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={loading}
                >
                  Next
                </Button>
              </Box>
            </Box>
          )}

          {activeStep === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Review Your Information
              </Typography>

              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Full Name
                  </Typography>
                  <Typography variant="body1">{formData.full_name}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Email
                  </Typography>
                  <Typography variant="body1">{formData.email}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Phone
                  </Typography>
                  <Typography variant="body1">{formData.phone}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Company
                  </Typography>
                  <Typography variant="body1">
                    {formData.company || "N/A"}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Purpose of Visit
                  </Typography>
                  <Typography variant="body1">
                    {formData.purpose === "meeting"
                      ? "Meeting"
                      : formData.purpose === "interview"
                      ? "Interview"
                      : formData.purpose === "delivery"
                      ? "Delivery"
                      : formData.purpose === "maintenance"
                      ? "Maintenance"
                      : formData.purpose === "other"
                      ? "Other"
                      : formData.purpose}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Host
                  </Typography>
                  <Typography variant="body1">
                    {getHostName(formData.host_id)}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Scheduled Time
                  </Typography>
                  <Typography variant="body1">
                    {formData.scheduled_time
                      ? new Date(formData.scheduled_time).toLocaleString()
                      : "Not specified"}
                  </Typography>
                </Grid>

                {formData.photo_url && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Photo
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <img
                        src={formData.photo_url}
                        alt="Visitor"
                        style={{
                          width: "150px",
                          height: "150px",
                          objectFit: "cover",
                          borderRadius: "4px",
                        }}
                      />
                    </Box>
                  </Grid>
                )}
              </Grid>

              <Box
                sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}
              >
                <Button onClick={handleBack} disabled={loading}>
                  Back
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSubmit}
                  disabled={loading}
                  startIcon={
                    loading ? <CircularProgress size={24} /> : <HowToRegIcon />
                  }
                >
                  {loading ? "Submitting..." : "Submit Registration"}
                </Button>
              </Box>
            </Box>
          )}

          {activeStep === 2 && (
            <Box textAlign="center">
              <HowToRegIcon sx={{ fontSize: 60, color: "green", mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Registration Successful!
              </Typography>
              <Typography variant="subtitle1" sx={{ mb: 3 }}>
                Please show the following QR code at the reception for check-in.
              </Typography>

              <QRCodeSVG value={visitorid} />
            </Box>
          )}
        </Paper>
      </Container>
    </LocalizationProvider>
  );
};

export default VisitorRegistration;
