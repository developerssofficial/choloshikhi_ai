import os
import sys
import json
import pymupdf

ROOT_DIR = r"C:\Users\user\Downloads\All class book PDF"
OUTPUT_FILE = r"data/extracted_pdf_catalog.json"

def analyze_pdf(pdf_path):
    doc = pymupdf.open(pdf_path)
    toc = doc.get_toc() # [[lvl, title, page], ...]
    page_count = len(doc)
    
    # Extract text from first 15 pages
    front_pages = []
    for i in range(min(15, page_count)):
        page = doc[i]
        txt = page.get_text("text").strip()
        if txt:
            front_pages.append({
                "page": i + 1,
                "text": txt
            })
            
    doc.close()
    return {
        "page_count": page_count,
        "toc_bookmarks": toc,
        "front_pages": front_pages
    }

def main():
    catalog = {}
    
    for root, dirs, files in os.walk(ROOT_DIR):
        for file in sorted(files):
            if file.lower().endswith(".pdf"):
                full_path = os.path.join(root, file)
                rel_folder = os.path.basename(root)
                key = f"{rel_folder} / {file}"
                print(f"Processing: {key.encode('ascii', 'replace').decode()}")
                try:
                    data = analyze_pdf(full_path)
                    data["file_name"] = file
                    data["folder"] = rel_folder
                    data["full_path"] = full_path
                    catalog[key] = data
                except Exception as e:
                    print(f"  Error: {e}")

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)
        
    print(f"\nDone! Extracted metadata and TOC for {len(catalog)} books to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
