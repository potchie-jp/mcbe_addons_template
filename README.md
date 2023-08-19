# マインクラフト統合版用アドオン開発テンプレート
## これは何？
マインクラフト統合版用アドオン開発テンプレートは以下の要件を満たすために作成した開発テンプレートです。
- 1プロジェクトで複数のビヘイビアーパック/リソースパックを開発可能にする
    - メインのアドオンの他に、メインを拡張するためのアドオンを開発するなど
- TypeScript/JavaScript混在のビヘイビアーパックを開発可能にする
- TypeScriptでトランスパイルを行なっても/scriptコマンドで正常にデバッグできること
- ファイルを修正した場合、自動的にトランスパイル等の処理を実行し、development_behavior_packsフォルダおよびdevelopment_resource_packsにデプロイできること
- 開発完了時にスクリプトファイルをバンドルしてmain.jsファイルにまとめられること
- Node.jsのモジュールが利用できること
- Docker環境とWindowsネイティブ環境の両方で利用可能なこと

## 使い方
- 任意の場所にリポジトリをcloneする
- cloneしたフォルダ名を任意のものに変更する
- 自身の環境に合わせて`gulpfile.js`と`package.json`を修正
- `npm install` 実行
- `npm run watch`を実行
- `src/behavior_packs`または`src/resource_packs`フォルダ配下にフォルダを作成し、その中で通常通りアドオンを作成する。

作成したフォルダ１つ１つがアドオンになります。

`npm run watch`によりsrcフォルダ配下が監視され、ファイルが変更されるごとにビルドが走り、development_*_packsにデプロイされます。

## デバッグ

### 概要
`src/behavior_packs`フォルダ配下の各アドオンのうち、一つを選択してデバッグすることができます。

事前に"Minecraft Bedrock Edition Debugger
"と"Tasks Shell Input"のふたつの拡張機能をインストールしてください。Tasks Shell Inputをインストールすることで、デバッグ実行時にsrc/behavior_packs内のフォルダを自動的にリストアップし選択することができます。
- [Minecraft Bedrock Edition Debugger
](https://marketplace.visualstudio.com/items?itemName=mojang-studios.minecraft-debugger)
- [Tasks Shell Input](https://marketplace.visualstudio.com/items?itemName=augustocdias.tasks-shell-input)

Dev Containerを利用する場合、これらの拡張機能は自動的にインストールされます。

なお、現時点ではBDS用のアドオンのデバッグには対応しておりません。

### デバッグ方法
「実行とデバッグ」から"Listen for Minecraft"を選択するかF5キーを押下することでビヘイビアーパックを選択するプロンプトが表示されます。
デバッグしたいビヘイビアーパックを選択してください。

デバッガが起動したら、マインクラフトで`/script debugger connect localhost 19144`コマンドを実行することでデバッガにアタッチできます。

上手く接続できない場合、Windowsの制限によりlocalhostへの接続が制限されている可能性があります。その場合はターミナルで以下のコマンドを入力してloopbackの利用を許可してください。
- Stable版の場合: `npm run enablemcloopback`
- Preview版の場合: `npm run enablemcpreviewloopback`

## パッケージング
開発完了後に`npm run dist`を実行することで、`dist`フォルダに完成したアドオンが格納されます。圧縮してmcpackやmcaddonにすることで配布も可能です。

`gulpfile.js`の`useBundle`をtrueに設定することで、１ファイルにバンドルされます。


## 注意点
ビヘイビアーパックのmanifest.jsonに指定するエントリーポイント（entryプロパティ）は必ず`scripts/main.js`としてください。うまくバンドルできなくなります。

## Dockerコンテナでの開発
このテンプレートにはVisual Studio Code Dev Containersの設定が含まれています。Windows＋WSL2＋Docker Desktopな方はDev Containerを利用することでホスト環境を汚さず、かつNode.jsランタイムのインストールなしにアドオンの開発、デプロイ、パッケージ化が可能です。

Dev Containerを利用する際はあらかじめ環境変数`WSLENV`に`LOCALAPPDATA/pu`を追加しておいてください。コンテナからWindowsの`LOCALAPPDATA`環境変数を参照し、デプロイ先に指定するために必要な設定となります。

ただし、Windows上にcloneした場合、Dev Containerを利用するとファイルの読み書きのパフォーマンスが著しく低下します。Dev Containerを利用する場合はWSL2のLinuxディストリビューション上にcloneしてください。

## 開発状況
ずっと開発中です。