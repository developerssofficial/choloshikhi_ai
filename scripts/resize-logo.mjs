import sharp from "sharp";
import path from "path";

const src = path.join(process.cwd(), "public", "logo-source.png");
const outDir = path.join(process.cwd(), "public");

const sizes = [
  { name: "icons/icon-192.png", size: 192 },
  { name: "icons/icon-512.png", size: 512 },
  { name: "favicon.png", size: 64 },
];

for (const { name, size } of sizes) {
  await sharp(src)
    .resize(size, size, { fit: "contain", background: { r: 15, g: 15, b: 20, alpha: 1 } })
    .png()
    .toFile(path.join(outDir, name));
  console.log(`Created ${name} (${size}x${size})`);
}

console.log("All icons generated.");
