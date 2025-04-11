import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Chip,
  Divider,
  IconButton,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import {
  approveVisitor,
  checkInVisitor,
  checkOutVisitor,
  deleteVisitor,
} from "../../services/visitorService";
import { formatDateTime, getStatusColor } from "../../utils/formatters";
import ErrorAlert from "../common/ErrorAlert";
import Loader from "../common/Loader";

const VisitorDetailsModal = ({ open, visitor, onClose, onVisitorUpdated }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  const handleApprove = async () => {
    try {
      setLoading(true);
      setError(null);
      await approveVisitor(visitor.id, true);
      setActionSuccess("Visitor approved successfully");
      if (onVisitorUpdated) onVisitorUpdated();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to approve visitor");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      setLoading(true);
      setError(null);
      await approveVisitor(visitor.id, false);
      setActionSuccess("Visitor rejected successfully");
      if (onVisitorUpdated) onVisitorUpdated();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to reject visitor");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await checkInVisitor(visitor.id);
      setActionSuccess("Visitor checked in successfully");
      if (onVisitorUpdated) onVisitorUpdated();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to check in visitor");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setLoading(true);
      setError(null);
      await checkOutVisitor(visitor.id);
      setActionSuccess("Visitor checked out successfully");
      if (onVisitorUpdated) onVisitorUpdated();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to check out visitor");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this visitor?")) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await deleteVisitor(visitor.id);
      setActionSuccess("Visitor deleted successfully");
      if (onVisitorUpdated) onVisitorUpdated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to delete visitor");
    } finally {
      setLoading(false);
    }
  };

  if (!visitor) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Visitor Details
        <IconButton
          onClick={onClose}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Loader message="Processing your request..." />
        ) : (
          <Box>
            <ErrorAlert error={error} onClose={() => setError(null)} />

            {actionSuccess && (
              <Alert
                severity="success"
                sx={{ mb: 2 }}
                onClose={() => setActionSuccess(null)}
              >
                {actionSuccess}
              </Alert>
            )}

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Full Name
                </Typography>
                <Typography variant="body1">{visitor.full_name}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Status
                </Typography>
                <Chip
                  label={visitor.status}
                  color={getStatusColor(visitor.status)}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Email
                </Typography>
                <Typography variant="body1">{visitor.email}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Phone
                </Typography>
                <Typography variant="body1">{visitor.phone}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Host
                </Typography>
                <Typography variant="body1">{visitor.host_name}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Purpose
                </Typography>
                <Typography variant="body1">{visitor.purpose}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Company
                </Typography>
                <Typography variant="body1">
                  {visitor.company || "N/A"}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Scheduled Time
                </Typography>
                <Typography variant="body1">
                  {formatDateTime(visitor.scheduled_time) || "Not scheduled"}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Check-in Time
                </Typography>
                <Typography variant="body1">
                  {formatDateTime(visitor.check_in_time) || "Not checked in"}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Check-out Time
                </Typography>
                <Typography variant="body1">
                  {formatDateTime(visitor.check_out_time) || "Not checked out"}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Created At
                </Typography>
                <Typography variant="body1">
                  {formatDateTime(visitor.created_at)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Visit Duration
                </Typography>
                <Typography variant="body1">
                  {visitor.visit_duration
                    ? `${Math.round(visitor.visit_duration)} minutes`
                    : "N/A"}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                  {visitor.has_photo && (
                    <Box
                      component="img"
                      src={`/api/v1/photos/visitor/${visitor.id}`}
                      alt="Visitor Photo"
                      sx={{
                        maxHeight: 200,
                        maxWidth: "100%",
                        borderRadius: 1,
                        border: "1px solid #eee",
                      }}
                    />
                  )}
                  {!visitor.has_photo && (
                    <Typography color="text.secondary">
                      No photo uploaded
                    </Typography>
                  )}
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: "space-between", p: 2 }}>
        <Box>
          <Button color="error" onClick={handleDelete} disabled={loading}>
            Delete
          </Button>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          {visitor.status === "PENDING" && (
            <>
              <Button
                color="error"
                variant="outlined"
                onClick={handleReject}
                disabled={loading}
                startIcon={<CancelIcon />}
              >
                Reject
              </Button>
              <Button
                color="success"
                variant="contained"
                onClick={handleApprove}
                disabled={loading}
                startIcon={<CheckCircleIcon />}
              >
                Approve
              </Button>
            </>
          )}
          {visitor.status === "APPROVED" && !visitor.check_in_time && (
            <Button
              color="primary"
              variant="contained"
              onClick={handleCheckIn}
              disabled={loading}
            >
              Check In
            </Button>
          )}
          {visitor.status === "CHECKED_IN" && (
            <Button
              color="primary"
              variant="contained"
              onClick={handleCheckOut}
              disabled={loading}
            >
              Check Out
            </Button>
          )}
          <Button onClick={onClose} disabled={loading}>
            Close
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default VisitorDetailsModal;
