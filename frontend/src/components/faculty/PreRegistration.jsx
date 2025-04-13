import React, { useState } from "react";
import {
  Box,
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
  Stack,
} from "@mui/material";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { createPreApproval } from "../../services/visitorService";
import { useAuth } from "../../contexts/AuthContext";
import ErrorAlert from "../common/ErrorAlert";
import Loader from "../common/Loader";

const PreRegistration = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    company: "",
    purpose: "",
    scheduled_time: null,
    visit_duration_minutes: 60,
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleDateChange = (newDate) => {
    setFormData({
      ...formData,
      scheduled_time: newDate,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (
      !formData.full_name ||
      !formData.email ||
      !formData.phone ||
      !formData.purpose ||
      !formData.scheduled_time
    ) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Add host ID to form data
      const requestData = {
        ...formData,
        host_id: user.id,
      };

      await createPreApproval(requestData);

      setSuccess(`Pre-registration successful for ${formData.full_name}`);

      // Reset form
      setFormData({
        full_name: "",
        email: "",
        phone: "",
        company: "",
        purpose: "",
        scheduled_time: null,
        visit_duration_minutes: 60,
      });
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to pre-register visitor");
      console.error("Error pre-registering visitor:", err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: "",
      email: "",
      phone: "",
      company: "",
      purpose: "",
      scheduled_time: null,
      visit_duration_minutes: 60,
    });
    setError(null);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <ErrorAlert error={error} onClose={() => setError(null)} />

        {success && (
          <Alert
            severity="success"
            sx={{ mb: 2 }}
            onClose={() => setSuccess(null)}
          >
            {success}
          </Alert>
        )}

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Pre-Register a Visitor
          </Typography>

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="full_name"
                  label="Full Name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  fullWidth
                  required
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
                <FormControl fullWidth required>
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
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <DateTimePicker
                  label="Scheduled Date & Time"
                  value={formData.scheduled_time}
                  onChange={handleDateChange}
                  renderInput={(params) => (
                    <TextField {...params} fullWidth required />
                  )}
                  minDateTime={new Date()}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Visit Duration</InputLabel>
                  <Select
                    name="visit_duration_minutes"
                    value={formData.visit_duration_minutes}
                    onChange={handleInputChange}
                    label="Visit Duration"
                  >
                    <MenuItem value={30}>30 minutes</MenuItem>
                    <MenuItem value={60}>1 hour</MenuItem>
                    <MenuItem value={120}>2 hours</MenuItem>
                    <MenuItem value={180}>3 hours</MenuItem>
                    <MenuItem value={240}>4 hours</MenuItem>
                    <MenuItem value={480}>8 hours</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Stack
                  direction="row"
                  spacing={2}
                  justifyContent="flex-end"
                  sx={{ mt: 2 }}
                >
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={resetForm}
                    disabled={loading}
                  >
                    Reset
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={loading}
                  >
                    {loading ? <Loader size={24} /> : "Pre-register Visitor"}
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </Box>
    </LocalizationProvider>
  );
};

export default PreRegistration;
