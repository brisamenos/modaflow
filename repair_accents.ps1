$files = Get-ChildItem -Path . -Filter "*.js"
$htmls = Get-ChildItem -Path . -Filter "*.html"
$allFiles = $files + $htmls

$replacements = @(
    @("dgitos", "dígitos"),
    @("Aniversrio", "Aniversário"),
    @("Observaes", "Observações"),
    @("Informaes", "Informações"),
    @("Ateno", "Atenção"),
    @("Opes", "Opções"),
    @("Aes", "Ações"),
    @("Nmero", "Número"),
    @("nmero", "número"),
    @("Concludo", "Concluído"),
    @("concludo", "concluído"),
    @("Histrico", "Histórico"),
    @("Cdigo", "Código"),
    @("cdigo", "código"),
    @("Carto", "Cartão"),
    @("carto", "cartão"),
    @("Preo", "Preço"),
    @("preo", "preço"),
    @("nicio", "início"),
    @("Incio", "Início"),
    @("Endereo", "Endereço"),
    @("endereo", "endereço"),
    @("Veculo", "Veículo"),
    @("veculo", "veículo"),
    @("Mximo", "Máximo"),
    @("mximo", "máximo"),
    @("Crdito", "Crédito"),
    @("crdito", "crédito"),
    @("Dbito", "Débito"),
    @("dbito", "débito"),
    @("Credirio", "Crediário"),
    @("credirio", "crediário"),
    @("Informaco", "Informação"),
    @("Informao", "Informação"),
    @("Observao", "Observação"),
    @("OBSERVAO", "OBSERVAÇÃO"),
    @("Padro", "Padrão"),
    @("padro", "padrão"),
    @("At", "Até"),
    @("at", "até"),
    @("Ms", "Mês"),
    @("Voc", "Você"),
    @("voc", "você"),
    @("No", "Não"),
    @("no", "não"),
    @("Concluda", "Concluída"),
    @("concluda", "concluída"),
    @("Obrigatrio", "Obrigatório"),
    @("obrigatria", "obrigatória")
)

foreach ($f in $allFiles) {
    if ($f.Name -ne "repair_accents.ps1") {
        # Using [IO.File] for Case-Sensitive Replace
        $text = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
        
        foreach ($pair in $replacements) {
            $key = $pair[0]
            $value = $pair[1]
            # Replace case-sensitive matching
            $text = $text.Replace($key, $value)
        }
        
        [System.IO.File]::WriteAllText($f.FullName, $text, [System.Text.Encoding]::UTF8)
    }
}
