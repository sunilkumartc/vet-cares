// Migration Script: Update Components to Use New Entities
// This script helps identify and update components that use Base44 entities

const fs = require('fs');
const path = require('path');

// Files to scan for entity usage
const SCAN_DIRECTORIES = [
  'src/components',
  'src/pages',
  'src/hooks'
];

// Entity mapping from old to new
const ENTITY_MAPPING = {
  'Client': 'TenantClient',
  'Pet': 'TenantPet', 
  'Appointment': 'TenantAppointment',
  'MedicalRecord': 'TenantMedicalRecord',
  'Vaccination': 'TenantVaccination',
  'Invoice': 'TenantInvoice',
  'Staff': 'TenantStaff',
  'Service': 'TenantService',
  'Memo': 'TenantMemo',
  'Product': 'TenantProduct',
  'ProductBatch': 'TenantProductBatch',
  'Sale': 'TenantSale',
  'MissedSale': 'TenantMissedSale',
  'StockMovement': 'TenantStockMovement',
  'Vaccine': 'TenantVaccine',
  'DiagnosticReport': 'TenantDiagnosticReport',
  'ReportTemplate': 'TenantReportTemplate'
};

// Import mapping
const IMPORT_MAPPING = {
  'from "@/api/entities"': 'from "@/api/tenantEntities"',
  'from "@/api/entities.js"': 'from "@/api/tenantEntities.js"'
};

function findFiles(dir, extensions = ['.jsx', '.js']) {
  const files = [];
  
  function scan(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scan(fullPath);
      } else if (extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }
  
  scan(dir);
  return files;
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];
  
  // Check for Base44 entity usage
  for (const [oldEntity, newEntity] of Object.entries(ENTITY_MAPPING)) {
    const entityRegex = new RegExp(`\\b${oldEntity}\\b`, 'g');
    const matches = content.match(entityRegex);
    
    if (matches) {
      issues.push({
        type: 'entity_usage',
        oldEntity,
        newEntity,
        count: matches.length,
        lines: findEntityLines(content, oldEntity)
      });
    }
  }
  
  // Check for old imports
  for (const [oldImport, newImport] of Object.entries(IMPORT_MAPPING)) {
    if (content.includes(oldImport)) {
      issues.push({
        type: 'import',
        oldImport,
        newImport
      });
    }
  }
  
  // Check for Base44 SDK usage
  if (content.includes('@base44/sdk') || content.includes('base44Client')) {
    issues.push({
      type: 'base44_sdk',
      message: 'Base44 SDK usage detected'
    });
  }
  
  return issues.length > 0 ? { filePath, issues } : null;
}

function findEntityLines(content, entityName) {
  const lines = content.split('\n');
  const entityLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(entityName)) {
      entityLines.push({
        line: i + 1,
        content: lines[i].trim()
      });
    }
  }
  
  return entityLines;
}

function generateMigrationReport(issues) {
  console.log('\n=== Migration Report ===\n');
  
  if (issues.length === 0) {
    console.log('✅ No migration issues found!');
    return;
  }
  
  console.log(`Found ${issues.length} files that need migration:\n`);
  
  for (const issue of issues) {
    console.log(`📁 ${issue.filePath}`);
    
    for (const problem of issue.issues) {
      switch (problem.type) {
        case 'entity_usage':
          console.log(`  🔄 Entity Usage: ${problem.oldEntity} → ${problem.newEntity} (${problem.count} occurrences)`);
          problem.lines.forEach(line => {
            console.log(`     Line ${line.line}: ${line.content}`);
          });
          break;
          
        case 'import':
          console.log(`  📦 Import: ${problem.oldImport} → ${problem.newImport}`);
          break;
          
        case 'base44_sdk':
          console.log(`  ⚠️  ${problem.message}`);
          break;
      }
    }
    console.log('');
  }
  
  console.log('\n=== Migration Steps ===');
  console.log('1. Update imports in affected files');
  console.log('2. Replace entity usage with tenant-aware versions');
  console.log('3. Test functionality after migration');
  console.log('4. Remove Base44 SDK dependency');
}

function generateMigrationScript(issues) {
  const script = [];
  
  script.push('// Auto-generated migration script');
  script.push('// Run this to update entity usage');
  script.push('');
  
  for (const issue of issues) {
    script.push(`// File: ${issue.filePath}`);
    
    for (const problem of issue.issues) {
      if (problem.type === 'entity_usage') {
        script.push(`// Replace: ${problem.oldEntity} → ${problem.newEntity}`);
        script.push(`// Lines: ${problem.lines.map(l => l.line).join(', ')}`);
      } else if (problem.type === 'import') {
        script.push(`// Update import: ${problem.oldImport} → ${problem.newImport}`);
      }
    }
    script.push('');
  }
  
  return script.join('\n');
}

function main() {
  console.log('🔍 Scanning for Base44 entity usage...\n');
  
  const allIssues = [];
  
  for (const dir of SCAN_DIRECTORIES) {
    if (fs.existsSync(dir)) {
      const files = findFiles(dir);
      console.log(`📂 Scanning ${dir}: ${files.length} files`);
      
      for (const file of files) {
        const issues = analyzeFile(file);
        if (issues) {
          allIssues.push(issues);
        }
      }
    } else {
      console.log(`⚠️  Directory not found: ${dir}`);
    }
  }
  
  // Generate report
  generateMigrationReport(allIssues);
  
  // Generate migration script
  if (allIssues.length > 0) {
    const migrationScript = generateMigrationScript(allIssues);
    fs.writeFileSync('migration-script.js', migrationScript);
    console.log('\n📝 Migration script saved to: migration-script.js');
  }
  
  // Summary
  console.log('\n=== Summary ===');
  console.log(`Files scanned: ${SCAN_DIRECTORIES.reduce((acc, dir) => {
    return acc + (fs.existsSync(dir) ? findFiles(dir).length : 0);
  }, 0)}`);
  console.log(`Files needing migration: ${allIssues.length}`);
  
  if (allIssues.length > 0) {
    console.log('\n🚀 Next steps:');
    console.log('1. Review the migration report above');
    console.log('2. Update imports and entity usage');
    console.log('3. Test the application');
    console.log('4. Remove @base44/sdk from package.json');
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { analyzeFile, findFiles, generateMigrationReport }; 