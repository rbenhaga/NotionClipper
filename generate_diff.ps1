# Script PowerShell pour générer un fichier diff complet
# Usage: .\generate_diff.ps1

Write-Host "Génération du fichier diff des modifications..." -ForegroundColor Cyan

# Créer le fichier de sortie
$outputFile = "PAGINATION_CHANGES_DIFF.txt"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# En-tête du fichier
@"
# MODIFICATIONS PAGINATION - NOTION CLIPPER
# Généré le: $timestamp
# 
# Ce fichier contient toutes les modifications apportées pour implémenter
# le système de pagination avec scroll infini dans l'application.
#
# ============================================================================

"@ | Out-File -FilePath $outputFile -Encoding UTF8

Write-Host "Ajout des modifications git diff..." -ForegroundColor Yellow

# Ajouter le statut git
"## STATUT GIT" | Add-Content -Path $outputFile -Encoding UTF8
"" | Add-Content -Path $outputFile -Encoding UTF8
git status --porcelain | Add-Content -Path $outputFile -Encoding UTF8

"" | Add-Content -Path $outputFile -Encoding UTF8
"## FICHIERS MODIFIÉS" | Add-Content -Path $outputFile -Encoding UTF8
"" | Add-Content -Path $outputFile -Encoding UTF8

# Liste des fichiers modifiés
$modifiedFiles = @(
    "packages/ui/src/hooks/data/useInfinitePages.ts",
    "packages/ui/src/hooks/data/usePages.ts", 
    "packages/core-electron/src/services/notion.service.ts",
    "packages/adapters/electron/src/notion-api.adapter.ts",
    "apps/notion-clipper-app/src/electron/preload.ts",
    "apps/notion-clipper-app/src/react/src/App.tsx"
)

foreach ($file in $modifiedFiles) {
    if (Test-Path $file) {
        "### $file" | Add-Content -Path $outputFile -Encoding UTF8
        "" | Add-Content -Path $outputFile -Encoding UTF8
        
        if ($file -eq "packages/ui/src/hooks/data/useInfinitePages.ts") {
            # Nouveau fichier
            "NOUVEAU FICHIER - Contenu complet:" | Add-Content -Path $outputFile -Encoding UTF8
            Get-Content $file | Add-Content -Path $outputFile -Encoding UTF8
        } else {
            # Fichier modifié - utiliser git diff
            try {
                git diff HEAD -- $file | Add-Content -Path $outputFile -Encoding UTF8
            } catch {
                "Erreur lors de la génération du diff pour $file" | Add-Content -Path $outputFile -Encoding UTF8
            }
        }
        "" | Add-Content -Path $outputFile -Encoding UTF8
        "---" | Add-Content -Path $outputFile -Encoding UTF8
        "" | Add-Content -Path $outputFile -Encoding UTF8
    }
}

# Résumé des changements
"" | Add-Content -Path $outputFile -Encoding UTF8
"## RÉSUMÉ DES MODIFICATIONS" | Add-Content -Path $outputFile -Encoding UTF8
"" | Add-Content -Path $outputFile -Encoding UTF8

@"
### Nouveaux fichiers créés:
- packages/ui/src/hooks/data/useInfinitePages.ts (Hook pour scroll infini)

### Fichiers modifiés:
- packages/ui/src/hooks/data/usePages.ts (Intégration useInfinitePages)
- packages/core-electron/src/services/notion.service.ts (Méthodes pagination)
- packages/adapters/electron/src/notion-api.adapter.ts (API pagination)
- apps/notion-clipper-app/src/electron/preload.ts (Exposition méthodes)
- apps/notion-clipper-app/src/react/src/App.tsx (Props scroll infini)

### Fonctionnalités ajoutées:
- Pagination avec curseurs Notion API
- Scroll infini dans PageList
- Chargement progressif par onglets
- Gestion des états loading/hasMore
- Optimisation performances

### Handlers IPC déjà présents:
- notion:get-pages-paginated
- notion:get-recent-pages-paginated

"@ | Add-Content -Path $outputFile -Encoding UTF8

Write-Host "Fichier généré: $outputFile" -ForegroundColor Green
Write-Host "Taille: $((Get-Item $outputFile).Length) bytes" -ForegroundColor Gray