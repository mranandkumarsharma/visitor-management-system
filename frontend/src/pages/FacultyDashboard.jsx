import React, { useState } from "react";
import { Container, Box, Tab } from "@mui/material";
import { TabContext, TabList, TabPanel } from "@mui/lab";

import Navbar from "../components/common/Navbar";
import Footer from "../components/common/Footer";
import PageTitle from "../components/common/PageTitle";
import ApprovalList from "../components/faculty/ApprovalList";
import PreRegistration from "../components/faculty/PreRegistration";
import VisitorHistory from "../components/faculty/VisitorHistory";

const FacultyDashboard = () => {
  const [activeTab, setActiveTab] = useState("1");

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />
      <Container component="main" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        <PageTitle title="Faculty Dashboard" subtitle="Manage your visitors" />

        <TabContext value={activeTab}>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <TabList
              onChange={handleTabChange}
              aria-label="faculty dashboard tabs"
            >
              <Tab label="Approval Requests" value="1" />
              <Tab label="Pre-Register Visitor" value="2" />
              <Tab label="Visitor History" value="3" />
            </TabList>
          </Box>
          <TabPanel value="1">
            <ApprovalList />
          </TabPanel>
          <TabPanel value="2">
            <PreRegistration />
          </TabPanel>
          <TabPanel value="3">
            <VisitorHistory />
          </TabPanel>
        </TabContext>
      </Container>
      <Footer />
    </Box>
  );
};

export default FacultyDashboard;
