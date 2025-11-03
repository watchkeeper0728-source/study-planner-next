# 本番データベースマイグレーション実行手順

## 方法1: 一時的なAPIエンドポイントを使用（推奨・簡単）

1. **このファイルを読み終えたら、以下のコマンドでAPIエンドポイントにアクセス**

2. **Vercelの環境変数を設定**（オプション、セキュリティ強化用）
   - Vercelダッシュボード → プロジェクト設定 → Environment Variables
   - 新しい環境変数を追加：
     - Key: `MIGRATION_SECRET_TOKEN`
     - Value: 任意の長いランダム文字列（例: `migration-secret-2025-abc123xyz`）

3. **マイグレーションを実行**
   
   **PowerShellまたはターミナルで実行：**
   ```powershell
   # トークンを設定（環境変数が設定されていない場合、デフォルトトークンを使用）
   $token = "temp-migration-token-change-in-production"
   
   # 本番URLを取得（Vercelダッシュボードのデプロイメントから）
   $url = "https://study-planner-next-[your-project].vercel.app/api/admin/run-migration"
   
   # リクエストを送信
   Invoke-RestMethod -Uri $url -Method POST -Headers @{Authorization="Bearer $token"} -ContentType "application/json"
   ```

   **または、ブラウザのコンソールで実行：**
   ```javascript
   fetch('https://your-app-url.vercel.app/api/admin/run-migration', {
     method: 'POST',
     headers: {
       'Authorization': 'Bearer temp-migration-token-change-in-production',
       'Content-Type': 'application/json'
     }
   })
   .then(res => res.json())
   .then(data => console.log(data))
   .catch(err => console.error(err))
   ```

4. **実行結果を確認**
   - 成功すると `{"success": true, "message": "Migration completed successfully", "columns": [...]}` が返ります

5. **マイグレーション完了後、APIエンドポイントを削除**
   - `src/app/api/admin/run-migration/route.ts` を削除
   - GitHubにコミット・プッシュ

---

## 方法2: Vercelダッシュボードから直接実行

### 前提条件
Vercelが提供するデータベース管理ツールにアクセスできる必要があります。

### 手順

1. **Vercelダッシュボードにログイン**
   - https://vercel.com/dashboard にアクセス

2. **プロジェクトを選択**
   - `study-planner-next` プロジェクトをクリック

3. **Settings → Environment Variables**
   - `DATABASE_URL` の値をコピー（表示されない場合は、Show Valueをクリック）

4. **データベース管理ツールを使用**
   - PostgreSQLクライアント（pgAdmin、DBeaver、TablePlusなど）を開く
   - `DATABASE_URL`を使用して接続

5. **SQLを実行**
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

6. **確認**
   ```sql
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'users'
   AND column_name IN ('username', 'lastLoginAt');
   ```

---

## 方法3: Vercel CLIを使用

```bash
# Vercel CLIをインストール（まだの場合）
npm i -g vercel

# プロジェクトにログイン
vercel login

# 環境変数を取得
vercel env pull .env.production

# DATABASE_URLを使用してマイグレーションを実行
npx prisma migrate deploy --schema prisma/schema.prisma
```

---

## 推奨：方法1（一時的なAPIエンドポイント）

最も簡単で確実な方法です。上記の手順に従って実行してください。

