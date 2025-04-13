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
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import { checkOutVisitor } from "../../services/visitorService";
import ErrorAlert from "../common/ErrorAlert";
import Loader from "../common/Loader";
import { formatDateTime, getStatusColor } from "../../utils/formatters";
import axios from "axios";

const CheckOut = () => {
  const [visitors, setVisitors] = useState([]);
  const [filteredVisitors, setFilteredVisitors] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedVisitor, setSelectedVisitor] = useState(null);

  const fetchVisitors = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get token from localStorage
      const token = localStorage.getItem("token");

      // Direct API call with proper parameters
      const response = await axios.get(
        "http://localhost:8000/api/v1/visitors/?skip=0&limit=100&status=checked_in",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            accept: "application/json",
          },
        }
      );

      console.log("API response:", response.data);

      // Filter to only include checked-in visitors (those that have check_in_time but no check_out_time)
      const checkedInVisitors = response.data.filter(
        (visitor) => visitor.check_in_time && !visitor.check_out_time
      );

      console.log("Filtered checked-in visitors:", checkedInVisitors);

      setVisitors(checkedInVisitors);
      setFilteredVisitors(checkedInVisitors);
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

  const handleCheckOut = async () => {
    if (!selectedVisitor) return;

    try {
      setLoading(true);
      setError(null);

      // Using the existing service function
      await checkOutVisitor(selectedVisitor.id);

      setSuccess(
        `${selectedVisitor.full_name} has been successfully checked out`
      );
      setSelectedVisitor(null);
      fetchVisitors(); // Refresh the list
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to check out visitor");
      console.error("Error during check-out:", err);
    } finally {
      setLoading(false);
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
              Currently Checked-In Visitors
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
                No visitors currently checked in
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
                            {` — ${formatDateTime(visitor.check_in_time)}`}
                          </>
                        }
                      />
                      <Chip label="CHECKED IN" color="success" size="small" />
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
              Check-Out Details
            </Typography>

            {!selectedVisitor ? (
              <Typography
                variant="body2"
                color="text.secondary"
                align="center"
                sx={{ py: 4 }}
              >
                Select a visitor from the list to check out
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
                      Check-in Time
                    </Typography>
                    <Typography variant="body1">
                      {formatDateTime(selectedVisitor.check_in_time)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ mt: 2 }}>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<ExitToAppIcon />}
                        onClick={handleCheckOut}
                        disabled={loading}
                      >
                        Check Out
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
                <Box sx={{ mt: 3, mb: 2 }}>
                  {selectedVisitor.has_photo && (
                    <Box
                      component="img"
                      src={`/api/v1/photos/visitor/${selectedVisitor.id}`}
                      alt="Visitor Photo"
                      sx={{ maxHeight: 200, maxWidth: "100%", borderRadius: 1 }}
                    />
                  )}
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CheckOut;
