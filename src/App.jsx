import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, TextField, IconButton, Chip, Avatar,
  InputAdornment, CircularProgress, Tooltip, Badge, Fade,
  List, ListItem, ListItemIcon, ListItemText, ListItemSecondaryAction,
  Divider, Button, Snackbar, Alert, Tab, Tabs
} from '@mui/material';
import {
  Search, Close, Minimize, Maximize, Star, StarBorder,
  ContentPaste, Image, Refresh, Send, History, TrendingUp,
  FolderOpen, Schedule, CheckCircle
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useHotkeys } from 'react-hotkeys-hook';
import axios from 'axios';
import './App.css';

const API_URL = 'http://localhost:5000/api';

function App() {
  const [pages, setPages] = useState([]);
  const [filteredPages, setFilteredPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [clipboard, setClipboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  // Catégories de pages
  const [favorites, setFavorites] = useState([]);
  const [recent, setRecent] = useState([]);
  const [suggested, setSuggested] = useState([]);

  // Charger les pages au démarrage
  useEffect(() => {
    loadPages();
    loadClipboard();
  }, []);

  // Filtrer les pages selon la recherche
  useEffect(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const filtered = pages.filter(page => 
        page.title.toLowerCase().includes(query) ||
        (page.parent_title && page.parent_title.toLowerCase().includes(query))
      );
      setFilteredPages(filtered);
    } else {
      // Afficher selon l'onglet
      switch (tabValue) {
        case 0: // Suggérés
          setFilteredPages(suggested);
          break;
        case 1: // Favoris
          setFilteredPages(favorites);
          break;
        case 2: // Récents
          setFilteredPages(recent);
          break;
        case 3: // Tous
          setFilteredPages(pages);
          break;
        default:
          setFilteredPages(pages);
      }
    }
  }, [searchQuery, pages, tabValue, favorites, recent, suggested]);

  // Charger les pages depuis l'API
  const loadPages = async (refresh = false) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/pages${refresh ? '?refresh=true' : ''}`);
      const { pages: allPages, preferences } = response.data;
      
      setPages(allPages);
      
      // Organiser par catégories
      const favs = allPages.filter(p => p.is_favorite);
      const recentIds = preferences.recent_pages || [];
      const recentPages = recentIds
        .map(id => allPages.find(p => p.id === id))
        .filter(Boolean);
      
      // Pages suggérées (plus utilisées)
      const sugg = [...allPages]
        .sort((a, b) => b.usage_count - a.usage_count)
        .slice(0, 10);
      
      setFavorites(favs);
      setRecent(recentPages);
      setSuggested(sugg);
      
      // Sélectionner la dernière page utilisée
      if (preferences.last_used_page) {
        const lastUsed = allPages.find(p => p.id === preferences.last_used_page);
        if (lastUsed) setSelectedPage(lastUsed);
      }
      
    } catch (error) {
      showNotification('Erreur lors du chargement des pages', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Charger le contenu du presse-papiers
  const loadClipboard = async () => {
    try {
      const response = await axios.get(`${API_URL}/clipboard`);
      setClipboard(response.data);
    } catch (error) {
      console.error('Erreur clipboard:', error);
    }
  };

  // Envoyer vers Notion
  const sendToNotion = async () => {
    if (!selectedPage || !clipboard || clipboard.type === 'empty') return;
    
    try {
      setSending(true);
      await axios.post(`${API_URL}/send`, {
        page_id: selectedPage.id,
        content: clipboard.content,
        type: clipboard.type
      });
      
      showNotification(`Envoyé vers ${selectedPage.title} !`, 'success');
      
      // Fermer après succès
      setTimeout(() => {
        window.electron?.send('close-window');
      }, 1500);
      
    } catch (error) {
      showNotification('Erreur lors de l\'envoi', 'error');
    } finally {
      setSending(false);
    }
  };

  // Basculer favori
  const toggleFavorite = async (page) => {
    try {
      const response = await axios.post(`${API_URL}/favorite`, {
        page_id: page.id
      });
      
      // Recharger les pages pour mettre à jour l'état
      loadPages();
      
    } catch (error) {
      showNotification('Erreur', 'error');
    }
  };

  // Afficher notification
  const showNotification = (message, severity = 'success') => {
    setNotification({ open: true, message, severity });
  };

  // Raccourcis clavier
  useHotkeys('enter', () => sendToNotion(), [selectedPage, clipboard]);
  useHotkeys('escape', () => window.electron?.send('close-window'));
  useHotkeys('cmd+r, ctrl+r', () => loadPages(true));
  useHotkeys('cmd+v, ctrl+v', () => loadClipboard());

  // Rendu d'une page
  const PageItem = ({ page, isSelected }) => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      whileHover={{ x: 10 }}
      transition={{ duration: 0.2 }}
    >
      <ListItem
        button
        selected={isSelected}
        onClick={() => setSelectedPage(page)}
        sx={{
          borderRadius: 2,
          mb: 1,
          backgroundColor: isSelected ? 'action.selected' : 'transparent',
          '&:hover': { backgroundColor: 'action.hover' }
        }}
      >
        <ListItemIcon>
          <Avatar sx={{ bgcolor: 'primary.light', width: 36, height: 36 }}>
            {page.icon || '📄'}
          </Avatar>
        </ListItemIcon>
        <ListItemText
          primary={
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="body1" fontWeight={500}>
                {page.title}
              </Typography>
              {page.usage_count > 0 && (
                <Chip
                  size="small"
                  label={page.usage_count}
                  color="primary"
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              )}
            </Box>
          }
          secondary={
            page.parent_title && (
              <Typography variant="caption" color="text.secondary">
                <FolderOpen sx={{ fontSize: 12, mr: 0.5 }} />
                {page.parent_title}
              </Typography>
            )
          }
        />
        <ListItemSecondaryAction>
          <IconButton
            edge="end"
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(page);
            }}
          >
            {page.is_favorite ? <Star color="primary" /> : <StarBorder />}
          </IconButton>
        </ListItemSecondaryAction>
      </ListItem>
    </motion.div>
  );

  return (
    <Box className="app-container">
      {/* Barre de titre personnalisée */}
      <Paper className="title-bar" elevation={0}>
        <Box className="drag-region" />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Notion Clipper Pro
        </Typography>
        <Box className="window-controls">
          <IconButton size="small" onClick={() => window.electron?.send('minimize-window')}>
            <Minimize fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => window.electron?.send('maximize-window')}>
            <Maximize fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => window.electron?.send('close-window')}>
            <Close fontSize="small" />
          </IconButton>
        </Box>
      </Paper>

      {/* Contenu principal */}
      <Box className="main-content">
        {/* Section gauche - Liste des pages */}
        <Paper className="pages-section" elevation={3}>
          {/* Barre de recherche */}
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Rechercher une page..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchQuery('')}>
                    <Close fontSize="small" />
                  </IconButton>
                </InputAdornment>
              )
            }}
            sx={{ mb: 2 }}
          />

          {/* Onglets */}
          <Tabs
            value={tabValue}
            onChange={(e, newValue) => setTabValue(newValue)}
            variant="fullWidth"
            sx={{ mb: 2 }}
          >
            <Tab label="Suggérés" icon={<TrendingUp />} iconPosition="start" />
            <Tab label="Favoris" icon={<Star />} iconPosition="start" />
            <Tab label="Récents" icon={<History />} iconPosition="start" />
            <Tab label="Tous" icon={<FolderOpen />} iconPosition="start" />
          </Tabs>

          {/* Liste des pages */}
          <Box className="pages-list">
            {loading ? (
              <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
              </Box>
            ) : (
              <List>
                <AnimatePresence>
                  {filteredPages.map((page) => (
                    <PageItem
                      key={page.id}
                      page={page}
                      isSelected={selectedPage?.id === page.id}
                    />
                  ))}
                </AnimatePresence>
              </List>
            )}
          </Box>

          {/* Actions */}
          <Box className="pages-actions">
            <Button
              startIcon={<Refresh />}
              onClick={() => loadPages(true)}
              size="small"
            >
              Rafraîchir
            </Button>
          </Box>
        </Paper>

        {/* Section droite - Aperçu et envoi */}
        <Paper className="preview-section" elevation={3}>
          {/* Aperçu du contenu */}
          <Box className="content-preview">
            <Typography variant="h6" gutterBottom>
              Contenu à envoyer
            </Typography>
            
            {clipboard ? (
              clipboard.type === 'text' ? (
                <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'grey.50' }}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <ContentPaste sx={{ mr: 1 }} />
                    <Typography variant="subtitle2">
                      Texte ({clipboard.length} caractères)
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{
                      maxHeight: 200,
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {clipboard.content.substring(0, 500)}
                    {clipboard.content.length > 500 && '...'}
                  </Typography>
                </Paper>
              ) : clipboard.type === 'image' ? (
                <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'grey.50' }}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Image sx={{ mr: 1 }} />
                    <Typography variant="subtitle2">
                      Image ({clipboard.width} × {clipboard.height} px)
                    </Typography>
                  </Box>
                  <Box
                    component="img"
                    src={`data:image/png;base64,${clipboard.content}`}
                    sx={{
                      maxWidth: '100%',
                      maxHeight: 200,
                      borderRadius: 1
                    }}
                  />
                </Paper>
              ) : (
                <Typography color="text.secondary" align="center" p={4}>
                  Presse-papiers vide
                </Typography>
              )
            ) : (
              <Typography color="text.secondary" align="center" p={4}>
                Chargement...
              </Typography>
            )}
          </Box>

          {/* Page sélectionnée */}
          {selectedPage && (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                mt: 2,
                backgroundColor: 'primary.light',
                borderColor: 'primary.main'
              }}
            >
              <Box display="flex" alignItems="center">
                <CheckCircle color="primary" sx={{ mr: 1 }} />
                <Typography variant="subtitle1" fontWeight={500}>
                  Destination : {selectedPage.title}
                </Typography>
              </Box>
            </Paper>
          )}

          {/* Bouton envoyer */}
          <Button
            fullWidth
            variant="contained"
            size="large"
            startIcon={sending ? <CircularProgress size={20} /> : <Send />}
            onClick={sendToNotion}
            disabled={!selectedPage || !clipboard || clipboard.type === 'empty' || sending}
            sx={{ mt: 3 }}
          >
            {sending ? 'Envoi en cours...' : 'Envoyer vers Notion'}
          </Button>

          {/* Raccourcis */}
          <Box className="shortcuts" mt={2}>
            <Typography variant="caption" color="text.secondary" align="center" display="block">
              Entrée pour envoyer • Échap pour fermer • Ctrl+R pour rafraîchir
            </Typography>
          </Box>
        </Paper>
      </Box>

      {/* Notifications */}
      <Snackbar
        open={notification.open}
        autoHideDuration={3000}
        onClose={() => setNotification({ ...notification, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={notification.severity} variant="filled">
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default App;