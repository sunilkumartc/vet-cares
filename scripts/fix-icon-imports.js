// Fix Icon Imports Script
// This script fixes incorrect icon imports where TenantUser was imported from lucide-react

import fs from 'fs';
import path from 'path';

function fixIconImports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let updated = false;
    let newContent = content;

    // Fix TenantUser imports from lucide-react to User
    const lucideImportRegex = /import\s*{([^}]+)}\s*from\s*["']lucide-react["'];?/g;
    newContent = newContent.replace(lucideImportRegex, (match, imports) => {
      const importList = imports.split(',').map(imp => imp.trim());
      const updatedImports = importList.map(imp => {
        if (imp === 'TenantUser') {
          return 'User';
        }
        if (imp.includes('TenantUser as')) {
          return imp.replace('TenantUser as', 'User as');
        }
        return imp;
      });
      return `import { ${updatedImports.join(', ')} } from "lucide-react";`;
    });

    // Also fix any usage of TenantUser icon in the component
    newContent = newContent.replace(/\bTenantUser\b/g, 'User');

    updated = newContent !== content;

    if (updated) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ Fixed icon imports: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

function walkDirectory(dir) {
  const files = fs.readdirSync(dir);
  let updatedCount = 0;

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      updatedCount += walkDirectory(filePath);
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      if (fixIconImports(filePath)) {
        updatedCount++;
      }
    }
  });

  return updatedCount;
}

async function main() {
  console.log('🔧 Fixing icon imports across the codebase...');
  
  const srcDir = path.join(process.cwd(), 'src');
  const updatedCount = walkDirectory(srcDir);
  
  console.log(`\n✅ Fixed ${updatedCount} files`);
  console.log('\n🎉 Icon import fix completed!');
}

main().catch(console.error); 