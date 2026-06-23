import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Meal, WaterLog } from './supabaseClient';

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
  description?: string;
}

export async function analyzeFoodImage(
  base64Image: string,
  apiKey: string,
  modelName: string = 'gemini-2.5-flash'
): Promise<DetectedNutrition> {
  if (!apiKey) {
    throw new Error('Gemini API key is required. Please set it in Settings.');
  }

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
  "sugar": 5,
  "description": "Brief one sentence individual item portion and calorie breakdown in this exact format: '[Item1] of [weight] grams has [calories] calories and [Item2] with [weight] grams has [calories] calories' (e.g., 'Puri of 20 grams has 70 calories and chutney with 15 grams has 40 calories')."
}
Notes:
- Provide estimates for the food shown.
- All macronutrients (protein, carbs, fat, fiber, sugar) should be numbers representing grams (g).
- Calories should be a number representing kcal.
- Be as accurate as possible for the identified food items.
- Write the description strictly in a single clear sentence containing each item, its estimated weight in grams, and its estimated calories, following the provided example format exactly.
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
      description: parsed.description || '',
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
  modelName: string = 'gemini-2.5-flash'
): Promise<string> {
  if (!apiKey) {
    return 'Please enter your Gemini API Key in Settings to generate AI insights.';
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  // Calculate totals
  const totalCalories = meals.reduce((sum, m) => sum + (m.calories * (m.serving_quantity || 1)), 0);
  const totalProtein = meals.reduce((sum, m) => sum + (m.protein * (m.serving_quantity || 1)), 0);
  const totalCarbs = meals.reduce((sum, m) => sum + (m.carbs * (m.serving_quantity || 1)), 0);
  const totalFat = meals.reduce((sum, m) => sum + (m.fat * (m.serving_quantity || 1)), 0);
  const totalWater = waterLogs.reduce((sum, w) => sum + w.amount, 0);

  const mealSummaries = meals.map(m => `- ${m.name}: ${m.calories} kcal, P: ${m.protein}g, C: ${m.carbs}g, F: ${m.fat}g (Qty: ${m.serving_quantity})`).join('\n');

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
