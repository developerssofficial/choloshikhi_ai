import os, sys, json, io, glob, time
from pathlib import Path
import pymupdf
import PIL.Image
import boto3

sys.stdout.reconfigure(encoding='utf-8')

PDF_DIR = Path(r"C:\Users\user\Downloads\All class book PDF")

R2_ENDPOINT = "https://dd7cb6a979c65909b60d9a01f957f8ad.r2.cloudflarestorage.com"
R2_ACCESS_KEY = "5def274aa44074d7f2d29cc6dce3ea41"
R2_SECRET_KEY = "37e7e07a88ad4a5a4b961a83314b0aa2735c7abd7a63028aabe2ee4a7b313d0d"
R2_BUCKET = "choloshikhi-books"
PUBLIC_CDN_BASE = "https://pub-a611f56309ed46a4b679c7d265f45be6.r2.dev"

s3 = boto3.client(
    's3',
    endpoint_url=R2_ENDPOINT,
    aws_access_key_id=R2_ACCESS_KEY,
    aws_secret_access_key=R2_SECRET_KEY,
    region_name='auto'
)

def get_existing_keys():
    existing = set()
    paginator = s3.get_paginator('list_objects_v2')
    for page in paginator.paginate(Bucket=R2_BUCKET):
        for obj in page.get('Contents', []):
            existing.add(obj['Key'])
    return existing

# Auto-discover all PDFs and map to slugs
SLUG_MAP = {
    "Bangla_Book": "bangla",
    "bangla_book": "bangla",
    "English_Book": "english",
    "english_Book": "english",
    "Math_Book": "math",
    "math_Book": "math",
    "Science_Book": "science",
    "Bangladesh and Global Studies_Book": "bgs",
    "Bangladesh and Global Studies": "bgs",
    "Islam Religion_Book": "islam",
    "Islamic Religion_Book": "islam",
    "Hindu Religion_Book": "hindu",
}

def discover_pdfs():
    mappings = []
    for class_dir in sorted(PDF_DIR.iterdir()):
        if not class_dir.is_dir():
            continue
        # Extract class number from folder name like "Class 1 (প্রথম শ্রেণী)"
        dir_name = class_dir.name
        class_num = None
        for i in range(1, 10):
            if f"Class {i}" in dir_name or f"Class-{i}" in dir_name:
                class_num = i
                break
        if class_num is None:
            continue

        for pdf_file in sorted(class_dir.glob("*.pdf")):
            fname = pdf_file.stem  # e.g. "Class 1, Bangla_Book" or "Class-3, Science_Book"
            # Remove prefix like "Class 1, " or "Class-3, " or "Class_3, "
            subject_part = fname.split(",", 1)[-1].strip() if "," in fname else fname
            
            slug_suffix = None
            for key, val in SLUG_MAP.items():
                if key.lower() in subject_part.lower():
                    slug_suffix = val
                    break
            
            if slug_suffix is None:
                print(f"⚠️ Unknown subject mapping for: {fname}", flush=True)
                slug_suffix = subject_part.lower().replace(" ", "-").replace("_", "-")

            slug = f"class-{class_num}-{slug_suffix}"
            mappings.append({
                "class": class_num,
                "slug": slug,
                "pdf_path": str(pdf_file),
                "filename": pdf_file.name
            })
    return mappings

def render_and_upload_page(pdf_path, pno, class_num, slug, existing_keys):
    page_key = f"class-{class_num}/{slug}/page_{pno+1}.webp"
    if page_key in existing_keys:
        return True, pno+1, 0, True
    try:
        doc = pymupdf.open(pdf_path)
        page = doc[pno]
        pix = page.get_pixmap(dpi=130)
        img_bytes = pix.tobytes('png')
        doc.close()

        img = PIL.Image.open(io.BytesIO(img_bytes))
        webp_io = io.BytesIO()
        img.save(webp_io, format='WEBP', quality=75, method=4)
        webp_bytes = webp_io.getvalue()

        s3.put_object(
            Bucket=R2_BUCKET,
            Key=page_key,
            Body=webp_bytes,
            ContentType='image/webp',
            CacheControl='public, max-age=31536000, immutable'
        )
        return True, pno+1, len(webp_bytes), False
    except Exception as e:
        return False, pno+1, str(e), False

def main():
    print("🚀 Auto-discovering PDFs and resuming Cloudflare R2 Upload...", flush=True)
    
    mappings = discover_pdfs()
    print(f"📚 Discovered {len(mappings)} textbook PDFs.", flush=True)
    for m in mappings:
        print(f"  • Class {m['class']} [{m['slug']}]: {m['filename']}", flush=True)
    
    existing_keys = get_existing_keys()
    print(f"📊 Already uploaded: {len(existing_keys)} files. Skipping those.\n", flush=True)

    start_time = time.time()
    grand_pages = 0
    grand_new = 0
    grand_bytes = 0

    for item in mappings:
        pdf_path = item["pdf_path"]
        doc = pymupdf.open(pdf_path)
        total_pages = len(doc)
        doc.close()

        new_count = 0
        skip_count = 0
        book_bytes = 0

        for pno in range(total_pages):
            ok, pnum, res, skipped = render_and_upload_page(pdf_path, pno, item["class"], item["slug"], existing_keys)
            if skipped:
                skip_count += 1
            elif ok:
                new_count += 1
                book_bytes += res
            else:
                print(f"  ❌ Error page {pnum}: {res}", flush=True)

        grand_pages += total_pages
        grand_new += new_count
        grand_bytes += book_bytes
        status = "⏭️" if new_count == 0 else "✅"
        print(f"{status} Class {item['class']} [{item['slug']}]: {total_pages} pages ({new_count} new, {skip_count} skipped, {book_bytes/1024:.0f} KB)", flush=True)

    elapsed = time.time() - start_time
    print(f"\n🎉 UPLOAD COMPLETE!", flush=True)
    print(f"Total Pages: {grand_pages} | New Uploaded: {grand_new} | Storage Used: {grand_bytes/1024/1024:.2f} MB", flush=True)
    print(f"Time: {elapsed/60:.1f} minutes | CDN: {PUBLIC_CDN_BASE}", flush=True)

if __name__ == "__main__":
    main()
