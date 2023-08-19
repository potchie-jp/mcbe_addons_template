const fs = require("fs");
const path = require("path");
const del = require("del");
const gulp = require("gulp");
const gulpSourcemaps = require("gulp-sourcemaps");
const gulpTypeScript = require("gulp-typescript");
const gulpIgnore = require("gulp-ignore");
const gulpPlumber = require("gulp-plumber");
const webpackStream = require("webpack-stream");
const vinylNamed = require("vinyl-named");
const gulpIf = require("gulp-if");

const is_windows = process.platform === 'win32'
const is_mac = process.platform === 'darwin'
const is_linux = process.platform === 'linux'

/** プレビュー版判別フラグ */
const useMinecraftPreview = true;
/** BDS利用判別フラグ */
const useMinecraftDedicatedServer = false;
/** BDSルートディレクトリ */
const dedicatedServerPath = "/path/to/bds";
/** アドオンを１ファイルにバンドルする場合はtrueに設定 */
const useBundle = false;
/** Minecraft Preview版のルートディレクトリ */
const mcPreviewDir = is_windows ? process.env.LOCALAPPDATA + "/Packages/Microsoft.MinecraftWindowsBeta_8wekyb3d8bbwe/LocalState/games/com.mojang" : "/preview";
/** Minecraft Stable版のルートディレクトリ */
const mcStableDir = is_windows ? process.env.LOCALAPPDATA + "/Packages/Microsoft.MinecraftUWP_8wekyb3d8bbwe/LocalState/games/com.mojang" : "/stable"
/** Minecraftのルートディレクトリ */
const mcRoot = useMinecraftDedicatedServer
  ? dedicatedServerPath
  : (useMinecraftPreview
    ? mcPreviewDir // Dockerで利用する場合はホストのプレビュー版ディレクトリを指定（事前にマウント）
    : mcStableDir); // Dockerで利用する場合はホストのstable版ディレクトリを指定（事前にマウント）

/**
 * src/behavior_packsディレクトリに格納された、tsファイル以外のファイルをbuildディレクトリにコピーする
 */
function copy_behavior_packs() {
  return gulp.src(["src/behavior_packs/**/*", "!src/behavior_packs/**/scripts/**/*.{ts,js}"])
    .pipe(gulpPlumber())
    .pipe(gulp.dest("build/behavior_packs"));
}

/**
 * src/resource_packsディレクトリに格納されたファイルをbuildディレクトリにコピーする
 */
function copy_resource_packs() {
  return gulp.src(["src/resource_packs/**/*"])
    .pipe(gulpPlumber())
    .pipe(gulp.dest("build/resource_packs"));
}

/**
 * buildディレクトリを削除する
 * @param {*} cb 
 */
function cleanBuildDir(cb) {
  del.sync("build");
  cb();
}

/**
 * distディレクトリを削除する
 * @param {*} cb 
 */
function cleanDistDir(cb) {
  del.sync("dist");
  cb();
}

/**
 * ソースディレクトリのBP、RPをbuildディレクトリにコピーする
 */
const copyContentToBuildDir = gulp.parallel(copy_behavior_packs, copy_resource_packs);

/**
 * src/behavior_packsのJavaScript/TypeScriptファイルをコンパイルし、ソースマップを生成する
 * @returns 
 */
function compileScripts() {
  return gulp
    .src("src/behavior_packs/**/scripts/**/*.{js,ts}")
    .pipe(gulpPlumber())
    .pipe(gulpSourcemaps.init())
    .pipe(gulpTypeScript({
      module: "es2020",
      moduleResolution: "node16",
      lib: ["es2020", "dom"],
      strict: true,
      target: "es2020",
      noImplicitAny: true,
      allowJs: true
    }))
    .pipe(
      gulpSourcemaps.write(".", {
        sourceRoot: file => `../../src/behavior_packs/`
      })
    )
    .pipe(gulp.dest("build/behavior_packs"));
}

/**
 * development_behavior_packsディレクトリ内のビヘイビアパックを削除する
 * @param {*} cb 
 */
function cleanDevelopBehaviorPacksDir(cb) {
  const sourceRoot = "./src/behavior_packs";
  const dirs = fs.readdirSync(sourceRoot).filter(dir => fs.statSync(path.join(sourceRoot, dir)).isDirectory())
  dirs.forEach(dir => {
    console.log(`${mcRoot}/development_behavior_packs/${dir}`);
    del.sync(`${mcRoot}/development_behavior_packs/${dir}`, { force: true })
  })
  cb();
}

/**
 * development_resource_packsディレクトリ内のビヘイビアパックを削除する
 * @param {*} cb 
 */
function cleanDevelopResourcePacksDir(cb) {
  const sourceRoot = "./src/resource_packs";
  const dirs = fs.readdirSync(sourceRoot).filter(dir => fs.statSync(path.join(sourceRoot, dir)).isDirectory())
  dirs.forEach(dir => {
    console.log(`${mcRoot}/development_resource_packs/${dir}`);
    del.sync(`${mcRoot}/development_resource_packs/${dir}`, { force: true })
  })
  cb();
}

/**
 * development_behavior_packsディレクトリとdevelopment_resource_packsディレクトリにデプロイしたアドオンを削除する
 */
const cleanDevelopmentBPRPDir = gulp.parallel([cleanDevelopBehaviorPacksDir, cleanDevelopResourcePacksDir]);

const cleanAll = gulp.parallel([cleanBuildDir, cleanDevelopmentBPRPDir, cleanDistDir]);

/**
 * ビヘイビアーパックをデプロイする
 * @returns 
 */
function deployBP() {
  return gulp
    .src(["build/behavior_packs/**/*", "!build/behavior_packs/**/*.js.map"])
    .pipe(gulpPlumber())
    .pipe(gulpIgnore.exclude({ isDirectory: true }))
    .pipe(gulp.dest(`${mcRoot}/development_behavior_packs/`));
}

/**
 * リソースパックをデプロイする
 * @returns 
 */
function deployRP() {
  return gulp
    .src(["build/resource_packs/**/*"])
    .pipe(gulpPlumber())
    .pipe(gulpIgnore.exclude({ isDirectory: true }))
    .pipe(gulp.dest(`${mcRoot}/development_resource_packs/`));
}

/**
 * ビルドしたアドオンをデプロイする
 */
const deployAll = gulp.parallel([deployBP, deployRP]);


/**
 * ファイルを監視し、更新があった場合にクリーンとデプロイを行なう
 * @param {*} cb 
 */
function watchFiles(cb) {
  gulp.watch("./src/**", gulp.series(cleanBuildDir, cleanDevelopBehaviorPacksDir, copyContentToBuildDir, compileScripts, deployBP));
  cb();
}

/**
 * buildディレクトリの各ビヘイビアーパックのmain.jsをエントリーポイントとし、１ファイルにバンドルしたあとdistディレクトリに書き出す
 * @returns 
 */
function distScripts() {
  const buildRoot = "build/behavior_packs";
  const entryPoints =
    useBundle
      ? fs.readdirSync(buildRoot).filter(dir => fs.statSync(path.join(buildRoot, dir)).isDirectory()).map(d => `build/behavior_packs/${d}/scripts/main.js`)
      : fs.readdirSync(buildRoot).filter(dir => fs.statSync(path.join(buildRoot, dir)).isDirectory()).map(d => `build/behavior_packs/${d}/scripts/*.js`);
  return gulp
    .src(entryPoints, { base: "build/behavior_packs" })
    .pipe(gulpPlumber())
    .pipe(vinylNamed((file) => {
      const p = path.parse(file.relative);
      return ((p.dir) ? p.dir + path.sep : '') + p.name;
    })
    )
    .pipe(gulpIf(useBundle,webpackStream(require("./webpack.config.js"))))
    .pipe(gulp.dest("dist/behavior_packs", {
      overwrite: true,
    }));
}

/**
 * buildディレクトリ内の各ビヘイビアーパックに含まれるファイルをdist/behavior_packsディレクトリに書き出す。ts,js,js.mapファイルは除外
 * @returns 
 */
function distBPFiles() {
  return gulp.src(["build/behavior_packs/**/*", "!build/behavior_packs/**/scripts/**/*.{ts,js,js.map}"])
    .pipe(gulpPlumber())
    .pipe(gulp.dest("dist/behavior_packs"));
}

/**
 * buildディレクトリ内の各リソースパックに含まれるファイルをdist/resource_packsディレクトリに書き出す。
 * @returns 
 */
function distRPFiles() {
  return gulp.src(["build/resource_packs/**/*"])
    .pipe(gulpPlumber())
    .pipe(gulp.dest("dist/resource_packs"));
}

/**
 * build済みのアドオンをdistディレクトリに書き出す。distディレクトリは削除される。
 */
const dist = gulp.series(cleanDistDir, distScripts, distBPFiles, distRPFiles);

exports.clean = cleanAll;
exports.build = gulp.series(copyContentToBuildDir, compileScripts);
exports.deploy = deployAll;
exports.dist = dist;
exports.watch = gulp.series(cleanBuildDir, cleanDevelopmentBPRPDir, copyContentToBuildDir, compileScripts, deployAll, watchFiles);
