import os

OUTPUT_DIR = r"data/pdf_toc_pages"

def list_book_pages():
    folders = sorted(os.listdir(OUTPUT_DIR))
    for folder in folders:
        folder_path = os.path.join(OUTPUT_DIR, folder)
        if not os.path.isdir(folder_path): continue
        images = sorted(os.listdir(folder_path))
        print(f"\n{folder}:")
        for img in images:
            print(f"  {img}")

if __name__ == "__main__":
    list_book_pages()
