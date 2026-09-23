# 愛されnote デザイン・実装ガイド

「愛されnote」シリーズ(Day1, Day2...)のHTML原稿を作る際に、同じトンマナ・同じ品質で、同じ不具合を再発させずに作るための仕様書。
次回、本文原稿(テキスト)だけを渡された場合、このガイドの通りに実装すれば同じ見た目・同じ挙動のページが再現できることを目標にしている。

参照実装: `belovenote/v9t077fs11ysxj.html`(Day1)、`belovenote/z6j27ad9l6czp9.html`(Day2)


## 1. トンマナ(世界観)

- **想定読者**: 恋愛に悩む20〜30代女性。LINE配信/音声配信の内容を記事化した「愛されnote」シリーズの1日分。
- **文体**: 配信者が語りかけるような口語体。「〜なんです」「〜と思います」「〜ですよね」。絵文字は要所のみ(😊など)。三点リーダー「...」「……」で余韻を作る。
- **トーン**: 共感 → 気づき → 安心 → 前向きな未来、の順で読者の感情を動かす。決して読者を責めない(「あなたが悪いわけではない」を明言するセクションを必ず入れる)。
- **配色**: 白〜淡いピンク〜モーブ(赤紫)を基調にした、上品で女性向けな配色。ネオンや原色は使わない。


## 2. カラー・タイポグラフィ トークン

`:root` に必ずこのカスタムプロパティ一式を定義する(値は固定でよい):

```css
:root{
  --bg-white:#FFFCFB;
  --bg-pink-soft:#FFF7F8;
  --bg-pink-deep:#FBECEF;
  --bg-mauve:#F8F1F3;
  --bg-plum:#F2E4E8;
  --bg-warm:#FFF9EF;
  --accent:#D95B7D;
  --accent-deep:#B9365D;
  --accent-warm:#B7772F;
  --text:#342B2F;
  --text-light:#66585D;
  --line:#EBD9DE;
  --card-bg:#ffffff;
  --shadow-soft:0 14px 40px rgba(83,52,62,.08);
}
```

- **フォント**: Noto Sans JP(400/500/700)。`<head>`で Google Fonts を preconnect + 読み込み。
- **見出し色**: `--accent-deep`。本文色: `--text`。
- **本文行間**: `body{line-height:1.9}`。読みやすさ最優先で詰めすぎない。


## 3. ページの基本骨格(毎回このテンプレ順で組む)

セクションごとに背景色を替え、間に波型の区切り(`.wave` SVG)を挟むことで「章が切り替わった」感を出す。この順番は毎回踏襲する(内容によって数は前後してよい):

1. **ヒーロー(FV)** — タイトル文字を焼き込んだ縦長画像1枚を表示するだけ(`.fv` / `.fv-img`、詳細は8章)
2. **PREVIOUSLY**(bg-white) — 前回の振り返り
3. **今日読むと分かること**(bg-warm) — `.highlight-box` でベネフィットを先出し、「必ず最後まで読んでください」で引き込む
4. **YOUR FEELINGS**(bg-mauve) — 読者の「今の辛い状況」を描写。LINE風吹き出し(`.bubble`)や `.pull-quote` を使い感情移入させる
5. **REASON 01/02/03**(bg-soft → bg-white → bg-plum と交互) — `.reason-card` を使い、原因を1つずつカード化して提示
6. **WHY IT HAPPENS**(bg-plum) — なぜそうなるのか、具体エピソードでメカニズムを解説。`.story-head` で小見出しを刻みながら進める
7. **IT'S NOT YOUR FAULT**(bg-warm) — 「あなたのせいじゃない」で読者を安心させる。`.rejected`(打ち消し線)で「間違った俗説」を否定する
8. **THE REAL CAUSE**(bg-white) — 本当の原因を明かす
9. **WHAT MEN REALLY WANT**(bg-warm) — 男性側の本音、`.highlight-box` で核心を提示
10. **YOUR FUTURE / ベネフィット**(bg-white) — `.benefit-list` で叶う未来を列挙 → `.announce-box` で次のオファー/新プロジェクトを予告
11. **NEXT NOTE**(bg-deep、ドット柄背景) — `.next-preview` で次回タイトルを予告
12. **TODAY'S WORK**(bg-white) — `.work-box` + `.cta-btn` でワーク(行動喚起)を出す
13. **footer** — コピーライト1行

各セクションは `<section class="bg-xxx"><div class="wrap">...</div></section>` の形。セクション間に

```html
<div class="wave" style="color:var(--bg-次のセクションの色)"><svg viewBox="0 0 500 40" preserveAspectRatio="none"><path d="M0,25 C125,0 375,45 500,15 L500,40 L0,40 Z" fill="currentColor"/></svg></div>
```

を挟む(`color` は**次に続くセクションの背景色**を指定する)。


## 4. コンポーネント一覧(そのまま流用可)

| クラス | 用途 |
|---|---|
| `.wrap` | 本文の中央寄せコンテナ。`max-width:680px; padding:0 32px`(モバイルは22pxに縮小) |
| `.section-kicker` | セクション先頭の英字ラベル(例: `PREVIOUSLY`, `YOUR FEELINGS`) |
| `.subhead` / `.subhead-sm` / `.subhead-lg` | 中央寄せの見出し(h2)。下線装飾つき |
| `.story-head` | 左ボーダー付きの小見出し(h3)。エピソードの節目に使う |
| `.key-line` | 白背景の角丸ボックス。太字で「核心の一文」を強調する時に使う |
| `.pull-quote` | 引用のように大きく中央表示する一文。セクションのまとめに使う |
| `.quote` | 文中のセリフ・キーワードにマーカー風のハイライトをかける `<span>` |
| `.emphasis` | 文中の重要語を `--accent-deep` の太字にする `<span>` |
| `.rejected` | 「よくある間違った俗説」に打ち消し線を引く |
| `.highlight-box` | 白背景・影つきの目立つボックス(ベネフィット提示や核心メッセージに使用) |
| `.reason-card` / `.reason-num` / `.reason-title` / `.card-subhead` | 原因カード一式。`.reason-num` は①②③の丸番号バッジ |
| `.chat-row.self/.other` + `.bubble.self/.other` | LINE風トーク吹き出し。`self`=自分(右・濃いピンク)、`other`=相手(左・白) |
| `.benefit-list` | ♡アイコン付きのベネフィット箇条書き |
| `.announce-box` | 新オファー・新プロジェクトの告知ボックス(黄土色アクセント) |
| `.next-preview` | 次回予告ボックス |
| `.work-box` / `.work-title` / `.cta-btn` | 巻末のワーク(CTA)ボックス |
| `.photo-slot` | 画像の16:9スロット(詳細は8章) |
| `.progress-mini` | ヒーロー下の「Day進捗バー」(現状は使わなくてもよいが用意はしておく) |


## 5. 本文の書き方ルール(改行・強調のトンマナ)

- 本文は `<p class="beat">〜</p>` の積み重ねで書く。1つの `.beat` の中で `<br>` を使い、**短いフレーズごとに改行して詩的なリズムを作る**のがこのシリーズの特徴。1文をだらだら続けない。
- 強調したいセリフや読者の心の声は `<span class="quote">「〜」</span>` で囲む。
- 一番言いたい核心の一文は `.key-line` ボックスか `.pull-quote` にする(多用しない。ここぞという所だけ)。
- LINEのやり取りを再現したい時は `.bubble` を使う(スクショの代わり)。
- 「よくある間違った俗説」を提示して否定する時は `<span class="rejected">` で打ち消し線。

### 改行位置の文字数の目安(超重要・7章のバグ対策とセット)

見出し(`h1/h2/h3`)や `.highlight-box` `.announce-box` `.next-preview h3` など、**手動の `<br>` がスマホでもそのまま改行として効く要素**では、1行あたりの文字数を以下の目安に収めること。これを超えると、スマホ幅で自動折り返しが発生し、末尾に1〜2文字だけが取り残される「孤立文字」が発生する(禁則ではないが見た目が崩れる)。

- 見出し(`.subhead` 系, 17〜25px): **1行 最大 18〜20文字**
- `.highlight-box` / `.announce-box`(17.5〜21px): **1行 最大 16〜18文字**
- `.story-head`(17px): **1行 最大 18文字**

原稿の `<br>` を入れる位置は、必ず上記の文字数以内で区切ること。1文が長くなる場合は2行・3行に分割してよい(このシリーズは元々短い行を重ねるスタイルなので、行数が増えること自体は問題ない)。


## 6. QAチェックリスト(コミット前に必ず実施)

スマホ幅は端末によって **360px 〜 430px** まで幅がある(iPhone SE/標準機は360〜390px、iPhone Plus/Pro Maxは414〜430px)。この範囲全部で崩れないか確認する。

1. Chromium(Playwrightなどのヘッドレスブラウザ)で幅 `360 / 375 / 390 / 414 / 430` の5パターンをスクリーンショット、または `document.documentElement.scrollWidth > clientWidth` で横はみ出しがないかチェックする。
2. 見出し・ボックス類(`h1,h2,h3,.highlight-box,.announce-box,.next-preview,.key-line`)について、`<br>` で区切られた各セグメントが2行以上に折り返していないか確認する。折り返している場合、最終行が短すぎないか(1〜3文字だけの孤立行になっていないか)を見る。
   - 簡易チェック法: 各セグメントを `Range` にして `getClientRects()` を呼び、行(top座標)の数を数える。2行以上になっていて、かつ最終行の幅が極端に狭い(目安: 35px未満)場合は要修正。
3. CTAボタン(`.cta-btn`)の `href` が `#` のままになっていないか確認する。
4. Clarityタグのプロジェクトidが、他のページ(前日分など)からコピペしたままの使い回しになっていないか確認する(9章参照)。


## 7. 絶対にやってはいけない実装(過去に踏んだ地雷)

### 7-1. `br + br{display:none}` は使わない

「`<br><br>` と連続して書いた時に、空白1行分ではなく普通の1行改行として見せたい」という意図でこのCSSが過去使われていたが、**重大なバグを引き起こすため使用禁止**。

理由: CSSの隣接兄弟セレクタ `A + B` は、**間にテキストノード(文章)が挟まっていても、直前の「要素として最も近い兄弟」がAであれば一致する**。そのため `<br>` が一度でも2つ以上同じ親要素内に登場すると、2つ目以降の `<br>` は(たとえ間に大量の本文が挟まっていても)全部 `br + br` にマッチして非表示になる。さらに、非表示になった `<br>` 自体も「要素としては存在する」ので、その次の `<br>` もまた連鎖的にマッチしてしまい、**結果としてその親要素内のほぼ全ての改行が効かなくなり、本文が全部ひとつなぎの塊になる**。

これは実際にDay2ページで発生し、スマホで見た時に本文がほぼ改行なしの塊になってしまう不具合の原因になった。

- **代わりにどうするか**: 単純に `br + br` ルールを使わない。`<br><br>` はそのまま「1行の空白(段落の間の余白)」として描画させる。これはむしろ見た目としても意図に合っている(段落の切れ目に自然な余白ができる)。
- どうしても「`<br><br>`なのに余白を作りたくない」という特殊なケースがある場合は、CSSではなく **原稿側で `<br>` を1つだけ書く**ことで対応する(自動で潰そうとしない)。

### 7-2. モバイル用ブレークポイントは `max-width:480px` にする(420pxにしない)

iPhoneの「Plus」「Pro Max」系は画面のCSS上の幅が **414〜430px** ある。ブレークポイントを `max-width:420px` にすると、430px幅の端末(iPhone 14/15/16 Plus・Pro Max等、かなりのシェアを占める)がモバイル用調整(文字サイズ縮小・余白縮小など)の対象から漏れ、PC版のレイアウトのまま表示されて崩れる。**必ず `max-width:480px` を使うこと。**

### 7-3. 画像は必ずリサイズ・圧縮してからコミットする

AI生成画像やスクリーンショットをそのままリポジトリに入れると、1枚1.5〜2MB超になることが多い。これが7枚溜まると1コミットで15MB超になり、**GitHubへのpushがHTTPタイムアウト(408)で失敗する**(実際に発生した)。

画像を追加する際は必ず以下を行う:

- 横長(16:9の `.photo-slot` 用): 横幅 **1000px** 程度にリサイズ
- 縦長(ヒーロー用フルビュー画像): 横幅 **900px** 程度にリサイズ
- 形式は **JPEG、quality 80〜85** で保存(写真はPNGよりJPEGの方が大幅に軽い)
- 1枚あたり **150KB前後**に収まっているか確認する(合計でも1MB前後に収まるのが目安)

Python(Pillow)での例:

```python
from PIL import Image
im = Image.open(src).convert('RGB')
im = im.resize((1000, round(im.height * 1000 / im.width)), Image.LANCZOS)
im.save(dst, 'JPEG', quality=82, optimize=True)
```


## 8. 画像の入れ方

### 8-1. ヒーロー画像(FV)

タイトル文字を画像側に焼き込んだ1枚を、ヒーローセクションとして丸ごと差し替える(h1テキストは書かない):

```css
.fv{padding:0;}
.fv-img{display:block;width:100%;}
```

```html
<section class="fv">
  <img src="images/FV2.jpg" alt="(タイトルの内容をそのままalt文に)" class="fv-img">
</section>
```

### 8-2. 本文中の写真スロット(`.photo-slot`)

画像がまだない段階では、プレースホルダーとして以下を仮置きする(`data-photo` は連番でよいが、後述の通り本文中の**上から数えた順番と必ずしも一致しない**ことがあるので注意):

```html
<div class="photo-slot" data-photo="01">
  <div class="photo-slot-inner">
    <span class="photo-slot-num">PHOTO 01</span>
    <span class="photo-slot-title">(どんなシーンかの説明)</span>
    <span class="photo-slot-note">生成画像へ差し替え｜16:9・文字なし</span>
  </div>
</div>
```

画像が用意できたら、**プレースホルダー用の内側divを丸ごと`<img>`に差し替え、`.photo-slot` に `has-photo` クラスを追加する**:

```html
<div class="photo-slot has-photo" data-photo="01">
  <img src="images/note2-photo01.jpg" alt="(シーンの説明)" loading="lazy">
</div>
```

対応するCSS(すでに `.photo-slot` の定義に含まれているので追加不要、確認用に明記):

```css
.photo-slot.has-photo::before{content:none;}
.photo-slot.has-photo img{position:relative;z-index:1;width:100%;height:100%;object-fit:cover;display:block;}
```

**画像ファイルの命名・割り当て**: 生成画像を受け取ったら、本文の**上から下への出現順**で `note{Day番号}-photo01.jpg, 02.jpg, ...` と連番で保存し、その順番通りに各スロットへ入れる。`data-photo` 属性の番号は過去の原稿で実際の出現順とズレていることがある(例: 2番目のカードが `data-photo="04"`、3番目が `data-photo="03"` など)ので、**`data-photo` の数字ではなく実際の見た目の並び順を基準にする**こと。


## 9. Clarity計測タグ

`<head>` の一番最初、CSSより前に以下を設置する。**`i` に渡すID文字列は、ページ(Day)ごとに必ず別のIDを使う**(前回分をコピペしたまま使い回さない)。

```html
<script type="text/javascript">
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "【このページ専用のID】");
</script>
```


## 10. 公開ファイル名・CTAリンク・デプロイ

- **ファイル名**: 完成後、`belovenote/` 直下に**推測されにくいランダムな英数字**(例: `z6j27ad9l6czp9.html`)でリネームして置く。作業中の分かりやすいファイル名のまま公開しない。
- **CTAボタン**(`.cta-btn` の `href`): 必ず実際の遷移先URL(LINE登録リンクなど)に設定する。`#` のまま公開しない。
- **デプロイ**: `main` ブランチにpushすると `.github/workflows/deploy.yml` が自動でXserverへFTPデプロイする。手動デプロイ操作は不要で、**コミット→push**するだけでよい。
  - 画像を含むコミットは7-3の圧縮ルールを守らないとpushがタイムアウトするので注意。


## 11. 制作フロー(原稿を受け取ってからの手順)

1. 原稿(テキスト)を受け取り、3章のセクション順に当てはめる。原因の数などは原稿の内容に応じて増減してよい。
2. 5章のルールに沿って `.beat`/`<br>` で本文を組み、`.quote` `.key-line` `.pull-quote` `.emphasis` を要所に配置する。見出し・ボックス類は改行位置を5章の文字数目安内に収める。
3. 画像は8章の通りプレースホルダーを仮置きして先に文面を完成させる。
4. 生成画像が届いたら7-3の圧縮ルールでリサイズ・JPEG化し、8章の通り上から順に差し替える。
5. CTAリンクとClarityタグ(専用ID)を設定する。
6. 6章のQAチェックリストを実施し、崩れがあれば5章の目安に沿って `<br>` 位置を調整する。
7. ファイル名をランダム文字列にリネーム。
8. 画像サイズを確認の上コミット→push(自動でXserverにデプロイされる)。
