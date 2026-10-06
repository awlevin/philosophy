#!/bin/sh
# Packs the PNG layers in lab-out/layers into lab-out/site/frames.json (WebP data URIs, plus how far
# the page had slid on each frame), next to a copy of the lab page.
set -e
rm -rf lab-out/site lab-out/webp
mkdir -p lab-out/site lab-out/webp
for d in lab-out/layers/*/; do
  layer=$(basename "$d")
  mkdir -p "lab-out/webp/$layer"
  case "$layer" in base) q=70 ;; *) q=80 ;; esac
  for f in "$d"*.png; do magick "$f" -quality $q "lab-out/webp/$layer/$(basename "$f" .png).webp"; done
done
node -e '
const fs = require("fs");
const out = { slid: JSON.parse(fs.readFileSync("lab-out/layers/slid.json", "utf8")) };
for (const layer of fs.readdirSync("lab-out/webp")) {
  out[layer] = fs.readdirSync("lab-out/webp/" + layer).sort()
    .map((f) => "data:image/webp;base64," + fs.readFileSync(`lab-out/webp/${layer}/${f}`).toString("base64"));
}
fs.writeFileSync("lab-out/site/frames.json", JSON.stringify(out));
'
cp lab/index.html lab-out/site/index.html
