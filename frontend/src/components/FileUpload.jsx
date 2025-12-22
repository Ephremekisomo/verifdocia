import { useState, useCallback } from 'react';

export default function FileUpload({ onFileSelect }) {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState(null);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFile(file);
    }
  }, []);

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    if (!file.type.startsWith('image/')) {
      alert('Veuillez uploader une image valide (JPG, PNG).');
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
    
    onFileSelect(file);
  };

  return (
    <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <form
        className={`upload-area ${dragActive ? 'active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-upload').click()}
      >
        <input
          type="file"
          id="file-upload"
          style={{ display: 'none' }}
          onChange={handleChange}
          accept="image/*"
        />
        
        {preview ? (
          <div style={{ position: 'relative' }}>
            <img 
              src={preview} 
              alt="Preview" 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '300px', 
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
              }} 
            />
            <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
              Cliquez ou glissez une autre image pour changer
            </p>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Analysez votre document</h3>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
              Glissez-déposez votre fichier ici ou cliquez pour parcourir
            </p>
            <div style={{ 
              marginTop: '1.5rem', 
              fontSize: '0.8rem', 
              color: 'var(--text-secondary)',
              border: '1px solid var(--glass-border)',
              padding: '0.5rem',
              borderRadius: '99px',
              display: 'inline-block'
            }}>
              Supporte JPG, PNG • Max 10MB
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
