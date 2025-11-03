# デプロイメント修正手順

## 問題
本番データベースに`username`カラムが存在しないため、ログインが機能していません。

## 解決方法

Vercelのビルドプロセスでマイグレーションが実行されているはずですが、手動で確認・実行する必要がある場合があります。

### 方法1: Vercel環境変数を確認

1. Vercelダッシュボードにアクセス
2. プロジェクト設定 → Environment Variables
3. `DATABASE_URL`が正しく設定されているか確認

### 方法2: ビルドログでマイグレーションを確認

1. Vercelダッシュボードで最新のデプロイメントを開く
2. ビルドログを確認
3. `prisma migrate deploy`の実行結果を確認
4. マイグレーションが適用されているか確認

### 方法3: 手動でマイグレーションを適用（推奨）

本番データベースに対して直接SQLを実行します：

```sql
-- Add username column if it doesn't exist
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" TEXT;

-- Set username for existing users (use id as fallback if username is null)
UPDATE "users" SET "username" = "id" WHERE "username" IS NULL;

-- Create unique index if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username");

-- Make username NOT NULL (after all rows have values)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'username' 
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;
    END IF;
END $$;

-- Add lastLoginAt column if it doesn't exist
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP;
```

### 実行方法

1. **Vercel CLIを使用**（推奨）
   ```bash
   vercel env pull .env.production
   # DATABASE_URLを確認してから以下を実行
   npx prisma migrate deploy --schema prisma/schema.prisma
   ```

2. **データベース管理ツールを使用**
   - Vercelの`DATABASE_URL`環境変数をコピー
   - PostgreSQLクライアント（pgAdmin、DBeaver、psqlなど）で接続
   - 上記のSQLを実行

3. **VercelのFunctionを使用**
   - 一時的なAPIエンドポイントを作成してSQLを実行
   - 実行後は削除

## 確認

マイグレーション適用後、以下で確認：

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('username', 'lastLoginAt');
```

`username`と`lastLoginAt`カラムが存在し、`username`がNOT NULLであることを確認してください。

