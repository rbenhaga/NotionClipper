// Validation ImgBB côté client simplifiée

export const validateImgbbKey = async (apiKey) => {
  // Validation basique du format
  if (!apiKey || apiKey.length < 20) {
    return {
      valid: false,
      message: 'Clé API trop courte'
    };
  }
  
  // La validation réelle se fera côté backend lors du premier upload
  return {
    valid: true,
    message: 'Clé API enregistrée. Elle sera validée lors du premier upload.'
  };
}; 