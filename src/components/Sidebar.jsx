import { useContext, useState } from "react";
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
  Box,
  Typography,
  Collapse,
} from "@mui/material";
import {
  Settings,
  Menu as MenuIcon,
  GridView,
  CalendarMonth,
  ExpandMore,
  ExpandLess,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { GlobalContext } from "../context/GlobalContext";
import SmallLogo from "./SmallLogo";

const drawerWidth = 280;

const Sidebar = () => {
  const { t } = useTranslation();
  const {
    user,
    config,
    authLoading,
    handleSignIn,
    handleSignOut,
  } = useContext(GlobalContext);
  
  const [open, setOpen] = useState(true);
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);
  const theme = useTheme();
  const location = useLocation();

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
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: open ? 'space-between' : 'center',
          px: 2, 
          py: 1, 
          height: 100, // Even more increased height
          maxHeight: 100, // Even more increased maxHeight
        }}>
          {open && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1, overflow: 'visible' }}>
              <Box sx={{ width: 80, height: 80 }}> {/* Even more increased size for SmallLogo */}
                <SmallLogo />
              </Box>
            </Box>
          )}
          <IconButton onClick={() => setOpen(!open)} sx={{ color: theme.palette.text.primary }}>
            <MenuIcon />
          </IconButton>
        </Box>
        
        <Divider sx={{ mb: open ? 1 : 0 }} /> 

        <List sx={{pt:0}}>
          {open && user && (
            <Box sx={{ px: 1, py: 1 }}>
              <ListItem 
                button="true"
                onClick={() => setIsProfileExpanded(!isProfileExpanded)} 
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '8px', py: 0.75, px: 1, mb: isProfileExpanded ? 0.5 : 0, cursor: 'pointer' }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, overflow: 'hidden' }}>
                  <Avatar src={user?.picture} sx={{ width: 36, height: 36, mr: 1.5 }} />
                  <ListItemText
                    primary={user.name}
                    primaryTypographyProps={{ noWrap: !isProfileExpanded, sx: { fontWeight: 500, fontSize: '0.875rem', color: theme.palette.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}}
                    sx={{ my: 0 }}
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
                    primaryTypographyProps={{ variant: 'caption', sx: { color: theme.palette.text.secondary, textAlign: 'center', display: 'block', mb: 1, wordBreak: 'break-all' }}}
                  />
                  <Button fullWidth variant="outlined" color="secondary" size="small" onClick={handleSignOut} disabled={authLoading} sx={{ textTransform: 'none', mb: 1, borderColor: theme.palette.error.main, color: theme.palette.error.main, '&:hover': { backgroundColor: theme.palette.mode === 'dark' ? 'rgba(244, 67, 54, 0.1)' : 'rgba(211, 47, 47, 0.08)', borderColor: theme.palette.error.dark, } }}>
                    {authLoading ? t('signingOut') : t('signOut')}
                  </Button>
                </List>
              </Collapse>
              <Divider sx={{ my: 1 }} />
            </Box>
          )}

          {!open && user && (
             <>
              <ListItem sx={{ justifyContent: "center", py:1.5 }}>
                  <Avatar src={user?.picture} sx={{width: 36, height: 36}}/>
              </ListItem>
              <Divider sx={{ my: 1 }} />
             </>
          )}
          
          <ListItem component={Link} to="/" disabled={!user} sx={{ color: isActive('/') ? theme.palette.primary.main : theme.palette.text.primary, backgroundColor: isActive('/') ? (config?.darkMode ? 'rgba(144, 202, 249, 0.08)' : 'rgba(33, 150, 243, 0.08)') : 'transparent', borderRadius: '8px', mx: open ? 1 : 'auto', my: 0.5, width: open ? 'auto' : 'fit-content', justifyContent: open ? 'flex-start' : 'center', '&:hover': { backgroundColor: config?.darkMode ? 'rgba(144, 202, 249, 0.12)' : 'rgba(33, 150, 243, 0.12)' } }}>
            <ListItemIcon sx={{ color: isActive('/') ? theme.palette.primary.main : 'inherit', minWidth: 'auto', justifyContent: 'center', mr: open ? 1 : 0 }}>
              <GridView />
            </ListItemIcon>
            {open && <ListItemText primary={t('gridLink')} />}
          </ListItem>
          <ListItem component={Link} to="/calendar" disabled={!user} sx={{ color: isActive('/calendar') ? theme.palette.primary.main : theme.palette.text.primary, backgroundColor: isActive('/calendar') ? (config?.darkMode ? 'rgba(144, 202, 249, 0.08)' : 'rgba(33, 150, 243, 0.08)') : 'transparent', borderRadius: '8px', mx: open ? 1 : 'auto', my: 0.5, width: open ? 'auto' : 'fit-content', justifyContent: open ? 'flex-start' : 'center', '&:hover': { backgroundColor: config?.darkMode ? 'rgba(144, 202, 249, 0.12)' : 'rgba(33, 150, 243, 0.12)' } }}>
            <ListItemIcon sx={{ color: isActive('/calendar') ? theme.palette.primary.main : 'inherit', minWidth: 'auto', justifyContent: 'center', mr: open ? 1 : 0 }}>
              <CalendarMonth />
            </ListItemIcon>
            {open && <ListItemText primary={t('calendarLink')} />}
          </ListItem>
        </List>

        <div style={{ marginTop: "auto", padding: "16px", textAlign: "center" }}>
          {open && (
            user ? (
              <IconButton component={Link} to="/config" title={t('configTitle')} aria-label={t('configTitle')} sx={{ color: isActive('/config') ? theme.palette.primary.main : theme.palette.text.secondary, backgroundColor: isActive('/config') ? (config?.darkMode ? 'rgba(144, 202, 249, 0.08)' : 'rgba(33, 150, 243, 0.08)') : 'transparent', borderRadius: '8px', p: 1, '&:hover': { backgroundColor: config?.darkMode ? 'rgba(144, 202, 249, 0.12)' : 'rgba(33, 150, 243, 0.12)' } }}>
                <Settings />
              </IconButton>
            ) : (
              <Button onClick={handleSignIn} disabled={authLoading} variant={config?.theme === 'light' ? "contained" : "outlined"} color="primary" sx={{ width: '100%', p: 1, textTransform: 'none' }}>
                {authLoading ? t('signingIn') : t('signIn')}
              </Button>
            )
          )}

          {!open && (
            <IconButton onClick={!user ? handleSignIn : undefined} disabled={authLoading && !user} title={user ? user.name : t('signIn')} aria-label={user ? user.name : t('signIn')} sx={{ color: theme.palette.text.secondary, p: 0.75 }}>
              {authLoading && !user ? (
                "..."
              ) : user ? (
                <Avatar src={user?.picture} sx={{ width: 28, height: 28 }} />
              ) : (
                <Settings />
              )}
            </IconButton>
          )}
        </div>
      </div>
    </Drawer>
  );
};

export default Sidebar;
