// src/App.js
import React, { useEffect } from 'react';
import { useNotifications } from './hooks/useNotifications';

function App() {
    const { status, isLoading, initialize, forceReset } = useNotifications();

    // Initialise automatiquement au démarrage de l'app
    useEffect(() => {
        initialize();
    }, [initialize]);

    return (
        <div className="App">
            <header className="App-header">
                <h1>Mon App React</h1>
                
                {/* Section de debug pour les notifications */}
                <div style={{ 
                    background: '#f5f5f5', 
                    padding: '20px', 
                    margin: '20px 0',
                    borderRadius: '8px',
                    border: '1px solid #ddd'
                }}>
                    <h3>📱 Statut des Notifications</h3>
                    
                    {isLoading && <p>⏳ Initialisation en cours...</p>}
                    
                    {status && (
                        <div>
                            <p><strong>Device ID:</strong> {status.deviceId}</p>
                            <p><strong>Tentatives:</strong> {status.attempts}/{status.maxRetries}</p>
                            <p><strong>En cooldown:</strong> {status.inCooldown ? '✅ Oui' : '❌ Non'}</p>
                            <p><strong>Limite atteinte:</strong> {status.reachedLimit ? '🛑 Oui' : '✅ Non'}</p>
                            <p><strong>Initialisation active:</strong> {status.isInitializing ? '⏳ Oui' : '❌ Non'}</p>
                            
                            {status.inCooldown && (
                                <p><strong>Prochaine tentative dans:</strong> {Math.ceil(status.nextRetryIn / 1000)}s</p>
                            )}
                        </div>
                    )}
                    
                    <div style={{ marginTop: '15px' }}>
                        <button 
                            onClick={() => initialize()}
                            disabled={isLoading}
                            style={{ marginRight: '10px' }}
                        >
                            🔄 Réessayer
                        </button>
                        
                        <button 
                            onClick={() => initialize(true)}
                            disabled={isLoading}
                            style={{ marginRight: '10px' }}
                        >
                            🚀 Forcer la tentative
                        </button>
                        
                        <button 
                            onClick={forceReset}
                            disabled={isLoading}
                        >
                            🔧 Reset complet
                        </button>
                    </div>
                </div>
                
                {/* Votre contenu d'app normal */}
                <p>Votre contenu d'application ici...</p>
            </header>
        </div>
    );
}

export default App;