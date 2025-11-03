# マイグレーション実行URL

デプロイが完了したら、以下のいずれかのURLをブラウザのアドレスバーに入力してください：

## オプション1: /api/migrate（推奨）

```
https://study-planner-next-9mhnpepkp-watchkeeper0728s-projects.vercel.app/api/migrate?token=temp-migration-token-change-in-production
```

## オプション2: /api/admin/run-migration

```
https://study-planner-next-9mhnpepkp-watchkeeper0728s-projects.vercel.app/api/admin/run-migration?token=temp-migration-token-change-in-production
```

## プロダクションドメインを使用する場合

もしVercelがカスタムドメインまたは別のプロダクションドメインを割り当てている場合は、そのドメインに置き換えてください。

## 実行結果

**成功時：**
```json
{
  "success": true,
  "message": "Migration completed successfully",
  "columns": [...]
}
```

**エラー時：**
エラーメッセージが表示されます。

## 注意

- デプロイが完了するまで数分かかる場合があります
- 404エラーが出る場合は、デプロイがまだ完了していない可能性があります
- 少し待ってから再度試してください

