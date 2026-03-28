// AI Provider 추상화 레이어
// 여러 AI Provider를 통합 인터페이스로 관리

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: string;
}

export interface AIProviderConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

// OpenAI Provider
export async function callOpenAI(
  messages: AIMessage[],
  config: AIProviderConfig
): Promise<AIResponse> {
  const model = config.model || 'gpt-4o-mini';
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  
  return {
    content: data.choices[0].message.content,
    usage: {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    },
    model,
    provider: 'openai',
  };
}

// Anthropic Provider
export async function callAnthropic(
  messages: AIMessage[],
  config: AIProviderConfig
): Promise<AIResponse> {
  const model = config.model || 'claude-3-haiku-20240307';
  
  // System 메시지 분리
  const systemMessage = messages.find(m => m.role === 'system');
  const otherMessages = messages.filter(m => m.role !== 'system');
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      system: systemMessage?.content,
      messages: otherMessages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${error}`);
  }

  const data = await response.json();
  
  return {
    content: data.content[0].text,
    usage: {
      promptTokens: data.usage.input_tokens,
      completionTokens: data.usage.output_tokens,
      totalTokens: data.usage.input_tokens + data.usage.output_tokens,
    },
    model,
    provider: 'anthropic',
  };
}

// Groq Provider (빠른 추론)
export async function callGroq(
  messages: AIMessage[],
  config: AIProviderConfig
): Promise<AIResponse> {
  const model = config.model || 'llama-3.1-70b-versatile';
  
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${error}`);
  }

  const data = await response.json();
  
  return {
    content: data.choices[0].message.content,
    usage: {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    },
    model,
    provider: 'groq',
  };
}

// 통합 AI 호출 함수
export async function callAI(
  messages: AIMessage[],
  provider: 'openai' | 'anthropic' | 'groq',
  config: AIProviderConfig
): Promise<AIResponse> {
  switch (provider) {
    case 'openai':
      return callOpenAI(messages, config);
    case 'anthropic':
      return callAnthropic(messages, config);
    case 'groq':
      return callGroq(messages, config);
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}
