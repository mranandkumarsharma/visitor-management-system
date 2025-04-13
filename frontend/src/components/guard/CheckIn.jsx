import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Chip,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  Alert,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PersonIcon from "@mui/icons-material/Person";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import axios from "axios";

import {
  checkInVisitor,
  uploadVisitorPhoto,
  getVisitors,
} from "../../services/visitorService";
import PhotoCapture from "./PhotoCapture";
import ErrorAlert from "../common/ErrorAlert";
import Loader from "../common/Loader";
import { formatDateTime, getStatusColor } from "../../utils/formatters";

const CheckIn = () => {
  const [visitors, setVisitors] = useState([]);
  const [filteredVisitors, setFilteredVisitors] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [photoCaptureOpen, setPhotoCaptureOpen] = useState(false);
  const fetchVisitors = async () => {
    try {
      setError(null);
      setLoading(true);

      const token = localStorage.getItem("token");

      const response = await axios.get(
        "http://127.0.0.1:8000/api/v1/visitors/",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            accept: "application/json",
          },
          params: {
            status: "approved", // ✅ only approved visitors
          },
        }
      );

      console.log("Fetched visitors (CheckIn):", response.data);

      // Only show approved visitors who have not checked in
      const filtered = response.data.filter((v) => !v.check_in_time);

      console.log("CheckIn filtered visitors:", filtered);

      setVisitors(filtered);
      setFilteredVisitors(filtered);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to fetch visitors");
      console.error("Error fetching visitors:", err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchVisitors();
  }, []);
  useEffect(() => {
    fetchVisitors();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = visitors.filter(
        (visitor) =>
          visitor.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          visitor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          visitor.host_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredVisitors(filtered);
    } else {
      setFilteredVisitors(visitors);
    }
  }, [searchTerm, visitors]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSelectVisitor = (visitor) => {
    setSelectedVisitor(visitor);
  };

  const handleOpenPhotoCapture = () => {
    setPhotoCaptureOpen(true);
  };

  const handleClosePhotoCapture = () => {
    setPhotoCaptureOpen(false);
  };

  const handlePhotoCapture = async (photoBlob) => {
    if (!selectedVisitor) return;

    try {
      setLoading(true);
      setError(null);

      // Upload the photo
      await uploadVisitorPhoto(selectedVisitor.id, photoBlob);

      // Check in the visitor
      await checkInVisitor(selectedVisitor.id);

      setSuccess(
        `${selectedVisitor.full_name} has been successfully checked in`
      );
      setSelectedVisitor(null);
      fetchVisitors(); // Refresh the list
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to check in visitor");
      console.error("Error during check-in:", err);
    } finally {
      setLoading(false);
      setPhotoCaptureOpen(false);
    }
  };

  const handleCheckIn = async () => {
    if (!selectedVisitor) return;

    if (!selectedVisitor.has_photo) {
      // If no photo, open the photo capture
      handleOpenPhotoCapture();
    } else {
      // If already has photo, just check in
      try {
        setLoading(true);
        setError(null);

        await checkInVisitor(selectedVisitor.id);

        setSuccess(
          `${selectedVisitor.full_name} has been successfully checked in`
        );
        setSelectedVisitor(null);
        fetchVisitors(); // Refresh the list
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to check in visitor");
        console.error("Error during check-in:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
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

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Approved Visitors
            </Typography>

            <TextField
              fullWidth
              variant="outlined"
              size="small"
              placeholder="Search visitors..."
              value={searchTerm}
              onChange={handleSearch}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />

            {loading && !selectedVisitor ? (
              <Loader />
            ) : filteredVisitors.length === 0 ? (
              <Typography
                variant="body2"
                color="text.secondary"
                align="center"
                sx={{ py: 4 }}
              >
                No visitors waiting for check-in
              </Typography>
            ) : (
              <List sx={{ maxHeight: 400, overflow: "auto" }}>
                {filteredVisitors.map((visitor) => (
                  <React.Fragment key={visitor.id}>
                    <ListItem
                      button
                      selected={selectedVisitor?.id === visitor.id}
                      onClick={() => handleSelectVisitor(visitor)}
                    >
                      <ListItemAvatar>
                        <Avatar>
                          <PersonIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={visitor.full_name}
                        secondary={
                          <>
                            <Typography
                              component="span"
                              variant="body2"
                              color="text.primary"
                            >
                              {visitor.host_name}
                            </Typography>
                            {` — ${visitor.purpose}`}
                          </>
                        }
                      />
                      <Chip
                        label={visitor.status}
                        color={getStatusColor(visitor.status)}
                        size="small"
                      />
                    </ListItem>
                    <Divider variant="inset" component="li" />
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Check-In Details
            </Typography>

            {!selectedVisitor ? (
              <Typography
                variant="body2"
                color="text.secondary"
                align="center"
                sx={{ py: 4 }}
              >
                Select a visitor from the list to check in
              </Typography>
            ) : (
              <Box>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom>
                      Visitor Information
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Name
                    </Typography>
                    <Typography variant="body1">
                      {selectedVisitor.full_name}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Email
                    </Typography>
                    <Typography variant="body1">
                      {selectedVisitor.email}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Phone
                    </Typography>
                    <Typography variant="body1">
                      {selectedVisitor.phone}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Company
                    </Typography>
                    <Typography variant="body1">
                      {selectedVisitor.company || "N/A"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Host
                    </Typography>
                    <Typography variant="body1">
                      {selectedVisitor.host_name}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Purpose
                    </Typography>
                    <Typography variant="body1">
                      {selectedVisitor.purpose}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Scheduled Time
                    </Typography>
                    <Typography variant="body1">
                      {formatDateTime(selectedVisitor.scheduled_time) ||
                        "Not scheduled"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Photo Status
                    </Typography>
                    <Typography variant="body1">
                      {selectedVisitor.has_photo
                        ? "Photo available"
                        : "No photo (required)"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
                      <Button
                        variant="outlined"
                        startIcon={<PhotoCameraIcon />}
                        onClick={handleOpenPhotoCapture}
                        disabled={loading}
                      >
                        {selectedVisitor.has_photo
                          ? "Update Photo"
                          : "Capture Photo"}
                      </Button>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<HowToRegIcon />}
                        onClick={handleCheckIn}
                        disabled={loading || !selectedVisitor.has_photo}
                      >
                        Check In
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      <PhotoCapture
        open={photoCaptureOpen}
        onClose={handleClosePhotoCapture}
        onCapture={handlePhotoCapture}
        visitorName={selectedVisitor?.full_name}
      />
    </Box>
  );
};

export default CheckIn;
