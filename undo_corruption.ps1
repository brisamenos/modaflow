$files = Get-ChildItem -Path . -Filter "*.js"
$htmls = Get-ChildItem -Path . -Filter "*.html"
$allFiles = $files + $htmls

$undos = @(
    @("nÃ£ome", "nome"),
    @("atÃ©ivo", "ativo"),
    @("datÃ©a", "data"),
    @("creatÃ©ed_atÃ©", "created_at"),
    @("updatÃ©e", "update"),
    @("statÃ©us", "status"),
    @("parseFloatÃ©", "parseFloat"),
    @("DatÃ©e", "Date"),
    @("matÃ©ch", "match"),
    @("MatÃ©h", "Math"),
    @("prÃ©o", "preco"),
    @("nÃ£o", "nao"),
    @("AtÃ©", "At"),
    @("MÃªs", "Ms"),
    @("nÃ£ovamente", "novamente"),
    @("menÃ£os", "menos")
)

foreach ($f in $allFiles) {
    if ($f.Name -match "\.(js|html)$" -and $f.Name -ne "repair_accents.ps1" -and $f.Name -ne "undo_corruption.ps1") {
        $text = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
        
        foreach ($pair in $undos) {
            $key = $pair[0]
            $value = $pair[1]
            $text = $text.Replace($key, $value)
        }
        
        [System.IO.File]::WriteAllText($f.FullName, $text, [System.Text.Encoding]::UTF8)
    }
}
Write-Host "Reverso concluido!"
