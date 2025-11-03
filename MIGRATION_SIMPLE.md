# マイグレーション実行方法（最も簡単）

## 方法：既存のAPIエンドポイントを使用

デプロイが完了したら、以下のURLをブラウザのアドレスバーに入力してください：

```
https://study-planner-next-9mhnpepkp-watchkeeper0728s-projects.vercel.app/api/auth/recent-users?migrate=temp-migration-token-change-in-production
```

このエンドポイントは既にデプロイされて動作しているため、404エラーが出ません。

## 実行結果

**成功時：**
```json
{
  "success": true,
  "message": "Migration completed successfully",
  "columns": [...]
}
```

**通常の使用時（マイグレーショントークンなし）：**
```json
{
  "users": [...]
}
```

## 注意

- `migrate`パラメータを指定すると、マイグレーションが実行されます
- 指定しない場合は、通常通り最近のユーザー一覧が返されます

