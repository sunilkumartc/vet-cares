// Update Entity Imports Script
// This script updates all imports from @/api/entities to @/api/tenant-entities

import fs from 'fs';
import path from 'path';

// Mapping of old entity names to new tenant-aware entity names
const entityMapping = {
  'User': 'TenantUser',
  'Client': 'TenantClient',
  'Pet': 'TenantPet',
  'Appointment': 'TenantAppointment',
  'MedicalRecord': 'TenantMedicalRecord',
  'Vaccination': 'TenantVaccination',
  'Invoice': 'TenantInvoice',
  'Product': 'TenantProduct',
  'ProductBatch': 'TenantProductBatch',
  'StockMovement': 'TenantStockMovement',
  'Sale': 'TenantSale',
  'Vaccine': 'TenantVaccine',
  'Memo': 'TenantMemo',
  'DiagnosticReport': 'TenantDiagnosticReport',
  'ReportTemplate': 'TenantReportTemplate'
};

function updateFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let updated = false;
    let newContent = content;

    // Check if file imports from @/api/entities
    if (content.includes('from "@/api/entities"')) {
      console.log(`📝 Updating: ${filePath}`);
      
      // Replace the import statement
      const importRegex = /import\s*{([^}]+)}\s*from\s*["']@\/api\/entities["'];?/g;
      newContent = newContent.replace(importRegex, (match, entities) => {
        const entityList = entities.split(',').map(e => e.trim());
        const updatedEntities = entityList.map(entity => {
          const cleanEntity = entity.trim();
          return entityMapping[cleanEntity] || cleanEntity;
        });
        return `import { ${updatedEntities.join(', ')} } from "@/api/tenant-entities";`;
      });
      
      updated = newContent !== content;
    }

    // Also check for individual entity usage and update them
    Object.entries(entityMapping).forEach(([oldEntity, newEntity]) => {
      const entityRegex = new RegExp(`\\b${oldEntity}\\b`, 'g');
      if (entityRegex.test(newContent)) {
        newContent = newContent.replace(entityRegex, newEntity);
        updated = true;
      }
    });

    if (updated) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
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
      if (updateFile(filePath)) {
        updatedCount++;
      }
    }
  });

  return updatedCount;
}

async function main() {
  console.log('🔧 Updating entity imports across the codebase...');
  
  const srcDir = path.join(process.cwd(), 'src');
  const updatedCount = walkDirectory(srcDir);
  
  console.log(`\n✅ Updated ${updatedCount} files`);
  console.log('\n📋 Entity mapping:');
  Object.entries(entityMapping).forEach(([old, new_]) => {
    console.log(`   ${old} → ${new_}`);
  });
  
  console.log('\n🎉 Entity import update completed!');
}

main().catch(console.error); 