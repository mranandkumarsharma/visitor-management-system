import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Avatar,
  Box,
} from "@mui/material";
import AccountCircle from "@mui/icons-material/AccountCircle";
import { useAuth } from "../../contexts/AuthContext";

const Navbar = () => {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
    handleClose();
  };

  const getDashboardPath = () => {
    if (hasRole("admin")) return "/admin";
    if (hasRole("guard")) return "/guard";
    if (hasRole("faculty")) return "/faculty";
    return "/login";
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Visitor Management System
        </Typography>

        {user && (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Button
              color="inherit"
              onClick={() => navigate(getDashboardPath())}
            >
              Dashboard
            </Button>

            <IconButton size="large" onClick={handleMenu} color="inherit">
              <AccountCircle />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleClose}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            >
              <MenuItem disabled>
                <Typography variant="body2">{user.full_name}</Typography>
              </MenuItem>
              <MenuItem disabled>
                <Typography variant="caption" color="text.secondary">
                  {user.department} {user.is_admin ? "(Admin)" : ""}
                </Typography>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>Logout</MenuItem>
            </Menu>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
