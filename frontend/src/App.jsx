import { useState, useEffect } from 'react'
import FileUpload from './components/FileUpload'
import CameraScanner from './components/CameraScanner'

function App() {
  const [analysisResult, setAnalysisResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [scannerOpen, setScannerOpen] = useState(false)

  const handleFileSelect = async (file) => {
    setLoading(true)
    setError(null)
    setAnalysisResult(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/analyze`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Erreur lors de l\'analyse du document')
      }

      const result = await response.json()
      setAnalysisResult(result)
    } catch (err) {
      console.error(err)
      setError('Impossible de contacter le serveur d\'analyse. Vérifiez que le backend est lancé.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!analysisResult) return
    const p = analysisResult.is_authentic_probability
    let text = ''
    if (p <= 0.4) text = "Le document n'est pas conforme"
    else if (p <= 0.7) text = 'Le document est douteux'
    else text = 'Le document semble authentique'
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'fr-FR'
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utter)
  }, [analysisResult])

  return (
    <div className="container">
      <header style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>
          Verif<span style={{ color: 'var(--primary-color)' }}>Doc</span> AI
        </h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
          Système de détection de fraude et d'analyse documentaire intelligent
        </p>
      </header>

      <main>
        {!analysisResult && !loading && (
          <div className="fade-in" style={{ display: 'grid', gap: '1rem', justifyItems: 'center' }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setScannerOpen(true)}>Scanner</button>
              <button onClick={() => document.getElementById('file-upload').click()}>Importer une image</button>
            </div>
            <FileUpload onFileSelect={handleFileSelect} />
            {scannerOpen && (
              <CameraScanner
                onCapture={(blob) => {
                  const file = new File([blob], 'scan.png', { type: 'image/png' })
                  handleFileSelect(file)
                  setScannerOpen(false)
                }}
                onClose={() => setScannerOpen(false)}
              />
            )}
          </div>
        )}

        {loading && (
          <div className="glass-panel" style={{ padding: '4rem' }}>
            <div className="spinner" style={{ marginBottom: '2rem' }}></div>
            <h3>Analyse en cours...</h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              Nos algorithmes vérifient l'authenticité du document.
            </p>
          </div>
        )}

        {error && (
          <div className="glass-panel" style={{ borderColor: 'var(--accent-danger)' }}>
            <h3 style={{ color: 'var(--accent-danger)' }}>Erreur</h3>
            <p>{error}</p>
            <button onClick={() => setError(null)}>Réessayer</button>
          </div>
        )}

        {analysisResult && (
          <div className="glass-panel fade-in" style={{ textAlign: 'left', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ margin: 0 }}>Résultat de l'analyse</h2>
              <button onClick={() => setAnalysisResult(null)}>Analyser un autre document</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div>
                <h4 style={{ color: 'var(--text-secondary)', marginTop: 0 }}>Score d'Authenticité</h4>
                <div style={{
                  fontSize: '3rem',
                  fontWeight: 'bold',
                  color: analysisResult.is_authentic_probability > 0.7 ? 'var(--accent-success)' :
                    analysisResult.is_authentic_probability > 0.4 ? 'var(--accent-warning)' : 'var(--accent-danger)'
                }}>
                  {Math.round(analysisResult.is_authentic_probability * 100)}%
                </div>

                <div style={{ marginTop: '1rem' }}>
                  {analysisResult.is_authentic_probability > 0.7 ? (
                    <span className="auth-badge badge-success">Authentique Probable</span>
                  ) : analysisResult.is_authentic_probability > 0.4 ? (
                    <span className="auth-badge badge-warning">Douteux</span>
                  ) : (
                    <span className="auth-badge badge-danger">Falsification Détectée</span>
                  )}
                </div>
              </div>

              <div>
                <h4 style={{ color: 'var(--text-secondary)', marginTop: 0 }}>Détails Techniques</h4>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  <li style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--glass-border)' }}>
                    <strong>Netteté (Blur Score):</strong> {analysisResult.details.blur_score}
                    {analysisResult.details.is_blurry && <span style={{ color: 'var(--accent-warning)', marginLeft: '0.5rem' }}>(Flou détecté)</span>}
                  </li>
                  <li style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--glass-border)' }}>
                    <strong>Mots-clés officiels:</strong> {analysisResult.details.keywords_detected.length > 0 ? analysisResult.details.keywords_detected.join(', ') : 'Aucun'}
                  </li>
                  <li style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--glass-border)' }}>
                    <strong>Métadonnées (Logiciel):</strong> {analysisResult.details.software_detected ? (
                      <span>
                        {analysisResult.details.software_detected}
                        {analysisResult.details.is_edited && <span style={{ color: 'var(--accent-danger)', marginLeft: '0.5rem', fontWeight: 'bold' }}>(ALERTE RETOUCHE)</span>}
                      </span>
                    ) : 'Non détecté'}
                  </li>
                  <li style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--glass-border)' }}>
                    <strong>Indicateurs suspects:</strong> {analysisResult.details.suspicious_flags ?
                      <span style={{ color: 'var(--accent-danger)' }}>DÉTECTÉS</span> :
                      <span style={{ color: 'var(--accent-success)' }}>Aucun</span>}
                  </li>
                </ul>
              </div>
            </div>

            <div style={{ marginTop: '2rem' }}>
              <h4 style={{ color: 'var(--text-secondary)' }}>Aperçu OCR (Extrait)</h4>
              <div style={{
                background: 'rgba(0,0,0,0.3)',
                padding: '1rem',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                maxHeight: '150px',
                overflowY: 'auto'
              }}>
                {analysisResult.details.ocr_text_preview}
              </div>
            </div>

            {analysisResult.details.research && (
              <div style={{ marginTop: '2rem' }}>
                <h4 style={{ color: 'var(--text-secondary)' }}>Recherche heuristique</h4>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  <li style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--glass-border)' }}>
                    <strong>Type:</strong> {analysisResult.details.research.doc_type || 'Indéterminé'}
                  </li>
                  <li style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--glass-border)' }}>
                    <strong>Émetteur:</strong> {analysisResult.details.research.issuer || 'Indéterminé'}
                  </li>
                  <li style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--glass-border)' }}>
                    <strong>Numéros:</strong> {analysisResult.details.research.id_numbers?.length ? analysisResult.details.research.id_numbers.join(', ') : 'Aucun'}
                  </li>
                  <li style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--glass-border)' }}>
                    <strong>Dates:</strong> {analysisResult.details.research.dates?.length ? analysisResult.details.research.dates.join(', ') : 'Aucune'}
                  </li>
                  <li style={{ padding: '0.5rem 0' }}>
                    <strong>Années:</strong> {analysisResult.details.research.years?.length ? analysisResult.details.research.years.join(', ') : 'Aucune'}
                  </li>
                </ul>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default App
