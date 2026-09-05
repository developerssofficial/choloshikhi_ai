import os
import pymupdf

ROOT_DIR = r"C:\Users\user\Downloads\All class book PDF"
OUTPUT_DIR = r"data/pdf_toc_pages"

os.makedirs(OUTPUT_DIR, exist_ok=True)

def render_pages(pdf_path, class_name, book_name):
    doc = pymupdf.open(pdf_path)
    # create subfolder
    safe_folder = f"{class_name}_{book_name}".replace(" ", "_").replace(",", "").replace("(", "").replace(")", "")
    target_dir = os.path.join(OUTPUT_DIR, safe_folder)
    os.makedirs(target_dir, exist_ok=True)
    
    # Save pages 2, 3, 4, 5, 6, 7 (typical TOC pages in NCTB)
    num_to_render = min(8, len(doc))
    for i in range(1, num_to_render):
        page = doc[i]
        pix = page.get_pixmap(dpi=150)
        out_png = os.path.join(target_dir, f"page_{i+1}.png")
        pix.save(out_png)
    doc.close()
    print(f"Rendered {num_to_render-1} pages for {safe_folder}".encode("ascii", "replace").decode())

def main():
    for root, dirs, files in os.walk(ROOT_DIR):
        for file in sorted(files):
            if file.lower().endswith(".pdf"):
                full_path = os.path.join(root, file)
                rel_folder = os.path.basename(root)
                render_pages(full_path, rel_folder, file.replace(".pdf", ""))

if __name__ == "__main__":
    main()
