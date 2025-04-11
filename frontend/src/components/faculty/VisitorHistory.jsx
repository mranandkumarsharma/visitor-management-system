import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  Chip,
  IconButton,
  MenuItem,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { getVisitors } from "../../services/visitorService";
import { useAuth } from "../../contexts/AuthContext";
import ErrorAlert from "../common/ErrorAlert";
import Loader from "../common/Loader";
import VisitorDetailsModal from "../admin/VisitorDetailsModal";
import { formatDateTime, getStatusColor } from "../../utils/formatters";

const VisitorHistory = () => {
  const { user } = useAuth();
  const [visitors, setVisitors] = useState([]);
  const [filteredVisitors, setFilteredVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const fetchVisitors = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all visitors for the current host
      const data = await getVisitors({
        host_id: user?.id,
      });

      setVisitors(data);
      setFilteredVisitors(data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to fetch visitors");
      console.error("Error fetching visitors:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchVisitors();
    }
  }, [user]);

  useEffect(() => {
    let filtered = [...visitors];

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter((visitor) => visitor.status === statusFilter);
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (visitor) =>
          visitor.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          visitor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          visitor.company?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredVisitors(filtered);
    setPage(0); // Reset to first page when filters change
  }, [searchTerm, statusFilter, visitors]);

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

  const handleVisitorUpdated = () => {
    fetchVisitors();
  };

  if (loading && visitors.length === 0) {
    return <Loader />;
  }

  return (
    <Box>
      <ErrorAlert error={error} onClose={() => setError(null)} />

      <Paper sx={{ mb: 2, p: 2 }}>
        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
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
        </Box>

        <TableContainer>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Purpose</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Scheduled Time</TableCell>
                <TableCell>Check-in/out</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredVisitors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No visitors found
                  </TableCell>
                </TableRow>
              ) : (
                filteredVisitors
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((visitor) => (
                    <TableRow key={visitor.id} hover>
                      <TableCell>{visitor.full_name}</TableCell>
                      <TableCell>{visitor.email}</TableCell>
                      <TableCell>{visitor.purpose}</TableCell>
                      <TableCell>
                        <Chip
                          label={visitor.status}
                          color={getStatusColor(visitor.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {formatDateTime(visitor.scheduled_time) ||
                          "Not scheduled"}
                      </TableCell>
                      <TableCell>
                        {visitor.check_in_time ? (
                          <>
                            <Typography variant="caption" display="block">
                              In: {formatDateTime(visitor.check_in_time)}
                            </Typography>
                            {visitor.check_out_time && (
                              <Typography variant="caption" display="block">
                                Out: {formatDateTime(visitor.check_out_time)}
                              </Typography>
                            )}
                          </>
                        ) : (
                          "Not checked in"
                        )}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => handleViewDetails(visitor)}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
              )}
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
          onVisitorUpdated={handleVisitorUpdated}
        />
      )}
    </Box>
  );
};

export default VisitorHistory;
