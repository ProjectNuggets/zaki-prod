// Create test memories for alaasuccar@gmail.com
import { storeMemory } from './src/memory.js';

const userId = 'alaasuccar@gmail.com';

async function createTestMemories() {
  console.log('🧠 Creating test memories...\n');
  
  const memories = [
    { content: 'My name is Alaa Succar', type: 'fact' },
    { content: 'I prefer dark mode for development', type: 'preference' },
    { content: 'Working on ZAKI, an AI memory system', type: 'context' },
    { content: 'I like TypeScript and React for frontend', type: 'preference' },
    { content: 'Based in Berlin, Germany', type: 'fact' },
  ];
  
  for (const memory of memories) {
    try {
      const result = await storeMemory({ userId, ...memory });
      console.log(`✅ Created: [${memory.type}] "${memory.content.slice(0, 50)}..."`);
    } catch (err) {
      console.log(`❌ Failed: ${err.message}`);
    }
  }
  
  console.log('\n🎉 Test memories created!');
  console.log('Now open Settings → Memory Bank to see them');
}

createTestMemories();
