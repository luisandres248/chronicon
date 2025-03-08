"use client";

import { useContext, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Button,
  IconButton,
  Divider,
  useTheme,
} from "@mui/material";
import {
  Settings,
  ChevronLeft,
  ChevronRight,
  GridView,
  CalendarMonth,
} from "@mui/icons-material";
import { GlobalContext } from "../context/GlobalContext";
import {
  initGoogleAPI,
  signIn,
  signOut,
  getOrCreateChroniconCalendar,
  checkSignInStatus,
} from "../services/googleService";

const drawerWidth = 240;

const Sidebar = () => {
  const { user, setUser, setCalendar, loading, config } = useContext(GlobalContext);
  const [open, setOpen] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const theme = useTheme();
  const location = useLocation();
  const isDarkMode = config?.darkMode;

  useEffect(() => {
    const initAuth = async () => {
      try {
        await initGoogleAPI();
        // Check if we have a stored session
        const { profile, calendar } = checkSignInStatus();
        if (profile && calendar) {
          setUser(profile);
          setCalendar(calendar);
        }
      } catch (error) {
        console.error("Error initializing Google API:", error);
        setAuthError("Failed to initialize Google API");
      }
    };
    initAuth();
  }, [setUser, setCalendar]);

  const handleSignIn = async () => {
    try {
      setAuthLoading(true);
      setAuthError(null);
      const response = await signIn();
      if (response?.userProfile) {
        console.log("Sign in successful:", response);
        setUser(response.userProfile);
        setCalendar(response.calendar);
      } else {
        setAuthError("Failed to get user profile");
      }
    } catch (error) {
      if (error?.error !== "popup_closed_by_user") {
        console.error("Error signing in:", error);
        setAuthError(error.message || "Failed to sign in");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setAuthLoading(true);
      setAuthError(null);
      await signOut();
      setUser(null);
      setCalendar(null);
    } catch (error) {
      console.error("Error signing out:", error);
      setAuthError(error.message || "Failed to sign out");
    } finally {
      setAuthLoading(false);
    }
  };

  // Determinar si un elemento está activo
  const isActive = (path) => location.pathname === path;

  return (
    <Drawer
      variant="permanent"
      anchor="left"
      sx={{
        width: open ? drawerWidth : 72,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: open ? drawerWidth : 72,
          transition: "width 0.2s ease-in-out",
          overflowX: "hidden",
          borderRight: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.paper,
        },
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            padding: "8px",
          }}
        >
          <IconButton 
            onClick={() => setOpen(!open)}
            sx={{ color: theme.palette.text.primary }}
          >
            {open ? <ChevronLeft /> : <ChevronRight />}
          </IconButton>
        </div>
        <List>
          <ListItem sx={{ justifyContent: open ? "flex-start" : "center" }}>
            <Avatar src={user?.picture} />
            {open && user && (
              <ListItemText 
                primary={user.name} 
                sx={{ 
                  ml: 2,
                  "& .MuiListItemText-primary": {
                    color: theme.palette.text.primary,
                    fontWeight: 500,
                  }
                }} 
              />
            )}
          </ListItem>
          <Divider sx={{ my: 1 }} />
          <ListItem 
            component={Link} 
            to="/" 
            disabled={!user}
            sx={{
              color: isActive('/') ? theme.palette.primary.main : theme.palette.text.primary,
              backgroundColor: isActive('/') ? (isDarkMode ? 'rgba(144, 202, 249, 0.08)' : 'rgba(33, 150, 243, 0.08)') : 'transparent',
              borderRadius: '8px',
              mx: 1,
              width: 'auto',
              '&:hover': {
                backgroundColor: isDarkMode ? 'rgba(144, 202, 249, 0.12)' : 'rgba(33, 150, 243, 0.12)',
              },
            }}
          >
            <ListItemIcon sx={{ 
              color: isActive('/') ? theme.palette.primary.main : 'inherit',
              minWidth: open ? 40 : 'auto',
            }}>
              <GridView />
            </ListItemIcon>
            {open && <ListItemText primary="Grid View" />}
          </ListItem>
          <ListItem 
            component={Link} 
            to="/calendar" 
            disabled={!user}
            sx={{
              color: isActive('/calendar') ? theme.palette.primary.main : theme.palette.text.primary,
              backgroundColor: isActive('/calendar') ? (isDarkMode ? 'rgba(144, 202, 249, 0.08)' : 'rgba(33, 150, 243, 0.08)') : 'transparent',
              borderRadius: '8px',
              mx: 1,
              width: 'auto',
              '&:hover': {
                backgroundColor: isDarkMode ? 'rgba(144, 202, 249, 0.12)' : 'rgba(33, 150, 243, 0.12)',
              },
            }}
          >
            <ListItemIcon sx={{ 
              color: isActive('/calendar') ? theme.palette.primary.main : 'inherit',
              minWidth: open ? 40 : 'auto',
            }}>
              <CalendarMonth />
            </ListItemIcon>
            {open && <ListItemText primary="Calendar" />}
          </ListItem>
          <Divider sx={{ my: 1 }} />
          <ListItem 
            component={Link} 
            to="/config"
            sx={{
              color: isActive('/config') ? theme.palette.primary.main : theme.palette.text.primary,
              backgroundColor: isActive('/config') ? (isDarkMode ? 'rgba(144, 202, 249, 0.08)' : 'rgba(33, 150, 243, 0.08)') : 'transparent',
              borderRadius: '8px',
              mx: 1,
              width: 'auto',
              '&:hover': {
                backgroundColor: isDarkMode ? 'rgba(144, 202, 249, 0.12)' : 'rgba(33, 150, 243, 0.12)',
              },
            }}
          >
            <ListItemIcon sx={{ 
              color: isActive('/config') ? theme.palette.primary.main : 'inherit',
              minWidth: open ? 40 : 'auto',
            }}>
              <Settings />
            </ListItemIcon>
            {open && <ListItemText primary="Config" />}
          </ListItem>
        </List>
        <div
          style={{ marginTop: "auto", padding: "16px", textAlign: "center" }}
        >
          <Button
            onClick={user ? handleSignOut : handleSignIn}
            disabled={loading || authLoading}
            variant={isDarkMode ? "outlined" : "contained"}
            color="primary"
            sx={{ 
              minWidth: open ? "auto" : "40px",
              textTransform: 'none',
            }}
          >
            {authLoading
              ? "..."
              : open
              ? user
                ? "Sign Out"
                : "Sign In"
              : user
              ? "Out"
              : "In"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
};

export default Sidebar;
