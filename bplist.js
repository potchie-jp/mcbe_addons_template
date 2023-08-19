const fs = require("fs");
const targetDir = "./src/behavior_packs";

fs.readdirSync(targetDir).forEach(dir => console.log(dir));
