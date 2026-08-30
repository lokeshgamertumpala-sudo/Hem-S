/**
 * Stream Decoder Utility
 * Prevents duplicate token bugs (e.g. "might might have have") by strictly
 * splitting chunks by double newlines (\n\n) and buffering cleanly.
 */
export class SSEDecoder {
  private buffer = '';

  public decode(chunk: string, onToken: (token: string) => void) {
    this.buffer += chunk;
    
    const parts = this.buffer.split('\n\n');
    // The last part might be incomplete, so we keep it in the buffer
    this.buffer = parts.pop() || '';

    for (const part of parts) {
      const line = part.trim();
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;
        
        try {
          const parsed = JSON.parse(data);
          // Assuming a standard format where parsed.choices[0].delta.content has the token
          const content = parsed.choices?.[0]?.delta?.content || parsed.delta?.content;
          if (content) {
            onToken(content);
          }
        } catch (e) {
          console.warn('Failed to parse SSE JSON frame', e, data);
          // Strip out raw duplicated JSON frames - handled by skipping on error
        }
      }
    }
  }
}
