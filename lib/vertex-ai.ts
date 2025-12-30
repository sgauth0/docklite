import { VertexAI } from '@google-cloud/vertexai';

const projectId = process.env.GOOGLE_CLOUD_PROJECT;
const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

if (!projectId) {
  console.warn(
    'GOOGLE_CLOUD_PROJECT is not set. Vertex AI features will be disabled. ' +
    'Please set this in your .env.local file.'
  );
}

let vertexAI: VertexAI | null = null;

try {
  if (projectId) {
    vertexAI = new VertexAI({
      project: projectId,
      location: location,
    });
  }
} catch (error) {
  console.error('Failed to initialize Vertex AI:', error);
}

export function getVertexAI(): VertexAI {
  if (!vertexAI) {
    throw new Error(
      'Vertex AI is not initialized. Please ensure GOOGLE_CLOUD_PROJECT is set in your environment variables.'
    );
  }
  return vertexAI;
}

export async function generateText(prompt: string, options?: {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<string> {
  const vertex = getVertexAI();

  const model = options?.model || 'gemini-1.5-flash';
  const generativeModel = vertex.getGenerativeModel({
    model: model,
  });

  const request = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: options?.temperature ?? 0.7,
      maxOutputTokens: options?.maxOutputTokens ?? 2048,
    },
  };

  const response = await generativeModel.generateContent(request);
  const aggregatedResponse = await response.response;

  if (!aggregatedResponse.candidates || aggregatedResponse.candidates.length === 0) {
    throw new Error('No response generated from Vertex AI');
  }

  const candidate = aggregatedResponse.candidates[0];
  if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
    throw new Error('Invalid response structure from Vertex AI');
  }

  return candidate.content.parts[0].text || '';
}

export async function chat(
  messages: Array<{ role: 'user' | 'model'; content: string }>,
  options?: {
    model?: string;
    temperature?: number;
    maxOutputTokens?: number;
  }
): Promise<string> {
  const vertex = getVertexAI();

  const model = options?.model || 'gemini-1.5-flash';
  const generativeModel = vertex.getGenerativeModel({
    model: model,
  });

  const contents = messages.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.content }],
  }));

  const request = {
    contents: contents,
    generationConfig: {
      temperature: options?.temperature ?? 0.7,
      maxOutputTokens: options?.maxOutputTokens ?? 2048,
    },
  };

  const response = await generativeModel.generateContent(request);
  const aggregatedResponse = await response.response;

  if (!aggregatedResponse.candidates || aggregatedResponse.candidates.length === 0) {
    throw new Error('No response generated from Vertex AI');
  }

  const candidate = aggregatedResponse.candidates[0];
  if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
    throw new Error('Invalid response structure from Vertex AI');
  }

  return candidate.content.parts[0].text || '';
}

export function isVertexAIAvailable(): boolean {
  return vertexAI !== null;
}
