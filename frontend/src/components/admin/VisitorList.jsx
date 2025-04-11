import React, { useState, useEffect } from "react";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Button,
  IconButton,
  Box,
  TextField,
  MenuItem,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import RefreshIcon from "@mui/icons-material/Refresh";
import ErrorAlert from "../common/ErrorAlert";
import Loader from "../common/Loader";
import VisitorDetailsModal from "./VisitorDetailsModal";
import { getVisitors } from "../../services/visitorService";
import { formatDateTime, getStatusColor } from "../../utils/formatters";
import axios from "axios";

const VisitorList = () => {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const token = localStorage.getItem("token");

  const fetchVisitors = async () => {
    try {
      setError(null);
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const data = await getVisitors(params);
      setVisitors(data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to fetch visitors");
      console.error("Error fetching visitors:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitors();
  }, [statusFilter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchVisitors();
    setRefreshing(false);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewDetails = (visitor) => {
    setSelectedVisitor(visitor);
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
  };

  const handleApprove = async (visitorId) => {
    try {
      const res = await axios.post(
        `http://localhost:8000/api/v1/visitors/${visitorId}/approval`,
        {
          approved: true,
          notes: "Approved via frontend",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("Approval response:", res.data);
      await fetchVisitors(); // Refresh list after approval
    } catch (err) {
      setError(err.response?.data?.detail || "Approval failed");
      console.error("Approval error:", err);
    }
  };

  const handleReject = async (visitorId) => {
    try {
      const res = await axios.post(
        `http://localhost:8000/api/v1/visitors/${visitorId}/approval`,
        {
          approved: false,
          notes: "Rejected via frontend",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("Rejection response:", res.data);
      await fetchVisitors(); // Refresh list after rejection
    } catch (err) {
      setError(err.response?.data?.detail || "Rejection failed");
      console.error("Rejection error:", err);
    }
  };

  const filteredVisitors = visitors.filter(
    (visitor) =>
      visitor.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      visitor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      visitor.host_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && !refreshing) {
    return <Loader />;
  }

  return (
    <Box>
      <ErrorAlert error={error} onClose={() => setError(null)} />

      <Box sx={{ display: "flex", mb: 2, gap: 2 }}>
        <TextField
          label="Search"
          variant="outlined"
          size="small"
          fullWidth
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />

        <TextField
          select
          label="Status"
          variant="outlined"
          size="small"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="">All Statuses</MenuItem>
          <MenuItem value="PENDING">Pending</MenuItem>
          <MenuItem value="APPROVED">Approved</MenuItem>
          <MenuItem value="REJECTED">Rejected</MenuItem>
          <MenuItem value="CHECKED_IN">Checked In</MenuItem>
          <MenuItem value="CHECKED_OUT">Checked Out</MenuItem>
          <MenuItem value="EXPIRED">Expired</MenuItem>
        </TextField>

        <IconButton
          color="primary"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? <CircularProgress size={24} /> : <RefreshIcon />}
        </IconButton>
      </Box>

      <Paper sx={{ width: "100%", overflow: "hidden" }}>
        <TableContainer>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Host</TableCell>
                <TableCell>Purpose</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Scheduled Time</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredVisitors
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((visitor) => (
                  <TableRow key={visitor.id} hover>
                    <TableCell>{visitor.full_name}</TableCell>
                    <TableCell>{visitor.email}</TableCell>
                    <TableCell>{visitor.host_name}</TableCell>
                    <TableCell>{visitor.purpose}</TableCell>
                    <TableCell>
                      <Chip
                        label={visitor.status}
                        color={getStatusColor(visitor.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {formatDateTime(visitor.scheduled_time)}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleViewDetails(visitor)}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                      {visitor.status === "pending" && (
                        <>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => handleApprove(visitor.id)}
                            sx={{ ml: 1 }}
                          >
                            Approve
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            color="error"
                            onClick={() => handleReject(visitor.id)}
                            sx={{ ml: 1 }}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredVisitors.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {selectedVisitor && (
        <VisitorDetailsModal
          open={detailsOpen}
          visitor={selectedVisitor}
          onClose={handleCloseDetails}
          onVisitorUpdated={handleRefresh}
        />
      )}
    </Box>
  );
};

export default VisitorList;
