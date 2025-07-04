// src/react/src/OnBoarding.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, ChevronLeft, Send, Search, 
  Star, Clock, CheckCircle, AlertCircle, Loader,
  Copy, Database, Key, Shield, Eye, EyeOff,
  Globe, Settings, Sparkles, Zap, Link2
} from 'lucide-react';
import axios from 'axios';
import configService from './services/config';

const API_URL = 'http://localhost:5000/api';

const IMGBB_API_KEY = 'f3c96fc1d87f81ae20bb67c5a9e90fc9';

// Helper pour le raccourci clavier multiplateforme
const getPlatformKey = () => {
  // Essayer d'abord avec l'API Electron
  if (window.electronAPI?.platform) {
    return window.electronAPI.platform === 'darwin' ? 'Cmd' : 'Ctrl';
  }
  // Fallback basé sur le user agent
  return navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl';
};

function OnBoarding({ onComplete, onSaveConfig }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [config, setConfig] = useState({
    notionToken: '',
    imgbbApiKey: IMGBB_API_KEY,
    notionPageId: '',
    notionPageUrl: ''
  });
  const [showNotionKey, setShowNotionKey] = useState(false);
  const [showImgbbKey, setShowImgbbKey] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [pageValidation, setPageValidation] = useState(null);
  const [completing, setCompleting] = useState(false);

  const steps = [
    { id: 'welcome', title: 'Bienvenue', icon: <Sparkles size={20} />, content: 'welcome' },
    { id: 'notion', title: 'Configuration Notion', icon: <Database size={20} />, content: 'notion' },
    { id: 'preview', title: 'Page Preview', icon: <Globe size={20} />, content: 'preview' },
    { id: 'imgbb', title: 'Configuration Images', icon: <Copy size={20} />, content: 'imgbb' },
    { id: 'ready', title: 'Prêt à démarrer', icon: <CheckCircle size={20} />, content: 'ready' }
  ];

  const validateNotionToken = async () => {
    if (!config.notionToken.trim()) {
      setValidationResult({ type: 'error', message: 'Veuillez entrer votre token Notion' });
      return false;
    }

    setValidating(true);
    setValidationResult(null);

    try {
      const isValid = await configService.validateNotionToken(config.notionToken);
      if (isValid) {
        setValidationResult({ 
          type: 'success', 
          message: `Connexion réussie !` 
        });
        return true;
      } else {
        setValidationResult({ type: 'error', message: 'Token invalide ou erreur de connexion.' });
        return false;
      }
    } catch (error) {
      console.error('Erreur validation:', error);
      setValidationResult({ type: 'error', message: `Erreur: ${error.message || 'Erreur de connexion au serveur'}` });
      return false;
    } finally {
      setValidating(false);
    }
  };

  const validateNotionPage = async () => {
    if (!config.notionPageUrl.trim()) {
      setPageValidation({ type: 'error', message: 'Veuillez entrer l\'URL de votre page Notion' });
      return false;
    }

    setValidating(true);
    setPageValidation(null);

    try {
      // Extraire l'ID de la page depuis l'URL
      const pageIdMatch = config.notionPageUrl.match(/([a-f0-9]{32})/);
      if (!pageIdMatch) {
        setPageValidation({ type: 'error', message: 'URL invalide. Assurez-vous d\'utiliser une URL de page Notion valide.' });
        return false;
      }

      const pageId = pageIdMatch[1];
      setConfig(prev => ({ ...prev, notionPageId: pageId }));

      // Vérifier que la page est publique
      const response = await axios.post(`${API_URL}/validate-notion-page`, {
        pageUrl: config.notionPageUrl,
        pageId: pageId
      });

      if (response.data.valid) {
        setPageValidation({ 
          type: 'success', 
          message: 'Page Notion valide et publique !' 
        });
        return true;
      } else {
        setPageValidation({ 
          type: 'error', 
          message: response.data.message || 'La page n\'est pas publique. Rendez-la publique dans les paramètres de partage.' 
        });
        return false;
      }
    } catch (error) {
      setPageValidation({ 
        type: 'error', 
        message: 'Impossible de vérifier la page. Assurez-vous qu\'elle est publique.' 
      });
      return false;
    } finally {
      setValidating(false);
    }
  };

  const validateImgbbKey = async () => {
    if (!config.imgbbApiKey.trim()) {
      setValidationResult({ type: 'error', message: 'Veuillez entrer votre clé API ImgBB' });
      return false;
    }

    // Validation simplifiée - la vraie validation se fera côté backend
    setValidationResult({ 
      type: 'success', 
      message: 'Clé API ImgBB enregistrée ! Elle sera validée lors du premier upload.' 
    });
    
    return true;
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      const isValid = await validateNotionToken();
      if (!isValid) return;
    } else if (currentStep === 2) {
      const isValid = await validateNotionPage();
      if (!isValid) return;
    } else if (currentStep === 3) {
      await validateImgbbKey();
    }
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleFinish = async () => {
    if (!notionToken.trim()) {
      setError('Veuillez entrer votre token Notion');
      return;
    }
  
    setLoading(true);
    try {
      // Sauvegarder la configuration avec le flag onboardingCompleted
      await onSaveConfig({
        notionToken: notionToken.trim(),
        imgbbKey: imgbbKey.trim(),
        previewPageId: previewPageId?.trim() || '',
        onboardingCompleted: true  // Important : ajouter ce flag
      });
  
      // Appeler onComplete pour continuer
      onComplete();
    } catch (error) {
      setError('Erreur lors de la sauvegarde : ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    
    try {
      // Sauvegarder la config finale
      await onSaveConfig(config);
      
      // Marquer l'onboarding comme complété
      await axios.post(`${API_URL}/onboarding/complete`);
      
      // Petit délai pour l'animation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onComplete();
    } catch (error) {
      console.error('Erreur completion:', error);
      setCompleting(false);
    }
  };

  const renderStepContent = () => {
    switch (steps[currentStep].content) {
      case 'welcome':
        return (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl">
              <Send size={40} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">
                Bienvenue dans Notion Clipper Pro
              </h2>
              <p className="text-gray-600 max-w-md mx-auto">
              Capturez et organisez instantanément vos idées, liens et contenus 
              directement dans vos pages Notion préférées.
            </p>
            <div className="grid grid-cols-3 gap-4 pt-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Zap size={20} className="text-blue-600" />
                </div>
                <p className="text-sm text-gray-600">Capture rapide</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Database size={20} className="text-purple-600" />
                </div>
                <p className="text-sm text-gray-600">Organisation facile</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <CheckCircle size={20} className="text-green-600" />
                </div>
                <p className="text-sm text-gray-600">Synchronisation</p>
              </div>
            </div>
          </div>
        );

      case 'notion':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-900 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Database size={32} className="text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Connexion à Notion
              </h3>
              <p className="text-sm text-gray-600">
                Entrez votre token d'intégration Notion pour accéder à vos pages
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Token d'intégration Notion
                </label>
                <div className="relative">
                <input
                    type={showNotionKey ? "text" : "password"}
                  value={config.notionToken}
                    onChange={(e) => setConfig({ ...config, notionToken: e.target.value })}
                    placeholder="secret_..."
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNotionKey(!showNotionKey)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showNotionKey ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Comment obtenir votre token :</strong>
                </p>
                <ol className="text-sm text-blue-700 mt-2 space-y-1">
                  <li>1. Allez sur <a href="https://www.notion.so/my-integrations" className="underline">notion.so/my-integrations</a></li>
                  <li>2. Créez une nouvelle intégration</li>
                  <li>3. Copiez le token secret</li>
                  <li>4. Partagez vos pages avec l'intégration</li>
                </ol>
              </div>

              {validationResult && (
                  <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-lg flex items-center gap-3 ${
                    validationResult.type === 'success' 
                      ? 'bg-green-50 text-green-800'
                      : 'bg-red-50 text-red-800'
                  }`}
                >
                  {validationResult.type === 'success' ? (
                    <CheckCircle size={20} />
                  ) : (
                    <AlertCircle size={20} />
                  )}
                  <span className="text-sm">{validationResult.message}</span>
                </motion.div>
              )}
            </div>
          </div>
        );

      case 'preview':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Globe size={32} className="text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Configuration de la Preview
              </h3>
              <p className="text-sm text-gray-600">
                Configurez une page Notion publique pour prévisualiser vos captures
                            </p>
                          </div>

            <div className="space-y-4">
                          <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL de votre page Notion publique
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={config.notionPageUrl}
                    onChange={(e) => setConfig({ ...config, notionPageUrl: e.target.value })}
                    placeholder="https://notion.so/votre-page-..."
                    className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <Link2 size={20} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          </div>
                          </div>

              <div className="bg-amber-50 p-4 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Important :</strong> La page doit être rendue publique
                </p>
                <ol className="text-sm text-amber-700 mt-2 space-y-1">
                  <li>1. Ouvrez votre page dans Notion</li>
                  <li>2. Cliquez sur "Share" en haut à droite</li>
                  <li>3. Activez "Share to web"</li>
                  <li>4. Copiez le lien public</li>
                </ol>
                      </div>

              {pageValidation && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-lg flex items-center gap-3 ${
                    pageValidation.type === 'success' 
                      ? 'bg-green-50 text-green-800'
                      : 'bg-red-50 text-red-800'
                  }`}
                >
                  {pageValidation.type === 'success' ? (
                    <CheckCircle size={20} />
                  ) : (
                    <AlertCircle size={20} />
                  )}
                  <span className="text-sm">{pageValidation.message}</span>
                  </motion.div>
                )}

              {config.notionPageId && pageValidation?.type === 'success' && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Preview de votre page :</h4>
                  <iframe
                    src={`https://notion.so/${config.notionPageId}`}
                    className="w-full h-64 rounded border border-gray-200"
                    title="Notion Page Preview"
                  />
                </div>
              )}
            </div>
          </div>
        );

      case 'imgbb':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Copy size={32} className="text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Configuration des images
              </h3>
              <p className="text-sm text-gray-600">
                Configurez ImgBB pour héberger vos images
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Clé API ImgBB
                </label>
                <div className="relative">
                <input
                    type={showImgbbKey ? "text" : "password"}
                    value={config.imgbbApiKey}
                    onChange={(e) => setConfig({ ...config, imgbbApiKey: e.target.value })}
                    placeholder="Votre clé API ImgBB"
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
              <button
                    type="button"
                    onClick={() => setShowImgbbKey(!showImgbbKey)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showImgbbKey ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>ImgBB est déjà configuré !</strong>
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Une clé API par défaut est déjà configurée. Vous pouvez la conserver ou utiliser votre propre clé.
                </p>
                    </div>

              {validationResult && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-lg flex items-center gap-3 ${
                    validationResult.type === 'success' 
                      ? 'bg-green-50 text-green-800'
                      : 'bg-red-50 text-red-800'
                  }`}
                >
                  {validationResult.type === 'success' ? (
                    <CheckCircle size={20} />
                  ) : (
                    <AlertCircle size={20} />
                  )}
                  <span className="text-sm">{validationResult.message}</span>
                </motion.div>
              )}
            </div>
          </div>
        );

      case 'ready':
        return (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl">
              <CheckCircle size={40} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">
                Tout est prêt !
              </h2>
            <p className="text-gray-600 max-w-md mx-auto">
              Votre Notion Clipper Pro est configuré et prêt à l'emploi. 
              Commencez à capturer vos idées dès maintenant !
            </p>
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl">
              <h3 className="font-semibold text-gray-800 mb-3">Raccourcis utiles :</h3>
              <div className="space-y-2 text-left max-w-xs mx-auto">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Afficher/Masquer</span>
                  <kbd className="px-2 py-1 bg-white rounded text-xs font-mono shadow-sm">
                    {getPlatformKey()}+Shift+C
                  </kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Envoyer</span>
                  <kbd className="px-2 py-1 bg-white rounded text-xs font-mono shadow-sm">
                    Enter
                  </kbd>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Fond animé */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-[10px] opacity-50">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
          <div className="absolute bottom-0 right-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-6000"></div>
        </div>
      </div>

      <motion.div 
        className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}
            >
              <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  index <= currentStep
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                  {index < currentStep ? (
                    <CheckCircle size={20} />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
              </div>
              {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded transition-all ${
                      index < currentStep ? 'bg-gradient-to-r from-blue-500 to-purple-600' : 'bg-gray-200'
                    }`}
                  />
              )}
            </div>
          ))}
          </div>
          <div className="text-center">
            <h3 className="text-sm font-medium text-gray-600">
              {steps[currentStep].title}
            </h3>
          </div>
        </div>

        {/* Content */}
          <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderStepContent()}
          </motion.div>
          </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              currentStep === 0
                ? 'opacity-0 pointer-events-none'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <ChevronLeft size={16} />
            Précédent
          </button>

          <button
            onClick={currentStep === steps.length - 1 ? handleComplete : handleNext}
            disabled={validating || completing}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {validating ? (
              <>
                <Loader size={16} className="animate-spin" />
                Test en cours...
              </>
            ) : completing ? (
              <>
                <Loader size={16} className="animate-spin" />
                Configuration...
              </>
            ) : currentStep === steps.length - 1 ? (
              <>
                Commencer
                <CheckCircle size={16} />
              </>
            ) : (
              <>
                Suivant
                <ChevronRight size={16} />
              </>
            )}
          </button>
        </div>
      </motion.div>

      <style>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .animation-delay-6000 {
          animation-delay: 6s;
        }
      `}</style>
    </div>
  );
}

export default OnBoarding;