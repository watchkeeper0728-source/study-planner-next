# マイグレーション実行方法（最終版）

## 方法1: シンプルなトリガー（推奨）

デプロイが完了したら、以下のURLをブラウザのアドレスバーに入力してください：

```
https://study-planner-next-9mhnpepkp-watchkeeper0728s-projects.vercel.app/api/auth/recent-users?migrate=true
```

この方法は最もシンプルで、パラメータの不一致が起きにくいです。

## 方法2: トークンを使用

トークンを使う場合は、以下のURLを使用：

```
https://study-planner-next-9mhnpepkp-watchkeeper0728s-projects.vercel.app/api/auth/recent-users?migrate=temp-migration-token-change-in-production
```

## 実行結果

**成功した場合：**
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

**エラーの場合：**
エラーメッセージが表示されます。

## 注意

- `migrate=true` または `migrate=1` で実行できます（簡単）
- または `migrate=temp-migration-token-change-in-production` で実行できます（より安全）
- マイグレーションは安全に複数回実行できます

