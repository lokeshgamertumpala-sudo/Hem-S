import os
import base64

# 1. Initialize the client using NVIDIA's API base URL with fallback env key
api_key = os.getenv("NVIDIA_API_KEY", os.getenv("OPENAI_API_KEY", "invalid"))

def run_paligemma_vision(image_path: str, prompt: str) -> str:
    try:
        from openai import OpenAI
    except ImportError:
        return "Error: 'openai' package is not installed. Run 'pip install openai' to test python client."

    if api_key == "invalid":
        return "Error: NVIDIA_API_KEY environment variable is not set."

    client = OpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=api_key
    )

    try:
        response = client.chat.completions.create(
            model="google/paligemma", # Ensure this matches the current NVIDIA catalog ID
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt}
                    ]
                }
            ],
            temperature=0.2, # Lower temperatures are better for precise visual answering
            max_tokens=512,
            stream=False
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"API Error: {str(e)}"

if __name__ == "__main__":
    print(run_paligemma_vision("dummy", "What configuration options are selected on this screen?"))

