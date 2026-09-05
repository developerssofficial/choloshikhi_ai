import urllib.request, zipfile, ssl
from pathlib import Path

ssl_context = ssl._create_unverified_context()
model_dir = Path.home() / ".EasyOCR" / "model"
model_dir.mkdir(parents=True, exist_ok=True)

models = {
    "craft_mlt_25k.pth": "https://github.com/JaidedAI/EasyOCR/releases/download/pre-v1.1.6/craft_mlt_25k.zip",
    "bengali.pth": "https://github.com/JaidedAI/EasyOCR/releases/download/v1.1.8/bengali.zip",
    "latin_g2.pth": "https://github.com/JaidedAI/EasyOCR/releases/download/v1.3/latin_g2.zip",
}

headers = {'User-Agent': 'Mozilla/5.0'}

for target_pth, url in models.items():
    dest_pth = model_dir / target_pth
    if dest_pth.exists():
        print(f"Already exists: {target_pth}")
        continue
    
    zip_name = url.split('/')[-1]
    zip_path = model_dir / zip_name
    print(f"Downloading {zip_name} from {url}...")
    
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, context=ssl_context) as resp, open(zip_path, 'wb') as out_file:
        out_file.write(resp.read())
    
    print(f"Extracting {zip_name}...")
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(model_dir)
    print(f"Extracted {target_pth}")
    if zip_path.exists():
        zip_path.unlink()

print("All models ready!")
