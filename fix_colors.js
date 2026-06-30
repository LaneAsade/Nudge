const fs = require('fs');

const replaceInFile = (file) => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace patterns in classNames
  // Note: this is a bit crude but works for standard cases.
  // We want to add dark mode equivalents if they don't exist.
  
  // 1. bg-white -> bg-white dark:bg-black 
  // (unless it already has dark:bg-black)
  content = content.replace(/bg-white(?!\s*dark:bg-black)/g, 'bg-white dark:bg-[#111]');
  content = content.replace(/bg-white\s+dark:bg-\[\#111\]/g, 'bg-white dark:bg-[#111]'); // dedup if any
  
  // 2. bg-black -> bg-black dark:bg-white
  content = content.replace(/bg-black(?!\s*dark:bg-white)/g, 'bg-black dark:bg-white');
  
  // 3. text-black -> text-black dark:text-white
  content = content.replace(/text-black(?!\s*dark:text-white)/g, 'text-black dark:text-white');
  
  // 4. text-white -> text-white dark:text-black
  content = content.replace(/text-white(?!\s*dark:text-black)/g, 'text-white dark:text-black');
  
  // 5. hover:border-black -> hover:border-black dark:hover:border-white
  content = content.replace(/hover:border-black(?!\s*dark:hover:border-white)/g, 'hover:border-black dark:hover:border-white');

  // 6. hover:text-black -> hover:text-black dark:hover:text-white
  content = content.replace(/hover:text-black(?!\s*dark:hover:text-white)/g, 'hover:text-black dark:hover:text-white');
  
  // 7. hover:bg-black -> hover:bg-black dark:hover:bg-white
  content = content.replace(/hover:bg-black(?!\s*dark:hover:bg-white)/g, 'hover:bg-black dark:hover:bg-white');

  // 8. bg-[#F2F2F2] -> bg-[#F2F2F2] dark:bg-[#222]
  content = content.replace(/bg-\[\#F2F2F2\]/g, 'bg-[#F2F2F2] dark:bg-[#222]');
  
  // 9. bg-[#F9F9F9] -> bg-[#F9F9F9] dark:bg-[#1A1A1A]
  content = content.replace(/bg-\[\#F9F9F9\]/g, 'bg-[#F9F9F9] dark:bg-[#1A1A1A]');

  fs.writeFileSync(file, content);
  console.log(`Updated ${file}`);
};

['src/App.tsx', 'src/components/TasksWidget.tsx', 'src/components/HabitsGoalsWidget.tsx'].forEach(replaceInFile);
