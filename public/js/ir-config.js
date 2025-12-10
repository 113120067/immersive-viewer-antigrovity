/**
 * Shared Immersive Reader configuration
 * Centralizes IR settings to ensure consistency across the application
 */

/**
 * Default Immersive Reader options
 * @param {Object} customOptions - Custom options to override defaults
 * @returns {Object} - Immersive Reader options
 */
function getDefaultIROptions(customOptions = {}) {
  // Load saved user preferences
  const savedPreferences = typeof localStorage !== 'undefined' 
    ? localStorage.getItem('immersive-reader-preferences') 
    : null;
  const savedTranslationLang = typeof localStorage !== 'undefined'
    ? (localStorage.getItem('immersive-reader-translation-lang') || 'zh-Hant')
    : 'zh-Hant';
  
  const defaultOptions = {
    uiZIndex: 2000,
    uiLang: 'zh-Hant',  // Traditional Chinese (Taiwan) UI
    cookiePolicy: 1,  // CookiePolicy.Enable - allows saving user preferences in cookies
    disableGrammar: false,  // Enable syllables, picture dictionary, parts of speech
    disableTranslation: false,  // Enable translation features
    preferences: savedPreferences,
    displayOptions: {
      textSize: 20,
      increaseSpacing: false
    },
    translationOptions: {
      language: savedTranslationLang,
      autoEnableWordTranslation: false,
      autoEnableDocumentTranslation: false
    },
    onPreferencesChanged: (preferences) => {
      // Save user preferences when they change
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('immersive-reader-preferences', preferences);
        console.log('Immersive Reader preferences saved');
        
        // Try to extract and save translation language
        try {
          const prefsObj = JSON.parse(preferences);
          if (prefsObj && prefsObj.translationLanguage) {
            localStorage.setItem('immersive-reader-translation-lang', prefsObj.translationLanguage);
            console.log('Translation language saved:', prefsObj.translationLanguage);
          }
        } catch (e) {
          // Preferences string format may vary, ignore parse errors
        }
      }
    }
  };
  
  return {
    ...defaultOptions,
    ...customOptions
  };
}

/**
 * Create Immersive Reader data payload
 * @param {string} title - Document title
 * @param {string} content - Document content (HTML or plain text)
 * @param {string} lang - Content language (default: 'en')
 * @param {string} mimeType - Content MIME type (default: 'text/html')
 * @returns {Object} - IR data payload
 */
function createIRData(title, content, lang = 'en', mimeType = 'text/html') {
  return {
    title: title,
    chunks: [{
      content: content,
      lang: lang,
      mimeType: mimeType
    }]
  };
}

/**
 * Get Immersive Reader token and subdomain
 * @returns {Promise<Object>} - Token and subdomain
 */
async function getIRCredentials() {
  try {
    const response = await fetch('/GetTokenAndSubdomain');
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    return {
      token: data.token,
      subdomain: data.subdomain
    };
  } catch (error) {
    console.error('Error getting IR credentials:', error);
    throw error;
  }
}

/**
 * Launch Immersive Reader with standard configuration
 * @param {string} title - Document title
 * @param {string} content - Document content
 * @param {Object} options - Custom options
 * @returns {Promise<void>}
 */
async function launchImmersiveReader(title, content, options = {}) {
  try {
    const credentials = await getIRCredentials();
    const data = createIRData(
      title,
      content,
      options.lang || 'en',
      options.mimeType || 'text/html'
    );
    
    const irOptions = getDefaultIROptions(options);
    
    if (typeof ImmersiveReader === 'undefined') {
      throw new Error('Immersive Reader SDK not loaded');
    }
    
    await ImmersiveReader.launchAsync(
      credentials.token,
      credentials.subdomain,
      data,
      irOptions
    );
  } catch (error) {
    console.error('Error launching Immersive Reader:', error);
    throw error;
  }
}

// For browser environments using jQuery
if (typeof window !== 'undefined') {
  window.IRConfig = {
    getDefaultOptions: getDefaultIROptions,
    createData: createIRData,
    launch: launchImmersiveReader
  };
}

// For Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getDefaultIROptions,
    createIRData,
    getIRCredentials,
    launchImmersiveReader
  };
}
