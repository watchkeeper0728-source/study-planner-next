# データベース修正手順

## 問題
データベースに`username`カラムが存在しません。

## 解決方法

以下のSQLを手動で実行してください：

```sql
-- 1. usernameカラムを追加
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;

-- 2. 既存ユーザーにusernameを設定（idをデフォルト値として使用）
UPDATE users SET username = id WHERE username IS NULL;

-- 3. ユニークインデックスを作成
CREATE UNIQUE INDEX IF NOT EXISTS users_username_key ON users(username);

-- 4. usernameをNOT NULLに設定
ALTER TABLE users ALTER COLUMN username SET NOT NULL;

-- 5. lastLoginAtカラムを追加
ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP;
```

## 実行方法

### 方法1: Prisma Studioを使用
```powershell
npx prisma studio
```
ブラウザで開いたPrisma StudioのSQLエディタで上記のSQLを実行

### 方法2: PostgreSQLクライアントを使用
psqlやpgAdminなどのPostgreSQLクライアントで直接実行

### 方法3: Prisma CLIを使用
```powershell
$env:DATABASE_URL="postgresql://postgres:abcd1192@localhost:5432/study_planner"
npx prisma db execute --stdin --schema prisma/schema.prisma
```
（ただし、PowerShellではheredoc構文の問題があるため、SQLファイルを作成して実行する方が確実）

SQL実行後：
```powershell
npx prisma db push --skip-generate
npx prisma generate
```

