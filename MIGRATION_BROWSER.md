# ブラウザからマイグレーションを実行する方法

## 簡単な方法：ブラウザのアドレスバーで実行

デプロイが完了したら、以下のURLをブラウザのアドレスバーに入力してください：

```
https://study-planner-next-9mhnpepkp-watchkeeper0728s-projects.vercel.app/api/admin/run-migration?token=temp-migration-token-change-in-production
```

**または、プロダクションドメインを使用する場合：**
（Vercelダッシュボードで確認した実際のプロダクションドメインに置き換えてください）

```
https://your-production-domain.vercel.app/api/admin/run-migration?token=temp-migration-token-change-in-production
```

## 実行結果

成功すると、以下のようなJSONが表示されます：

```json
{
  "success": true,
  "message": "Migration completed successfully",
  "columns": [
    {"column_name": "username", "data_type": "text", "is_nullable": "NO"},
    {"column_name": "lastLoginAt", "data_type": "timestamp without time zone", "is_nullable": "YES"}
  ]
}
```

エラーの場合は、エラーメッセージが表示されます。

## 実行後

1. マイグレーションが成功したら、ログインを試してください
2. **重要**: マイグレーション完了後、`src/app/api/admin/run-migration/route.ts`を削除してGitHubにプッシュしてください

