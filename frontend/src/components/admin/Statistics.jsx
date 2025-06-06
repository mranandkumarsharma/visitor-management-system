import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Button,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import BusinessIcon from "@mui/icons-material/Business";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import {
  getVisitorStats,
  getHostStats,
  getSystemStats,
} from "../../services/statisticsService";
import ErrorAlert from "../common/ErrorAlert";
import Loader from "../common/Loader";

const Statistics = () => {
  const [visitorStats, setVisitorStats] = useState(null);
  const [hostStats, setHostStats] = useState(null);
  const [systemStats, setSystemStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAllStats = async () => {
    try {
      setError(null);
      setLoading(true);

      // Fetch each endpoint separately to better handle errors
      try {
        const visitorData = await getVisitorStats();
        setVisitorStats(visitorData);
      } catch (visitorErr) {
        console.error("Error fetching visitor stats:", visitorErr);
        setVisitorStats(null);
      }

      try {
        const hostData = await getHostStats();
        setHostStats(hostData);
      } catch (hostErr) {
        console.error("Error fetching host stats:", hostErr);
        setHostStats(null);
      }

      try {
        const systemData = await getSystemStats();
        setSystemStats(systemData);
      } catch (systemErr) {
        console.error("Error fetching system stats:", systemErr);
        setSystemStats(null);
      }
    } catch (err) {
      setError("Failed to fetch statistics. Please try again later.");
      console.error("Error in fetchAllStats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllStats();
  }, []);

  return (
    <Box>
      {error && (
        <ErrorAlert
          error={error}
          onClose={() => setError(null)}
          action={
            <Button color="inherit" size="small" onClick={fetchAllStats}>
              Retry
            </Button>
          }
        />
      )}

      <Grid container spacing={3}>
        {/* Visitor Overview */}
        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              {loading ? (
                <Box display="flex" justifyContent="center" p={2}>
                  <CircularProgress size={30} />
                </Box>
              ) : (
                <>
                  <Typography variant="h6" gutterBottom>
                    Visitor Overview
                  </Typography>
                  <Typography variant="h3" color="primary" gutterBottom>
                    {visitorStats?.total_visitors || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total visitors
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle2" gutterBottom>
                    By Status
                  </Typography>
                  <Grid container spacing={1}>
                    {visitorStats?.status_counts &&
                      Object.entries(visitorStats.status_counts).map(
                        ([status, count]) => (
                          <Grid item xs={6} key={status}>
                            <Box display="flex" alignItems="center">
                              <Box
                                sx={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: "50%",
                                  bgcolor:
                                    status === "APPROVED"
                                      ? "info.main"
                                      : status === "PENDING"
                                      ? "warning.main"
                                      : status === "CHECKED_IN"
                                      ? "success.main"
                                      : status === "REJECTED" ||
                                        status === "EXPIRED"
                                      ? "error.main"
                                      : "grey.500",
                                  mr: 1,
                                }}
                              />
                              <Typography variant="body2">
                                {status.toLowerCase()}: {count}
                              </Typography>
                            </Box>
                          </Grid>
                        )
                      )}
                  </Grid>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Rest of your components with similar loading checks */}
        {/* Purpose Stats */}
        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              {loading ? (
                <Box display="flex" justifyContent="center" p={2}>
                  <CircularProgress size={30} />
                </Box>
              ) : (
                <>
                  <Typography variant="h6" gutterBottom>
                    Visit Purposes
                  </Typography>

                  {visitorStats?.purpose_counts &&
                    Object.entries(visitorStats.purpose_counts).map(
                      ([purpose, count]) => (
                        <Box key={purpose} sx={{ mb: 1 }}>
                          <Box
                            display="flex"
                            justifyContent="space-between"
                            alignItems="center"
                          >
                            <Typography variant="body2">
                              {purpose.toLowerCase()}
                            </Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {count}
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              mt: 0.5,
                              width: "100%",
                              height: 8,
                              borderRadius: 4,
                              bgcolor: "grey.200",
                              overflow: "hidden",
                            }}
                          >
                            <Box
                              sx={{
                                width: `${
                                  (count / (visitorStats.total_visitors || 1)) *
                                  100
                                }%`,
                                height: "100%",
                                bgcolor: "primary.main",
                              }}
                            />
                          </Box>
                        </Box>
                      )
                    )}

                  <Divider sx={{ my: 2 }} />

                  <Box display="flex" alignItems="center">
                    <AccessTimeIcon
                      sx={{ mr: 1, color: "text.secondary" }}
                      fontSize="small"
                    />
                    <Typography variant="body2">
                      Average Visit Duration:{" "}
                      {Math.round(
                        visitorStats?.average_visit_duration_minutes || 0
                      )}{" "}
                      minutes
                    </Typography>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Host Stats */}
        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              {loading ? (
                <Box display="flex" justifyContent="center" p={2}>
                  <CircularProgress size={30} />
                </Box>
              ) : (
                <>
                  <Typography variant="h6" gutterBottom>
                    Top Hosts
                  </Typography>

                  {hostStats?.top_hosts?.length > 0 ? (
                    <List dense>
                      {hostStats.top_hosts.map((host, index) => (
                        <ListItem key={host.host_id}>
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <PersonIcon
                              color={index < 3 ? "primary" : "action"}
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={host.host_name}
                            secondary={`${host.department} • ${host.visitor_count} visitors`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No host data available
                    </Typography>
                  )}

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle2" gutterBottom>
                    Departments
                  </Typography>
                  {hostStats?.departments?.length > 0 ? (
                    hostStats.departments.map((dept) => (
                      <Box
                        key={dept.department}
                        display="flex"
                        justifyContent="space-between"
                        sx={{ my: 0.5 }}
                      >
                        <Box display="flex" alignItems="center">
                          <BusinessIcon
                            fontSize="small"
                            sx={{ mr: 1, color: "text.secondary" }}
                          />
                          <Typography variant="body2">
                            {dept.department}
                          </Typography>
                        </Box>
                        <Typography variant="body2" fontWeight="bold">
                          {dept.visitor_count}
                        </Typography>
                      </Box>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No department data available
                    </Typography>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* System Stats */}
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              {loading ? (
                <Box display="flex" justifyContent="center" p={2}>
                  <CircularProgress size={30} />
                </Box>
              ) : (
                <>
                  <Typography variant="h6" gutterBottom>
                    System Overview
                  </Typography>

                  <Grid container spacing={3}>
                    <Grid item xs={6} md={3}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="h4" color="primary.main">
                          {systemStats?.counts?.users || 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total Users
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="h4" color="info.main">
                          {systemStats?.counts?.active_badges || 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Active Badges
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="h4" color="success.main">
                          {systemStats?.counts?.active_checkins || 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Active Check-ins
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="h4" color="warning.main">
                          {systemStats?.counts?.upcoming_visits_today || 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Upcoming Today
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Add a refresh button */}
      <Box display="flex" justifyContent="center" mt={3}>
        <Button variant="outlined" onClick={fetchAllStats} disabled={loading}>
          Refresh Statistics
        </Button>
      </Box>
    </Box>
  );
};

export default Statistics;
