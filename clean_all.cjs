const fs = require('fs');

const fixDuplicates = (file) => {
  let content = fs.readFileSync(file, 'utf8');

  // Clean up TasksWidget and HabitsGoalsWidget
  content = content.replace(/dark:bg-\[\#111\]/g, 'dark:bg-black');
  content = content.replace(/dark:bg-\[\#EEE\]/g, 'dark:bg-white');
  content = content.replace(/dark:text-\[\#111\]/g, 'dark:text-black');
  content = content.replace(/dark:text-\[\#EEE\]/g, 'dark:text-white');
  content = content.replace(/dark:bg-\[\#222\]/g, 'dark:bg-neutral-800');
  content = content.replace(/dark:bg-\[\#1A1A1A\]/g, 'dark:bg-neutral-900');
  
  // Clean up any weird double-injections
  content = content.replace(/dark:hover:bg-white dark:bg-white\/5 dark:hover:bg-white dark:bg-black\/10/g, 'dark:hover:bg-white/10');
  content = content.replace(/hover:bg-black dark:hover:bg-white dark:bg-white hover:text-white dark:text-black/g, 'hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black');
  content = content.replace(/hover:text-black dark:hover:text-white dark:text-white/g, 'hover:text-black dark:hover:text-white');
  content = content.replace(/hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white dark:text-white/g, 'hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white');
  
  // bg-black dark:bg-white dark:bg-white -> bg-black dark:bg-white
  content = content.replace(/dark:bg-white dark:bg-white/g, 'dark:bg-white');
  content = content.replace(/dark:text-white dark:text-white/g, 'dark:text-white');
  content = content.replace(/dark:text-black dark:text-black/g, 'dark:text-black');
  content = content.replace(/dark:bg-black dark:bg-black/g, 'dark:bg-black');
  
  fs.writeFileSync(file, content);
  console.log(`Cleaned ${file}`);
};

['src/App.tsx', 'src/components/TasksWidget.tsx', 'src/components/HabitsGoalsWidget.tsx'].forEach(fixDuplicates);
