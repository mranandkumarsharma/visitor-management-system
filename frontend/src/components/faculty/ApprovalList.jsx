import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Avatar,
  Divider,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";
import { useAuth } from "../../contexts/AuthContext";
import { getVisitors, approveVisitor } from "../../services/visitorService";
import ErrorAlert from "../common/ErrorAlert";
import Loader from "../common/Loader";
import { formatDateTime } from "../../utils/formatters";

const ApprovalList = () => {
  const { user } = useAuth();
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectVisitor, setRejectVisitor] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchPendingVisitors = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all visitors for the current host
      const data = await getVisitors({
        status: "pending", // Backend filter
        host_id: user?.id,
      });

      // Apply additional frontend filter to ensure only pending visitors
      const pendingVisitors = data.filter((v) => v.status === "pending");

      console.log("All visitors:", data);
      console.log("Filtered pending visitors:", pendingVisitors);

      // Update state with only the pending visitors
      setVisitors(pendingVisitors);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Failed to fetch pending visitors"
      );
      console.error("Error fetching visitors:", err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (user?.id) {
      fetchPendingVisitors();
    }
  }, [user]);

  const handleApprove = async (visitor) => {
    try {
      setLoading(true);
      setError(null);

      await approveVisitor(visitor.id, true);

      setSuccess(`${visitor.full_name}'s visit has been approved`);
      fetchPendingVisitors(); // Refresh the list
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to approve visitor");
      console.error("Error approving visitor:", err);
    } finally {
      setLoading(false);
    }
  };

  const openRejectDialog = (visitor) => {
    setRejectVisitor(visitor);
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const closeRejectDialog = () => {
    setRejectDialogOpen(false);
    setRejectVisitor(null);
  };

  const handleReject = async () => {
    if (!rejectVisitor) return;

    try {
      setLoading(true);
      setError(null);

      await approveVisitor(rejectVisitor.id, false, rejectReason);

      setSuccess(`${rejectVisitor.full_name}'s visit has been rejected`);
      fetchPendingVisitors(); // Refresh the list
      closeRejectDialog();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to reject visitor");
      console.error("Error rejecting visitor:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && visitors.length === 0) {
    return <Loader />;
  }

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

      <Box
        sx={{
          mb: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h6">
          Pending Approval Requests ({visitors.length})
        </Typography>

        <Button size="small" onClick={fetchPendingVisitors} disabled={loading}>
          Refresh
        </Button>
      </Box>

      {visitors.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <Typography variant="body1" color="text.secondary">
            No pending approval requests
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {visitors.map((visitor) => (
            <Grid item xs={12} md={6} lg={4} key={visitor.id}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: "flex", mb: 2 }}>
                    <Avatar sx={{ bgcolor: "primary.main", mr: 2 }}>
                      <PersonIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1">
                        {visitor.full_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {visitor.email}
                      </Typography>
                    </Box>
                  </Box>

                  <Divider sx={{ mb: 2 }} />

                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Company
                      </Typography>
                      <Typography variant="body2">
                        {visitor.company || "N/A"}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Purpose
                      </Typography>
                      <Typography variant="body2">{visitor.purpose}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">
                        Phone
                      </Typography>
                      <Typography variant="body2">{visitor.phone}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">
                        Scheduled For
                      </Typography>
                      <Typography variant="body2">
                        {formatDateTime(visitor.scheduled_time) ||
                          "Not specified"}
                      </Typography>
                    </Grid>
                  </Grid>

                  <Box
                    sx={{
                      mt: 2,
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<ThumbDownIcon />}
                      onClick={() => openRejectDialog(visitor)}
                      disabled={loading}
                    >
                      Reject
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<ThumbUpIcon />}
                      onClick={() => handleApprove(visitor)}
                      disabled={loading}
                    >
                      Approve
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onClose={closeRejectDialog}>
        <DialogTitle>Reject Visitor</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Please provide a reason for rejecting {rejectVisitor?.full_name}'s
            visit:
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Reason for rejection"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRejectDialog}>Cancel</Button>
          <Button onClick={handleReject} color="error">
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApprovalList;
