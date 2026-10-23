const fs = require('fs');

const schemaPath = 'D:/proyectos/facturas/prisma/schema.prisma';
const insertPath = 'D:/proyectos/facturas/insert_saas_models.txt';

const content = fs.readFileSync(schemaPath, 'utf8');
const insert = fs.readFileSync(insertPath, 'utf8');

// Find the position right before "enum SchoolRole"
const marker = 'enum SchoolRole';
const idx = content.lastIndexOf(marker);

if (idx === -1) {
    console.error('Marker not found:', marker);
    process.exit(1);
}

// Find the start of the line containing the marker
const lineStart = content.lastIndexOf('\n', idx - 1) + 1;

// Insert before that line
const newContent = content.slice(0, lineStart) + insert + '\n\n' + content.slice(lineStart);

fs.writeFileSync(schemaPath, newContent, 'utf8');
console.log('Done: inserted at position', lineStart);