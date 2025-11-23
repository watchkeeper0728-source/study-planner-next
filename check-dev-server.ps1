# Check if dev server is running and show logs
Write-Host "=== 開発サーバーの状態確認 ===" -ForegroundColor Cyan

# Check if port 3000 or 3001 is in use
$port3000 = netstat -ano | Select-String ":3000" | Select-Object -First 1
$port3001 = netstat -ano | Select-String ":3001" | Select-Object -First 1

if ($port3000) {
    Write-Host "✓ ポート3000でサーバーが動作中" -ForegroundColor Green
    $port3000
} elseif ($port3001) {
    Write-Host "✓ ポート3001でサーバーが動作中" -ForegroundColor Green
    $port3001
} else {
    Write-Host "✗ 開発サーバーが起動していません" -ForegroundColor Red
    Write-Host ""
    Write-Host "開発サーバーを起動するには、新しいターミナルで以下を実行してください:" -ForegroundColor Yellow
    Write-Host "  cd C:\Users\watch\Documents\study-planner-next" -ForegroundColor White
    Write-Host "  npm run dev" -ForegroundColor White
}

Write-Host ""
Write-Host "=== 確認方法 ===" -ForegroundColor Cyan
Write-Host "1. npm run dev を実行したターミナルウィンドウを探してください" -ForegroundColor White
Write-Host "2. ログインを試すと、そのターミナルにエラーログが表示されます" -ForegroundColor White
Write-Host "3. [AUTH] で始まるログメッセージを確認してください" -ForegroundColor White



