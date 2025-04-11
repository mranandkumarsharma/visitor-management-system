import React, { useState } from "react";
import { Container, Box, Tab } from "@mui/material";
import { TabContext, TabList, TabPanel } from "@mui/lab";

import Navbar from "../components/common/Navbar";
import Footer from "../components/common/Footer";
import PageTitle from "../components/common/PageTitle";
import VisitorList from "../components/admin/VisitorList";
import UserManagement from "../components/admin/UserManagement";
import Statistics from "../components/admin/Statistics";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("1");

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />
      <Container component="main" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        <PageTitle
          title="Admin Dashboard"
          subtitle="Manage the entire system"
        />

        <TabContext value={activeTab}>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <TabList
              onChange={handleTabChange}
              aria-label="admin dashboard tabs"
            >
              <Tab label="Visitors" value="1" />
              <Tab label="User Management" value="2" />
              <Tab label="System Statistics" value="3" />
            </TabList>
          </Box>
          <TabPanel value="1">
            <VisitorList />
          </TabPanel>
          <TabPanel value="2">
            <UserManagement />
          </TabPanel>
          <TabPanel value="3">
            <Statistics />
          </TabPanel>
        </TabContext>
      </Container>
      <Footer />
    </Box>
  );
};

export default AdminDashboard;
