import { GoogleGenAI, Modality, GenerateContentResponse, Type } from "@google/genai";
import { AspectRatio } from '../types';

const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const fileToGenerativePart = async (file: File) => {
  const base64EncodedData = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: {
      data: base64EncodedData,
      mimeType: file.type,
    },
  };
};

export const analyzeImage = async (prompt: string, image: File): Promise<string> => {
  const ai = getAiClient();
  const imagePart = await fileToGenerativePart(image);
  const textPart = { text: prompt };

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [textPart, imagePart] },
  });

  return response.text;
};

export const editImage = async (prompt: string, images: File[]): Promise<string> => {
    const ai = getAiClient();
    const imageParts = await Promise.all(images.map(fileToGenerativePart));
    const textPart = { text: prompt };

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [textPart, ...imageParts] },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });
    
    // Fix: Per Gemini guidelines, iterate through parts to find the generated image data,
    // making the extraction more reliable.
    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }
    throw new Error('No image was generated.');
};

export const generateImage = async (prompt: string, aspectRatio: AspectRatio): Promise<string> => {
  const ai = getAiClient();
  const response = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt: prompt,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/png',
      aspectRatio,
    },
  });

  if (response.generatedImages && response.generatedImages.length > 0) {
    return response.generatedImages[0].image.imageBytes;
  }
  throw new Error('No image was generated.');
};

export const generateVideo = async (
  prompt: string,
  image: File,
  aspectRatio: '16:9' | '9:16',
  onProgress: (message: string) => void
): Promise<string> => {
  const ai = getAiClient();
  const imagePart = await fileToGenerativePart(image);

  onProgress('Starting video generation...');
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt,
    image: imagePart.inlineData,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: aspectRatio
    }
  });

  onProgress('Video generation in progress... this can take a few minutes. Checking status...');
  let checks = 0;
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000)); 
    checks++;
    const progressMessages = [
        'Warming up the digital director...',
        'Choreographing pixels into motion...',
        'Rendering scene, one frame at a time...',
        'Finalizing the cinematic experience...',
        'Almost there, adding the final touches...'
    ];
    onProgress(progressMessages[checks % progressMessages.length]);
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  onProgress('Finalizing video...');
  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) {
    throw new Error('Video generation failed or returned no URI.');
  }

  onProgress('Downloading video...');
  const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.statusText}`);
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
};
