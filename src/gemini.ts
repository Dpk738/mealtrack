import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Meal, WaterLog } from './db';

// Helper to convert base64 image string to generative inline data structure
function base64ToGenerativePart(base64DataUri: string) {
  const matches = base64DataUri.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid image format. Expected data URI.');
  }
  return {
    inlineData: {
      data: matches[2],
      mimeType: matches[1]
    },
  };
}

export interface DetectedNutrition {
  name: string;
  servingSize: string;
  servingQuantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
}

export async function analyzeFoodImage(
  base64Image: string,
  apiKey: string,
  modelName: string = 'gemini-1.5-flash'
): Promise<DetectedNutrition> {
  if (!apiKey) {
    throw new Error('Gemini API key is required. Please set it in Settings.');
  }

  // Try proxy first to bypass EU/EEA region locks on the free tier
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image,
        apiKey,
        modelName,
        type: 'vision',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const parsed = JSON.parse(data.text);
      return {
        name: parsed.name || 'Detected Meal',
        servingSize: parsed.servingSize || '1 portion',
        servingQuantity: Number(parsed.servingQuantity) || 1,
        calories: Math.max(0, Math.round(Number(parsed.calories) || 0)),
        protein: Math.max(0, Math.round((Number(parsed.protein) || 0) * 10) / 10),
        carbs: Math.max(0, Math.round((Number(parsed.carbs) || 0) * 10) / 10),
        fat: Math.max(0, Math.round((Number(parsed.fat) || 0) * 10) / 10),
        fiber: Math.max(0, Math.round((Number(parsed.fiber) || 0) * 10) / 10),
        sugar: Math.max(0, Math.round((Number(parsed.sugar) || 0) * 10) / 10),
      };
    } else {
      console.warn('Vercel proxy analysis failed, trying direct browser fallback...');
    }
  } catch (e) {
    console.warn('Vercel proxy unreachable, using direct browser-to-Gemini connection:', e);
  }

  // Direct client-side SDK Fallback
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: 'application/json'
    }
  });

  const prompt = `
Analyze the food visible in this image. Estimate the nutrition details for all items combined.
Return a JSON object in this exact format:
{
  "name": "Name of the food / meal",
  "servingSize": "Typical unit (e.g., plate, bowl, piece, 250g)",
  "servingQuantity": 1,
  "calories": 250,
  "protein": 12,
  "carbs": 30,
  "fat": 8,
  "fiber": 3,
  "sugar": 5
}
Notes:
- Provide estimates for the food shown.
- All macronutrients (protein, carbs, fat, fiber, sugar) should be numbers representing grams (g).
- Calories should be a number representing kcal.
- Be as accurate as possible for the identified food items.
`;

  try {
    const imagePart = base64ToGenerativePart(base64Image);
    const result = await model.generateContent([prompt, imagePart]);
    const text = result.response.text();
    
    if (!text) {
      throw new Error('Empty response received from Gemini.');
    }

    const parsed = JSON.parse(text);
    return {
      name: parsed.name || 'Detected Meal',
      servingSize: parsed.servingSize || '1 portion',
      servingQuantity: Number(parsed.servingQuantity) || 1,
      calories: Math.max(0, Math.round(Number(parsed.calories) || 0)),
      protein: Math.max(0, Math.round((Number(parsed.protein) || 0) * 10) / 10),
      carbs: Math.max(0, Math.round((Number(parsed.carbs) || 0) * 10) / 10),
      fat: Math.max(0, Math.round((Number(parsed.fat) || 0) * 10) / 10),
      fiber: Math.max(0, Math.round((Number(parsed.fiber) || 0) * 10) / 10),
      sugar: Math.max(0, Math.round((Number(parsed.sugar) || 0) * 10) / 10),
    };
  } catch (e) {
    console.error('Gemini Vision analysis failed:', e);
    throw e;
  }
}

export async function generateDailySummary(
  meals: Meal[],
  waterLogs: WaterLog[],
  goals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    water: number;
  },
  apiKey: string,
  modelName: string = 'gemini-1.5-flash'
): Promise<string> {
  if (!apiKey) {
    return 'Please enter your Gemini API Key in Settings to generate AI insights.';
  }

  const totalCalories = meals.reduce((sum, m) => sum + (m.calories * (m.servingQuantity || 1)), 0);
  const totalWater = waterLogs.reduce((sum, w) => sum + w.amount, 0);

  // Try proxy first to bypass EU/EEA region locks on the free tier
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey,
        modelName,
        type: 'summary',
        meals,
        waterLogs,
        goals,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.text ? data.text.trim() : 'Unable to generate summary.';
    } else {
      console.warn('Vercel proxy summary failed, trying direct browser fallback...');
    }
  } catch (e) {
    console.warn('Vercel proxy unreachable, using direct browser-to-Gemini connection:', e);
  }

  // Direct client-side SDK Fallback
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const totalProtein = meals.reduce((sum, m) => sum + (m.protein * (m.servingQuantity || 1)), 0);
  const totalCarbs = meals.reduce((sum, m) => sum + (m.carbs * (m.servingQuantity || 1)), 0);
  const totalFat = meals.reduce((sum, m) => sum + (m.fat * (m.servingQuantity || 1)), 0);
  const mealSummaries = meals.map(m => `- ${m.name}: ${m.calories} kcal, P: ${m.protein}g, C: ${m.carbs}g, F: ${m.fat}g (Qty: ${m.servingQuantity})`).join('\n');

  const prompt = `
Generate a quick daily nutrition summary using this data.

Logged Meals:
${mealSummaries || 'No meals logged yet today.'}

Water Consumed: ${totalWater} ml

Goals:
- Calories: ${goals.calories} kcal
- Protein: ${goals.protein}g
- Carbs: ${goals.carbs}g
- Fat: ${goals.fat}g
- Water: ${goals.water} ml

Current Totals:
- Calories: ${Math.round(totalCalories)} kcal
- Protein: ${Math.round(totalProtein)}g
- Carbs: ${Math.round(totalCarbs)}g
- Fat: ${Math.round(totalFat)}g
- Water: ${totalWater} ml

Instructions:
Provide a concise 3-line daily summary. Keep it minimal and motivational.
Formatting rules:
- Keep it exactly 3 short lines/bullet points.
- Do not use markdown bullet lists (like * or -), just write 3 clean lines of text.
- Line 1: Sum up calorie intake vs goal (e.g., "You consumed 2,150 calories today. Under target by 350 kcal.")
- Line 2: Mention macronutrient achievements (e.g., "Protein goal achieved! Keep tabs on fat intake.")
- Line 3: Summarize water consumption (e.g., "Water intake is 500 ml below your goal. Keep hydrating!")
- Ensure it sounds clean, premium, and friendly.
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return text ? text.trim() : 'Unable to generate summary.';
  } catch (e) {
    console.error('Gemini text summary generation failed:', e);
    return `You've consumed ${Math.round(totalCalories)} calories and logged ${totalWater} ml of water today. Configure/check your API key for advanced AI insights.`;
  }
}
