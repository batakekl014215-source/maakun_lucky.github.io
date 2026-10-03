# エックスサーバーへの設置手順

1. サーバーの公開ディレクトリ（例：`public_html/<ドメイン>/chousei/`）に、このフォルダの
   `index.html` `event.html` `admin.html` `.htaccess` `assets/` `api/` をアップロードする。
   （`REQUIREMENTS.md` `DEPLOY.md` は不要。`.gitignore` も不要）
2. 公開ディレクトリの**外**に `chousei_data/` を作る（例：`~/<ドメイン>/chousei_data/`、権限700）。
   `api/lib/config.php` は「`api/lib` から3つ上のフォルダ」の `chousei_data/` を使うので、
   配置が違う場合はサーバーの環境変数 `CHOUSEI_DATA_DIR` か `config.php` の `DATA_DIR` を書き換える。
3. サーバーのPHPを 8.x にする（サーバーパネル → PHP Ver.切替）。
4. `https://<ドメイン>/chousei/` を開き、イベントを作成して動作確認する。
5. `https://<ドメイン>/chousei/api/lib/db.php` が403になること、`.sqlite` に直接アクセスできないことを確認する。

ローカル確認：`php -S 127.0.0.1:8765`（このフォルダで実行）。ただし `.htaccess` はローカルでは効かない。
