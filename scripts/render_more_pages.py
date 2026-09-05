import os
import pymupdf

ROOT_DIR = r"C:\Users\user\Downloads\All class book PDF"
OUTPUT_DIR = r"data/pdf_toc_pages"

def render_pages(pdf_path, class_name, book_name):
    doc = pymupdf.open(pdf_path)
    safe_folder = f"{class_name}_{book_name}".replace(" ", "_").replace(",", "").replace("(", "").replace(")", "")
    target_dir = os.path.join(OUTPUT_DIR, safe_folder)
    os.makedirs(target_dir, exist_ok=True)
    
    # Save pages 1 to 14
    num_to_render = min(15, len(doc))
    for i in range(num_to_render):
        out_png = os.path.join(target_dir, f"page_{i+1}.png")
        if not os.path.exists(out_png):
            page = doc[i]
            pix = page.get_pixmap(dpi=150)
            pix.save(out_png)
    doc.close()

def main():
    for root, dirs, files in os.walk(ROOT_DIR):
        for file in sorted(files):
            if file.lower().endswith(".pdf"):
                full_path = os.path.join(root, file)
                rel_folder = os.path.basename(root)
                render_pages(full_path, rel_folder, file.replace(".pdf", ""))

    print("Rendered pages 1-15 for all 27 books!")

if __name__ == "__main__":
    main()
