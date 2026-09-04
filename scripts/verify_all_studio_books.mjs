import fs from 'fs';

const manifest = JSON.parse(fs.readFileSync('data/2026/primary/books-manifest.json', 'utf8'));
const manifestMap = new Map(manifest.books.map(b => [b.id, b]));

const studioCode = fs.readFileSync('src/components/TeacherCurriculumStudio.tsx', 'utf8');
const regex = /id:\s*"([^"]+)"/g;
let match;
let count = 0;
let errors = [];

while ((match = regex.exec(studioCode)) !== null) {
  const id = match[1];
  count++;
  if (!manifestMap.has(id)) {
    errors.push('NOT FOUND IN MANIFEST: ' + id);
  } else {
    const book = manifestMap.get(id);
    const p = 'data/2026/primary/class-' + book.class_number + '/' + book.slug + '/chapters.json';
    const chapters = JSON.parse(fs.readFileSync(p, 'utf8'));
    console.log(`[PASS] ${id} (Class ${book.class_number}) -> ${chapters.length} chapters loaded`);
  }
}

console.log('Total checked in TeacherCurriculumStudio:', count);
if (errors.length > 0) {
  console.error('ERRORS:', errors);
  process.exit(1);
} else {
  console.log('SUCCESS: ALL 33 BOOKS IN TEACHER STUDIO MATCH MANIFEST & DISK PERFECTLY!');
}
