$files = Get-ChildItem -Path . -Filter "*.js"
$htmls = Get-ChildItem -Path . -Filter "*.html"
$allFiles = $files + $htmls

$replacements = @(
    @("atÃ©", "at"),
    @("AtÃ©", "At"),
    @("nÃ£o", "no"),
    @("NÃ£o", "No"),
    @("MÃªs", "Ms"),
    @("mÃªs", "ms"),
    @("VocÃª", "Voc"),
    @("vocÃª", "voc"),
    @("Ã©", "e"),
    @("Ã£", "a")
)

$changedCount = 0

foreach ($f in $allFiles) {
    if ($f.Name -match "\.(js|html)$" -and $f.Name -ne "repair_accents.ps1" -and $f.Name -ne "undo_corruption.ps1" -and $f.Name -ne "fix_syntax.ps1") {
        $text = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
        $original = $text
        
        foreach ($pair in $replacements) {
            $key = $pair[0]
            $value = $pair[1]
            $text = $text.Replace($key, $value)
        }
        
        if ($text -cne $original) {
            [System.IO.File]::WriteAllText($f.FullName, $text, [System.Text.Encoding]::UTF8)
            Write-Host "Fixed: $($f.Name)"
            $changedCount++
        }
    }
}
Write-Host "Total files fixed: $changedCount"
