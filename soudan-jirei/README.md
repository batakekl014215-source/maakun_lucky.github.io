# 相談事例ページ

LINEの「相談事例」ページ（スマホ縦画面で見る静的サイト）。仕様は [REQUIREMENT.md](REQUIREMENT.md)（開発用・非公開）。
URL: `…/soudan-jirei/`

## フォルダ構成

```
soudan-jirei/
├─ index.html            ページ本体
├─ css/
│   ├─ tokens.css        色・余白・フォントの変数
│   └─ style.css         レイアウト、吹き出し、帯、インジケーター
├─ js/
│   └─ render.js         データの描画、「続きを読む」、右端インジケーター
├─ data/
│   ├─ cases.json        文章データ（ここを編集する。非公開）
│   └─ cases.js          cases.json から生成（直接編集しない。公開）
├─ assets/               画像（hero.jpg / character.png / avatar.png を置く）
├─ scripts/
│   └─ build-data.py     cases.json → cases.js（非公開）
├─ REQUIREMENT.md  VSCODE_PROMPT.md  reference/  .vscode/  .editorconfig   （開発用・非公開）
└─ README.md  .gitignore
```

## 開く方法

- **VSCode**: 拡張機能「Live Server」を入れて、`index.html` を右クリック →「Open with Live Server」
- **ターミナル**: `python3 -m http.server 5173` を実行して、ブラウザで http://127.0.0.1:5173/ を開く
- `index.html` をダブルクリックしても開ける（データは `cases.js` で読むため）
- 確認は、スマホ幅（393px）で行う

## 文章を直すとき

1. `data/cases.json` を編集する（相談文・返信文・ヘッドコピーなど）
2. `python3 scripts/build-data.py` を実行して、`data/cases.js` を作り直す
3. ブラウザを更新する

## 素材を差し替えるとき

| 素材 | ファイル | 差し替え先 |
|---|---|---|
| ヒーロー写真 | `assets/hero.jpg` | `css/style.css` の `.hero` のコメントを有効にする |
| イントロのキャラクター | `assets/character.png` | `index.html` の `.intro__char` を `<img src="assets/character.png" alt="">` にする |
| 返信側アイコン | `assets/avatar.png` | `css/style.css` の `.avatar` のコメントを有効にする（頭文字は `js/render.js` で消す） |

## 公開について（重要）

- このリポジトリは、`main` への push で、コミットしたファイルが Xserver へ自動アップロードされる。**push は、そのまま本番反映**。
- 開発用ファイルは `.gitignore` で除外してある。新しい開発用ファイルを足したら、`.gitignore` に追記して、コミット前に `git status` で確認する。
- `noindex` と計測タグは、あとから入れる（`index.html` の `<head>` にコメントで位置を残してある）。
