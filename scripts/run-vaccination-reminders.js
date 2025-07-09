#!/usr/bin/env node

import { runVaccinationReminders } from '../src/jobs/sendVaccinationReminders.js';

console.log('🐾 Starting Vaccination Reminders Job...');
console.log('⏰ Time:', new Date().toISOString());

runVaccinationReminders()
  .then(() => {
    console.log('✅ Vaccination reminders job completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Vaccination reminders job failed:', error);
    process.exit(1);
  }); 