const fs = require('fs');

async function checkModel(modelId, apiKey) {
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
    return res.status;
  } catch (e) {
    return 500;
  }
}

async function run() {
  // Let's use a public/demo key if possible, or we need the user's key? 
  // Wait, I don't have the user's API key. 
  console.log("We cannot actually ping without the API key, unless there's a local .env");
}
run();
