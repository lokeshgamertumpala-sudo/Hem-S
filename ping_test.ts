// Uses native fetch in Node.js 18+ environment

async function checkModel(modelId: string) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    console.log("No API key");
    return;
  }
  
  try {
    const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{"role": "user", "content": "hi"}],
        max_tokens: 5
      })
    });
    console.log(`${modelId} => ${res.status}`);
  } catch (e) {
    console.log(`${modelId} => ERROR`);
  }
}

async function run() {
  const modelsToTest = [
    "ibm/granite-3.0-8b-instruct",
    "meta/llama-3.1-8b-instruct",
    "meta/llama-3.1-70b-instruct",
    "meta/llama-3.2-1b-instruct",
    "meta/llama-3.2-3b-instruct",
    "google/gemma-3-4b-it",
    "databricks/dbrx-instruct",
    "ai21labs/jamba-1.5-large-instruct",
    "01-ai/yi-large",
    "meta/llama2-70b",
    "ibm/granite-3.0-3b-a800m-instruct"
  ];
  for(const m of modelsToTest) {
    await checkModel(m);
  }
}
run();
