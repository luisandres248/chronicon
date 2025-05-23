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
  Box, // Added Box
  Typography, // Added Typography
} from "@mui/material";
import {
  Settings,
  ChevronLeft, // Will be removed if MenuIcon is always used, but keep for now
  ChevronRight, // Will be removed if MenuIcon is always used, but keep for now
  Menu as MenuIcon, // Added MenuIcon
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
        {/* Logo and Toggle Button Container */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: open ? 'space-between' : 'center', // Center icon when closed
          p: 1, 
          height: 56, // Standard AppBar height for consistency
          maxHeight: 56,
        }}>
          {open && (
            <Box 
              id="app-logo-container" 
              sx={{ 
                p: 1, // Reduced padding from p:2
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                flexGrow: 1, // Allow logo to take space
                overflow: 'hidden', // Prevent logo from causing overflow
              }}
            >
              <Typography variant="h6" component="div" sx={{
                fontFamily: 'serif',
                textTransform: 'uppercase',
                color: '#6A5F7A',
                fontWeight: 'bold',
                fontSize: '1.4rem', 
                whiteSpace: 'nowrap',
                cursor: 'default', // Indicate it's not clickable
              }}>
                CHRONICON
              </Typography>
            </Box>
          )}
          <IconButton 
            onClick={() => setOpen(!open)}
            sx={{ color: theme.palette.text.primary }}
          >
            <MenuIcon />
            {/* {open ? <ChevronLeft /> : <MenuIcon />}  // Or keep ChevronLeft to close, MenuIcon to open when closed */}
            {/* Forcing MenuIcon always as per interpretation of "classic three lines" */}
          </IconButton>
        </Box>
        
        <Divider sx={{ mb: open ? 1 : 0 }} /> 

        <List sx={{pt:0}}>
          {/* User Avatar and Name Section - shown only when open */}
          {open && user && (
            <>
              <ListItem sx={{ justifyContent: "flex-start", flexDirection: 'column', alignItems: 'center', pt: 1, pb:1 }}>
                <Avatar src={user?.picture} sx={{width: 48, height: 48, mb: 0.5}} />
                <ListItemText 
                    primary={user.name} 
                    sx={{ 
                      textAlign: 'center',
                      "& .MuiListItemText-primary": {
                        color: theme.palette.text.primary,
                        fontWeight: 500,
                        fontSize: '0.875rem'
                      }
                    }} 
                  />
              </ListItem>
              <Divider sx={{ my: 1 }} />
            </>
          )}
          {/* User Avatar (small) - shown only when closed */}
          {!open && user && (
             <>
              <ListItem sx={{ justifyContent: "center", py:1.5 }}>
                  <Avatar src={user?.picture} sx={{width: 36, height: 36}}/>
              </ListItem>
              <Divider sx={{ my: 1 }} />
             </>
          )}
          
          {/* Navigation Items */}
          <ListItem 
            component={Link} 
            to="/" 
            disabled={!user}
            sx={{
              color: isActive('/') ? theme.palette.primary.main : theme.palette.text.primary,
              backgroundColor: isActive('/') ? (isDarkMode ? 'rgba(144, 202, 249, 0.08)' : 'rgba(33, 150, 243, 0.08)') : 'transparent',
              borderRadius: '8px',
              mx: open ? 1 : 'auto', // Center when closed
              my: 0.5,
              width: open ? 'auto' : 'fit-content', // Adjust width for centering when closed
              justifyContent: open ? 'flex-start' : 'center',
              '&:hover': {
                backgroundColor: isDarkMode ? 'rgba(144, 202, 249, 0.12)' : 'rgba(33, 150, 243, 0.12)',
              },
            }}
          >
            <ListItemIcon sx={{ 
              color: isActive('/') ? theme.palette.primary.main : 'inherit',
              minWidth: 'auto', // Allow icon to define its own width
              justifyContent: 'center', // Center icon
              mr: open ? 1 : 0, // Margin right only when open
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
              mx: open ? 1 : 'auto',
              my: 0.5,
              width: open ? 'auto' : 'fit-content',
              justifyContent: open ? 'flex-start' : 'center',
              '&:hover': {
                backgroundColor: isDarkMode ? 'rgba(144, 202, 249, 0.12)' : 'rgba(33, 150, 243, 0.12)',
              },
            }}
          >
            <ListItemIcon sx={{ 
              color: isActive('/calendar') ? theme.palette.primary.main : 'inherit',
              minWidth: 'auto',
              justifyContent: 'center',
              mr: open ? 1 : 0,
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
              mx: open ? 1 : 'auto',
              my: 0.5,
              width: open ? 'auto' : 'fit-content',
              justifyContent: open ? 'flex-start' : 'center',
              '&:hover': {
                backgroundColor: isDarkMode ? 'rgba(144, 202, 249, 0.12)' : 'rgba(33, 150, 243, 0.12)',
              },
            }}
          >
            <ListItemIcon sx={{ 
              color: isActive('/config') ? theme.palette.primary.main : 'inherit',
              minWidth: 'auto',
              justifyContent: 'center',
              mr: open ? 1 : 0,
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
            variant={config?.theme === 'light' ? "contained" : "outlined"} // Updated based on theme
            color="primary"
            sx={{ 
              minWidth: open ? 'auto' : '40px', // Ensure button is small when closed
              width: open ? '100%' : 'auto', // Full width when open
              p: open ? 1 : 0.5, // Adjust padding for closed state
              textTransform: 'none',
            }}
          >
            {authLoading
              ? "..."
              : open
              ? user
                ? "Sign Out"
                : "Sign In"
              : user // When closed
              ? <Avatar src={user?.picture} sx={{width:24, height:24}}/> // Show small avatar if user logged in
              : <Settings sx={{fontSize: 24}}/> /* Fallback icon if no user and closed */ }
          </Button>
        </div>
      </div>
    </Drawer>
  );
};

export default Sidebar;
