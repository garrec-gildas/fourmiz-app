# Script de sauvegarde FOURMIZ - Version simplifiée et corrigée
# Sauvegarde dans le dossier project avec sync OneDrive

# Configuration
$BackupDir = "C:\Users\MILLET IMMOBILIER\OneDrive\Bureau\project"
$MaxBackups = 7
$LogFile = Join-Path $BackupDir "fourmiz_backup_log.txt"

# Fonction de logging
function Write-Log {
    param([string]$Message)
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogEntry = "$Timestamp - $Message"
    Write-Host $LogEntry -ForegroundColor Cyan
    Add-Content -Path $LogFile -Value $LogEntry
}

try {
    Write-Log "=== DÉBUT DE LA SAUVEGARDE AUTOMATIQUE FOURMIZ ==="
    
    # Définir le mot de passe
    $env:PGPASSWORD = "O85rgaqwOHwpgatO"
    
    # Créer un nom de fichier avec timestamp
    $Date = Get-Date -Format "yyyyMMdd_HHmmss"
    $BackupFile = Join-Path $BackupDir "fourmiz_backup_$Date.sql"
    
    Write-Log "Début de la sauvegarde vers : $BackupFile"
    Write-Log "Dossier OneDrive : $BackupDir"
    
    # Méthode simplifiée : utiliser la commande directe
    Write-Log "Exécution de pg_dump..."
    
    # Exécuter pg_dump directement
    pg_dump --host=db.hsijgsqtqbqevbytgvhm.supabase.co --port=5432 --username=postgres --dbname=postgres --verbose --clean --no-owner --no-privileges --file=$BackupFile
    
    $ExitCode = $LASTEXITCODE
    Write-Log "Code de sortie pg_dump : $ExitCode"
    
    # Vérifier si la sauvegarde a réussi
    if ($ExitCode -eq 0 -and (Test-Path $BackupFile)) {
        $FileSize = [math]::Round((Get-Item $BackupFile).Length / 1MB, 2)
        
        if ($FileSize -gt 0) {
            Write-Log " Sauvegarde réussie ! Taille : $FileSize MB"
            Write-Log " Fichier sauvegardé et synchronisé avec OneDrive"
            
            # Nettoyer les anciennes sauvegardes
            Write-Log " Nettoyage des anciennes sauvegardes (conserver $MaxBackups)..."
            $OldBackups = Get-ChildItem -Path $BackupDir -Filter "fourmiz_backup_*.sql" | 
                         Sort-Object CreationTime -Descending | 
                         Select-Object -Skip $MaxBackups
            
            $DeletedCount = 0
            foreach ($OldBackup in $OldBackups) {
                Remove-Item $OldBackup.FullName -Force
                Write-Log " Supprimé : $($OldBackup.Name)"
                $DeletedCount++
            }
            
            if ($DeletedCount -eq 0) {
                Write-Log " Aucune ancienne sauvegarde à supprimer"
            }
            
            # Compter les sauvegardes restantes
            $BackupCount = (Get-ChildItem -Path $BackupDir -Filter "fourmiz_backup_*.sql").Count
            Write-Log " Nombre total de sauvegardes conservées : $BackupCount"
            
            Write-Log " SAUVEGARDE TERMINÉE AVEC SUCCÈS - SYNCHRONISÉE ONEDRIVE"
            
        } else {
            Write-Log " ERREUR : Fichier créé mais vide (taille 0 MB)"
            throw "Fichier de sauvegarde vide"
        }
        
    } else {
        Write-Log " ERREUR lors de la sauvegarde. Code: $ExitCode"
        if (Test-Path $BackupFile) {
            $FileSize = (Get-Item $BackupFile).Length
            Write-Log "Fichier créé mais taille : $FileSize bytes"
        }
        throw "Échec de la sauvegarde"
    }
    
} catch {
    Write-Log " EXCEPTION: $($_.Exception.Message)"
    exit 1
} finally {
    # Nettoyer la variable mot de passe
    Remove-Item env:PGPASSWORD -ErrorAction SilentlyContinue
    Write-Log "=== FIN DE LA SAUVEGARDE ==="
    Write-Log ""
}

exit 0
