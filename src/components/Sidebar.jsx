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
  ExpandMore,
  ExpandLess,
} from "@mui/icons-material";
import { Collapse } from "@mui/material"; // Added Collapse
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
  const [isProfileExpanded, setIsProfileExpanded] = useState(false); // New state for profile section
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
                color: config?.theme === 'light' ? '#6A5F7A' : '#FFFFFF',
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
          {/* Collapsible User Profile Section - shown only when sidebar is open and user is logged in */}
          {open && user && (
            <Box sx={{ px: 1, py: 1 }}> {/* Outer padding for the section */}
              <ListItem 
                button 
                onClick={() => setIsProfileExpanded(!isProfileExpanded)} 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  borderRadius: '8px',
                  py: 0.75, // Reduced padding
                  px: 1, // Reduced padding
                  mb: isProfileExpanded ? 0.5 : 0, // Margin bottom only if expanded
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, overflow: 'hidden' }}>
                  <Avatar src={user?.picture} sx={{ width: 36, height: 36, mr: 1.5 }} />
                  <ListItemText
                    primary={user.name}
                    primaryTypographyProps={{
                      noWrap: !isProfileExpanded, // Truncate only when collapsed
                      sx: { 
                        fontWeight: 500, 
                        fontSize: '0.875rem', 
                        color: theme.palette.text.primary,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }
                    }}
                    sx={{ my: 0 }} // Remove default margins
                  />
                </Box>
                <IconButton size="small" sx={{ ml: 0.5, color: theme.palette.text.secondary }}>
                  {isProfileExpanded ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </ListItem>

              <Collapse in={isProfileExpanded} timeout="auto" unmountOnExit>
                <List component="div" disablePadding sx={{px: 1, pt: 0.5}}>
                  <ListItemText
                    primary={user.email}
                    primaryTypographyProps={{
                      variant: 'caption',
                      sx: { 
                        color: theme.palette.text.secondary, 
                        textAlign: 'center',
                        display: 'block', // Ensure it takes full width
                        mb: 1, // Margin bottom for spacing
                        wordBreak: 'break-all', // Break long emails
                      }
                    }}
                  />
                  <Button
                    fullWidth
                    variant="outlined"
                    color="secondary"
                    size="small"
                    onClick={handleSignOut}
                    disabled={authLoading}
                    sx={{ 
                      textTransform: 'none', 
                      mb: 1, 
                      borderColor: theme.palette.error.main, // Use error color for border
                      color: theme.palette.error.main, // Use error color for text
                      '&:hover': {
                        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(244, 67, 54, 0.1)' : 'rgba(211, 47, 47, 0.08)', // Lighter red for hover
                        borderColor: theme.palette.error.dark,
                      }
                    }}
                  >
                    {authLoading ? "Signing Out..." : "Sign Out"}
                  </Button>
                </List>
              </Collapse>
              <Divider sx={{ my: 1 }} />
            </Box>
          )}
          {/* User Avatar (small) - shown only when sidebar is fully closed */}
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
            {open && <ListItemText primary="Grid" />}
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
          {/* Divider is kept if there are items below it, can be removed if Config was the last item in main list */}
          {/* <Divider sx={{ my: 1 }} /> */} 
        </List>
        <div
          style={{ 
            marginTop: "auto", 
            padding: "16px", 
            textAlign: "center"
          }}
        >
          {/* Sidebar is OPEN */}
          {open && (
            user ? (
              // LOGGED IN and sidebar is OPEN: Config IconButton
              <IconButton 
                component={Link} 
                to="/config" 
                title="Configuration"
                aria-label="Configuration"
                sx={{ 
                  color: isActive('/config') ? theme.palette.primary.main : theme.palette.text.secondary,
                  backgroundColor: isActive('/config') ? 
                                   (config?.darkMode ? 'rgba(144, 202, 249, 0.08)' : 'rgba(33, 150, 243, 0.08)') 
                                   : 'transparent',
                  borderRadius: '8px',
                  p: 1,
                  '&:hover': {
                     backgroundColor: config?.darkMode ? 'rgba(144, 202, 249, 0.12)' : 'rgba(33, 150, 243, 0.12)',
                  },
                }}
              >
                <Settings />
              </IconButton>
            ) : (
              // NOT LOGGED IN and sidebar is OPEN: Sign In Button
              <Button
                onClick={handleSignIn}
                disabled={loading || authLoading}
                variant={config?.theme === 'light' ? "contained" : "outlined"}
                color="primary"
                sx={{ width: '100%', p: 1, textTransform: 'none' }}
              >
                {authLoading ? "..." : "Sign In"}
              </Button>
            )
          )}

          {/* Sidebar is CLOSED */}
          {!open && (
            <IconButton
              onClick={!user ? handleSignIn : undefined} // Sign in if no user; no action if user (avatar is display only)
              disabled={authLoading && !user}
              title={user ? user.name : "Sign In"}
              aria-label={user ? user.name : "Sign In"}
              sx={{
                color: theme.palette.text.secondary,
                p: 0.75, 
              }}
            >
              {authLoading && !user ? (
                "..." // Show loading indicator if auth is in progress for sign-in
              ) : user ? (
                <Avatar src={user?.picture} sx={{ width: 28, height: 28 }} />
              ) : (
                <Settings sx={{ fontSize: 24 }} /> // Settings icon also for Sign In when closed and no user
              )}
            </IconButton>
          )}
        </div>
      </div>
    </Drawer>
  );
};

export default Sidebar;
