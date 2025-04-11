import React, { useState } from "react";
import { Container, Box, Tab } from "@mui/material";
import { TabContext, TabList, TabPanel } from "@mui/lab";

import Navbar from "../components/common/Navbar";
import Footer from "../components/common/Footer";
import PageTitle from "../components/common/PageTitle";
import CheckIn from "../components/guard/CheckIn";
import CheckOut from "../components/guard/CheckOut";
import VisitorVerification from "../components/guard/VisitorVerification";

const GuardDashboard = () => {
  const [activeTab, setActiveTab] = useState("1");

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />
      <Container component="main" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        <PageTitle
          title="Security Dashboard"
          subtitle="Manage visitor check-in and check-out"
        />

        <TabContext value={activeTab}>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <TabList
              onChange={handleTabChange}
              aria-label="guard dashboard tabs"
            >
              <Tab label="Check In" value="1" />
              <Tab label="Check Out" value="2" />
              <Tab label="Verify Visitor" value="3" />
            </TabList>
          </Box>
          <TabPanel value="1">
            <CheckIn />
          </TabPanel>
          <TabPanel value="2">
            <CheckOut />
          </TabPanel>
          <TabPanel value="3">
            <VisitorVerification />
          </TabPanel>
        </TabContext>
      </Container>
      <Footer />
    </Box>
  );
};

export default GuardDashboard;
