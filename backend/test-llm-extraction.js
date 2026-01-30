// Test LLM extraction
import { extractFacts, processMessage } from './src/memory.js';
import dotenv from 'dotenv';

dotenv.config();

async function test() {
  console.log('🧪 Testing LLM Extraction\n');
  
  const testMessages = [
    "My name is Alaa and I prefer TypeScript",
    "my job is?",
    "I work as a software developer",
    "Based in Berlin",
    "what?",
    "I'm passionate about AI and machine learning",
  ];
  
  for (const message of testMessages) {
    console.log(`\n📝 Message: "${message}"`);
    console.log('─'.repeat(50));
    
    try {
      const result = await processMessage({
        userId: 'test@example.com',
        message,
        autoExtract: true
      });
      
      console.log(`✓ Extracted ${result.extracted} memories\n`);
    } catch (err) {
      console.error(`✗ Error: ${err.message}\n`);
    }
  }
}

test();
