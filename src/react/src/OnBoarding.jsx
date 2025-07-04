// src/react/src/OnBoarding.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, 
  ChevronLeft, 
  Eye, 
  EyeOff, 
  Copy, 
  Zap, 
  Shield, 
  CheckCircle,
  ExternalLink,
  AlertCircle,
  Loader,
  Key,
  Image as ImageIcon
} from 'lucide-react';
import axios from 'axios';
import StepIcon from './components/common/StepIcon';

const API_URL = 'http://localhost:5000/api';

function OnBoarding({ onComplete, onSaveConfig }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [config, setConfig] = useState({
    notionToken: '',
    imgbbKey: ''
  });
  const [showToken, setShowToken] = useState(false);
  const [showImgbbKey, setShowImgbbKey] = useState(false);
  const [errors, setErrors] = useState({});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const steps = [
    {
      id: 'welcome',
      title: 'Bienvenue',
      icon: 'Sparkles',
      description: 'Découvrez Notion Clipper Pro'
    },
    {
      id: 'config',
      title: 'Configuration',
      icon: 'Key',
      description: 'Connectez votre espace Notion'
    },
    {
      id: 'features',
      title: 'Fonctionnalités',
      icon: 'Image',
      description: 'Découvrez les possibilités'
    },
    {
      id: 'ready',
      title: 'Prêt !',
      icon: 'CheckCircle',
      description: 'Commencez à utiliser l\'app'
    }
  ];

  const validateNotionToken = async () => {
    if (!config.notionToken) {
      setValidationResult({ type: 'error', message: 'Token requis' });
      return false;
    }

    setValidating(true);
    setValidationResult(null); // Reset le message d'erreur
    
    try {
      const response = await axios.post(`${API_URL}/config`, {
        notionToken: config.notionToken,
        imgbbKey: config.imgbbKey || ''
      });
      
      // Vérifier la réponse plus en détail
      if (response.data.success) {
        setValidationResult({ type: 'success', message: 'Connexion réussie !' });
        return true;
      } else {
        setValidationResult({ type: 'error', message: response.data.message || 'Token invalide' });
        return false;
      }
    } catch (error) {
      console.error('Erreur validation:', error);
      
      // Gestion d'erreur plus détaillée
      if (error.response?.data?.error) {
        setValidationResult({ type: 'error', message: error.response.data.error });
      } else if (error.message) {
        setValidationResult({ type: 'error', message: `Erreur: ${error.message}` });
      } else {
        setValidationResult({ type: 'error', message: 'Erreur de connexion au serveur' });
      }
      return false;
    } finally {
      setValidating(false);
    }
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      // Valider le token Notion avant de continuer
      const isValid = await validateNotionToken();
      if (!isValid) return;
    }
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
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
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto">
              <StepIcon name="Sparkles" size={40} className="text-white" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Bienvenue dans Notion Clipper Pro
              </h2>
              <p className="text-gray-600 max-w-md mx-auto">
                Envoyez instantanément vos contenus copiés vers vos pages Notion préférées
              </p>
            </div>
            
            <div className="space-y-4 text-left max-w-sm mx-auto">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Copy size={20} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Copier & Coller</h3>
                  <p className="text-sm text-gray-600">Copiez n'importe quel contenu et envoyez-le vers Notion</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap size={20} className="text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Ultra rapide</h3>
                  <p className="text-sm text-gray-600">Raccourci clavier Ctrl+Shift+C pour un accès instantané</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield size={20} className="text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Sécurisé & Privé</h3>
                  <p className="text-sm text-gray-600">Vos données restent privées et sécurisées</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'notion-token':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <StepIcon name="Key" size={32} className="text-gray-700" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Connectez votre Notion
              </h2>
              <p className="text-gray-600">
                Pour envoyer du contenu vers Notion, nous avons besoin d'un token d'intégration
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Token d'intégration Notion
                </label>
                <input
                  type="password"
                  value={config.notionToken}
                  onChange={(e) => {
                    setConfig(prev => ({ ...prev, notionToken: e.target.value }));
                    // Reset validation quand on tape
                    if (validationResult) {
                      setValidationResult(null);
                    }
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    validationResult?.type === 'error' ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="ntn_..."
                />
                {validationResult && (
                  <p className={`text-sm mt-2 ${
                    validationResult.type === 'error' ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {validationResult.message}
                  </p>
                )}
              </div>

              <button
                onClick={() => setShowTokenHelp(!showTokenHelp)}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                Comment obtenir mon token ?
                <ChevronRight size={14} className={`transform transition-transform ${showTokenHelp ? 'rotate-90' : ''}`} />
              </button>

              <AnimatePresence>
                {showTokenHelp && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                      <h4 className="font-medium text-blue-900">Étapes pour obtenir votre token :</h4>
                      
                      <ol className="space-y-3 text-sm text-blue-800">
                        <li className="flex gap-2">
                          <span className="font-medium">1.</span>
                          <div>
                            <p>Allez sur 
                              <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" 
                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 underline mx-1">
                                notion.so/my-integrations
                                <ExternalLink size={12} />
                              </a>
                            </p>
                          </div>
                        </li>
                        
                        <li className="flex gap-2">
                          <span className="font-medium">2.</span>
                          <p>Cliquez sur "+ Nouvelle intégration"</p>
                        </li>
                        
                        <li className="flex gap-2">
                          <span className="font-medium">3.</span>
                          <div>
                            <p>Configurez votre intégration :</p>
                            <ul className="mt-1 ml-4 space-y-1 text-xs">
                              <li>• Nom : "Notion Clipper Pro"</li>
                              <li>• Type : Interne</li>
                              <li>• Capacités : Lecture et Écriture du contenu</li>
                            </ul>
                          </div>
                        </li>
                        
                        <li className="flex gap-2">
                          <span className="font-medium">4.</span>
                          <p>Copiez le token secret (commence par "ntn_")</p>
                        </li>
                        
                        <li className="flex gap-2">
                          <span className="font-medium">5.</span>
                          <div>
                            <p className="font-medium text-red-700">Important : Partagez vos pages !</p>
                            <p>Pour chaque page où vous voulez envoyer du contenu :</p>
                            <ul className="mt-1 ml-4 space-y-1 text-xs">
                              <li>• Ouvrez la page dans Notion</li>
                              <li>• Cliquez sur "Partager" en haut à droite</li>
                              <li>• Invitez votre intégration "Notion Clipper Pro"</li>
                            </ul>
                          </div>
                        </li>
                      </ol>
                      
                      <div className="bg-yellow-100 border border-yellow-300 rounded p-2 text-xs text-yellow-800">
                        <p className="font-medium flex items-center gap-1">
                          <AlertCircle size={14} />
                          N'oubliez pas cette étape !
                        </p>
                        <p>Si vous ne partagez pas vos pages avec l'intégration, l'envoi échouera.</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        );

      case 'imgbb':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <StepIcon name="Image" size={32} className="text-purple-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Support des images (Optionnel)
              </h2>
              <p className="text-gray-600">
                Pour envoyer des images vers Notion, configurez ImgBB
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                <strong>Note :</strong> Cette étape est facultative. Sans ImgBB, vous pourrez toujours envoyer du texte, 
                et les images seront converties en texte descriptif.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Clé API ImgBB (optionnel)
                </label>
                <input
                  type="password"
                  value={config.imgbbKey}
                  onChange={(e) => setConfig(prev => ({ ...prev, imgbbKey: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Clé API ImgBB..."
                />
              </div>

              <button
                onClick={() => setShowImgbbHelp(!showImgbbHelp)}
                className="text-sm text-purple-600 hover:text-purple-800 flex items-center gap-1"
              >
                Comment obtenir une clé ImgBB ?
                <ChevronRight size={14} className={`transform transition-transform ${showImgbbHelp ? 'rotate-90' : ''}`} />
              </button>

              <AnimatePresence>
                {showImgbbHelp && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
                      <h4 className="font-medium text-purple-900">ImgBB est un service gratuit d'hébergement d'images</h4>
                      
                      <ol className="space-y-2 text-sm text-purple-800">
                        <li className="flex gap-2">
                          <span className="font-medium">1.</span>
                          <p>Allez sur 
                            <a href="https://imgbb.com" target="_blank" rel="noopener noreferrer" 
                              className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-800 underline mx-1">
                              imgbb.com
                              <ExternalLink size={12} />
                            </a>
                          </p>
                        </li>
                        
                        <li className="flex gap-2">
                          <span className="font-medium">2.</span>
                          <p>Créez un compte gratuit</p>
                        </li>
                        
                        <li className="flex gap-2">
                          <span className="font-medium">3.</span>
                          <p>Allez dans 
                            <a href="https://api.imgbb.com" target="_blank" rel="noopener noreferrer" 
                              className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-800 underline mx-1">
                              api.imgbb.com
                              <ExternalLink size={12} />
                            </a>
                          </p>
                        </li>
                        
                        <li className="flex gap-2">
                          <span className="font-medium">4.</span>
                          <p>Cliquez sur "Get API key"</p>
                        </li>
                        
                        <li className="flex gap-2">
                          <span className="font-medium">5.</span>
                          <p>Copiez votre clé API</p>
                        </li>
                      </ol>
                      
                      <div className="bg-green-100 border border-green-300 rounded p-2 text-xs text-green-800">
                        <p>✨ Avec ImgBB, vos images copiées seront automatiquement uploadées et insérées dans vos pages Notion !</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={() => setConfig(prev => ({ ...prev, imgbbKey: '' }))}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Ignorer cette étape
                </button>
                <ArrowRight size={16} className="text-gray-400" />
              </div>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center space-y-6">
            <motion.div 
              className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <StepIcon name="CheckCircle" size={40} className="text-green-600" />
            </motion.div>
            
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Tout est prêt !
              </h2>
              <p className="text-gray-600">
                Vous pouvez maintenant utiliser Notion Clipper Pro
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6 text-left max-w-md mx-auto">
              <h3 className="font-medium text-gray-900 mb-3">Rappel des fonctionnalités :</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex gap-2">
                  <Copy size={16} className="text-gray-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-700">Copier du contenu</p>
                    <p className="text-gray-600">Copiez n'importe quel texte ou image</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Zap size={16} className="text-gray-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-700">Raccourci Ctrl+Shift+C</p>
                    <p className="text-gray-600">Ouvrez l'app instantanément</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Send size={16} className="text-gray-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-700">Envoyez vers Notion</p>
                    <p className="text-gray-600">Sélectionnez une page et cliquez sur Envoyer</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  💡 Astuce : L'app se minimise dans la barre système pour un accès rapide
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <motion.div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Progress bar */}
        <div className="h-2 bg-gray-200">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
            initial={{ width: '0%' }}
            animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 p-6 border-b">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}
            >
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
                  index <= currentStep
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                <StepIcon name={step.icon} size={20} />
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 transition-colors ${
                  index < currentStep ? 'bg-purple-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="p-8">
          <AnimatePresence mode="wait">
            {currentStep === 0 && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center space-y-6"
              >
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto">
                  <StepIcon name="Sparkles" size={40} className="text-white" />
                </div>
                
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Bienvenue dans Notion Clipper Pro
                  </h2>
                  <p className="text-gray-600 max-w-md mx-auto">
                    Envoyez instantanément vos contenus copiés vers vos pages Notion préférées
                  </p>
                </div>
                
                <div className="space-y-4 text-left max-w-sm mx-auto">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Copy size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Copier & Coller</h3>
                      <p className="text-sm text-gray-600">Copiez n'importe quel contenu et envoyez-le vers Notion</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Zap size={20} className="text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Ultra rapide</h3>
                      <p className="text-sm text-gray-600">Raccourci clavier Ctrl+Shift+C pour un accès instantané</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Shield size={20} className="text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Sécurisé & Privé</h3>
                      <p className="text-sm text-gray-600">Vos données restent privées et sécurisées</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            {/* ... (reste du composant avec les autres étapes) */}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
            Précédent
          </button>

          <button
            onClick={handleNext}
            disabled={testing}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {testing ? (
              <>
                <Loader size={16} className="animate-spin" />
                Test en cours...
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
    </div>
  );
}

export default OnBoarding;