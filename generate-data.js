const fs = require('fs');
const path = require('path');

const learningDir = path.join(__dirname, '..', 'learning');
const outputFilePath = path.join(__dirname, 'data.js');

function titleCase(str) {
  return str
    .split(/[_-]/)
    .map(word => {
      if (word.toLowerCase() === 'qa') return 'Q&A';
      if (word.toLowerCase() === 'and') return '&';
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function getTitleFromMarkdown(content, defaultTitle) {
  const match = content.match(/^#\s+(.+)$/m);
  if (match && match[1]) {
    return match[1].trim();
  }
  return defaultTitle;
}

function generateData() {
  if (!fs.existsSync(learningDir)) {
    console.error(`Error: learning directory does not exist at ${learningDir}`);
    process.exit(1);
  }

  const data = {
    categories: []
  };

  const items = fs.readdirSync(learningDir);

  // First process directories (which are categories)
  const categoryFolders = [];
  const rootFiles = [];

  items.forEach(item => {
    const fullPath = path.join(learningDir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      categoryFolders.push(item);
    } else if (stat.isFile() && (item.endsWith('.md') || item.endsWith('.txt'))) {
      rootFiles.push(item);
    }
  });

  // Sort categories to maintain a consistent order
  // e.g. 00_must_know_first, frontend, backend, database, project_explanation_and_qa
  const categoryOrder = ['00_must_know_first', 'frontend', 'backend', 'database', 'project_explanation_and_qa'];
  categoryFolders.sort((a, b) => {
    const idxA = categoryOrder.indexOf(a);
    const idxB = categoryOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  // Process category directories
  categoryFolders.forEach(folder => {
    const categoryPath = path.join(learningDir, folder);
    const files = fs.readdirSync(categoryPath);
    const chapters = [];

    // Filter and sort files (e.g. 01_foundations... md files)
    const mdFiles = files.filter(f => f.endsWith('.md') || f.endsWith('.txt'));
    mdFiles.sort();

    mdFiles.forEach(file => {
      const filePath = path.join(categoryPath, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      const fileBaseName = path.basename(file, path.extname(file));
      const fallbackTitle = titleCase(fileBaseName);
      const title = getTitleFromMarkdown(content, fallbackTitle);

      chapters.push({
        id: `${folder}-${fileBaseName}`,
        filename: file,
        title: title,
        content: content
      });
    });

    if (chapters.length > 0) {
      data.categories.push({
        id: folder,
        name: titleCase(folder),
        chapters: chapters
      });
    }
  });

  // Process files in the root folder under a "General" category
  if (rootFiles.length > 0) {
    const generalChapters = [];
    rootFiles.forEach(file => {
      const filePath = path.join(learningDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const fileBaseName = path.basename(file, path.extname(file));
      const fallbackTitle = titleCase(fileBaseName);
      const title = file.endsWith('.md') ? getTitleFromMarkdown(content, fallbackTitle) : fallbackTitle;

      generalChapters.push({
        id: `general-${fileBaseName}`,
        filename: file,
        title: title,
        content: content
      });
    });

    data.categories.push({
      id: 'general',
      name: 'General & Resources',
      chapters: generalChapters
    });
  }

  // Write variables to output file
  const jsContent = `// Auto-generated data file. Do not edit directly.\nwindow.learningData = ${JSON.stringify(data, null, 2)};\n`;
  fs.writeFileSync(outputFilePath, jsContent, 'utf-8');
  console.log(`Successfully generated data.js with ${data.categories.length} categories.`);
}

generateData();
