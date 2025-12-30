import { NextResponse } from 'next/server';
import { generateText, isVertexAIAvailable } from '@/lib/vertex-ai';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Check if Vertex AI is configured
    if (!isVertexAIAvailable()) {
      return NextResponse.json({
        error: 'Vertex AI is not configured',
        message: 'Please set GOOGLE_CLOUD_PROJECT and optionally GOOGLE_APPLICATION_CREDENTIALS in your .env.local file',
        setup_guide: 'See VERTEX_AI_SETUP.md for detailed setup instructions'
      }, { status: 503 });
    }

    // Test with a simple prompt
    const testPrompt = 'Say "Hello from Vertex AI!" and confirm you are working correctly.';

    const response = await generateText(testPrompt, {
      model: 'gemini-1.5-flash',
      temperature: 0.7,
      maxOutputTokens: 100,
    });

    return NextResponse.json({
      success: true,
      message: 'Vertex AI is working correctly!',
      test_response: response,
      config: {
        project: process.env.GOOGLE_CLOUD_PROJECT,
        location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
        using_service_account: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
      }
    });

  } catch (error: any) {
    console.error('Vertex AI test error:', error);

    return NextResponse.json({
      error: 'Vertex AI test failed',
      message: error.message,
      details: error.toString(),
      troubleshooting: {
        steps: [
          'Verify GOOGLE_CLOUD_PROJECT is set in .env.local',
          'Ensure Vertex AI API is enabled: gcloud services enable aiplatform.googleapis.com',
          'Check service account has correct permissions (roles/aiplatform.user)',
          'Verify credentials file exists at GOOGLE_APPLICATION_CREDENTIALS path',
          'Try running: gcloud auth application-default login'
        ]
      }
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!isVertexAIAvailable()) {
      return NextResponse.json({
        error: 'Vertex AI is not configured',
      }, { status: 503 });
    }

    const body = await request.json();
    const { prompt, model, temperature, maxOutputTokens } = body;

    if (!prompt) {
      return NextResponse.json({
        error: 'Missing prompt in request body'
      }, { status: 400 });
    }

    const response = await generateText(prompt, {
      model: model || 'gemini-1.5-flash',
      temperature: temperature ?? 0.7,
      maxOutputTokens: maxOutputTokens ?? 2048,
    });

    return NextResponse.json({
      success: true,
      response: response,
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}
