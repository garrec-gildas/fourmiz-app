# Script de sauvegarde automatisée Supabase FOURMIZ
# Sauvegarde dans le dossier project avec sync OneDrive

# Configuration - Utiliser le dossier project
$BackupDir = "C:\Users\MILLET IMMOBILIER\OneDrive\Bureau\project"
$MaxBackups = 7  # Conserver 7 sauvegardes
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
    
    # Commande pg_dump
    $ProcessInfo = New-Object System.Diagnostics.ProcessStartInfo
    $ProcessInfo.FileName = "pg_dump"
    $ProcessInfo.Arguments = "--host=db.hsijgsqtqbqevbytgvhm.supabase.co --port=5432 --username=postgres --dbname=postgres --verbose --clean --no-owner --no-privileges --file=`"$BackupFile`""
    $ProcessInfo.UseShellExecute = $false
    $ProcessInfo.RedirectStandardOutput = $true
    $ProcessInfo.RedirectStandardError = $true
    
    $Process = New-Object System.Diagnostics.Process
    $Process.StartInfo = $ProcessInfo
    $Process.Start() | Out-Null
    $Process.WaitForExit()
    
    # Vérifier si la sauvegarde a réussi
    if ($Process.ExitCode -eq 0 -and (Test-Path $BackupFile)) {
        $FileSize = [math]::Round((Get-Item $BackupFile).Length / 1MB, 2)
        Write-Log " Sauvegarde réussie ! Taille : $FileSize MB"
        Write-Log " Fichier sauvegardé et synchronisé avec OneDrive"
        
        # Nettoyer les anciennes sauvegardes dans le dossier project
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
        $ErrorOutput = $Process.StandardError.ReadToEnd()
        Write-Log " ERREUR lors de la sauvegarde. Code: $($Process.ExitCode)"
        Write-Log "Détails erreur: $ErrorOutput"
        throw "Échec de la sauvegarde"
    }
    
} catch {
    Write-Log " EXCEPTION: $($_.Exception.Message)"
    exit 1
} finally {
    # Nettoyer la variable mot de passe
    Remove-Item env:PGPASSWORD -ErrorAction SilentlyContinue
    Write-Log "=== FIN DE LA SAUVEGARDE ==="
    Write-Log ""  # Ligne vide pour séparer les sessions
}

exit 0
