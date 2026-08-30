const models = [
  'z-ai/glm-5.2',
  'openai/gpt-oss-120b',
  '01-ai/yi-large',
  'nvidia/nemotron-4-340b-instruct',
  'nvidia/nemotron-3-ultra-550b-a55b',
  'mistralai/mistral-large-2-instruct',
  'nvidia/llama-3.1-nemotron-70b-instruct',
  'nvidia/llama-3.1-nemotron-ultra-253b-v1',
  'mistralai/mixtral-8x22b-v0.1',
  'ai21labs/jamba-1.5-large-instruct',
  'databricks/dbrx-instruct',
  'writer/palmyra-creative-122b',
  'meta/muse-glimmer-30b',
  'deepseek-ai/deepseek-v4-flash-0731',
  'deepseek-ai/deepseek-v4-pro-0813',
  'poolside/laguna-xs-2.1',
  'mistralai/codestral-22b-instruct-v0.1',
  'google/codegemma-7b',
  'google/codegemma-1.1-7b',
  'meta/codellama-70b',
  'ibm/granite-34b-code-instruct',
  'ibm/granite-8b-code-instruct',
  'bigcode/starcoder2-15b',
  'deepseek-ai/deepseek-coder-6.7b-instruct',
  'nvidia/cosmos-reason2-8b',
  'meta/llama-3.2-11b-vision-instruct',
  'meta/llama-3.2-90b-vision-instruct',
  'microsoft/phi-3-vision-128k-instruct',
  'minimaxai/minimax-m3',
  'google/deplot',
  'adept/fuyu-8b',
  'microsoft/kosmos-2',
  'nvidia/neva-22b',
  'nvidia/vila',
  'moonshotai/kimi-k2.6',
  'moonshotai/kimi-k3',
  'google/gemma-4-31b-it',
  'google/gemma-3-12b-it',
  'google/gemma-3-4b-it',
  'google/diffusiongemma-26b-a4b-it',
  'microsoft/phi-3.5-moe-instruct',
  'nvidia/mistral-nemo-minitron-8b-8k-instruct',
  'nvidia/llama-3.1-nemotron-51b-instruct',
  'ibm/granite-3.0-8b-instruct',
  'ibm/granite-3.0-3b-a800m-instruct',
  'nv-mistralai/mistral-nemo-12b-instruct',
  'mistralai/mistral-7b-instruct-v0.3',
  'meta/llama2-70b',
  'aisingapore/sea-lion-7b-instruct',
  'zyphra/zamba2-7b-instruct',
  'writer/palmyra-med-70b'
];

async function testAll() {
  let passed = 0;
  let failed = 0;
  for (let i = 0; i < models.length; i++) {
    const id = models[i];
    try {
      const res = await fetch('http://localhost:3000/api/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'ping test',
          apiKeys: [],
          models: [{ id, name: id, role: 'Tester', swarmRoleIndex: 0 }],
          isSwamp: false,
          isVibe: false,
          history: []
        })
      });
      const text = await res.text();
      if (res.ok && text.includes('data: ') && !text.includes('HTTP 410') && !text.includes('404 page not found')) {
        passed++;
        process.write ? process.stdout.write('.') : console.log('[OAK] ' + id);
      } else {
        failed++;
        console.log('\n[FAIL] ' + id + ': ' + text.slice(0, 100));
      }
    } catch (e) {
      failed++;
      console.log('\n[ERROR] ' + id + ': ' + e.message);
    }
  }
  console.log('\nFINAL RESULT: ' + passed + '/' + models.length + ' passed, ' + failed + ' failed.');
}

testAll();