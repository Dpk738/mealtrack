import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  // CORS setup
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image, apiKey, modelName, type, meals, waterLogs, goals } = req.body;

  if (!apiKey) {
    return res.status(400).json({ error: 'API key is required' });
  }

  const activeModel = modelName || 'gemini-1.5-flash';

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    if (type === 'summary') {
      const model = genAI.getGenerativeModel({ model: activeModel });
      const mealSummaries = (meals || []).map(m => `- ${m.name}: ${m.calories} kcal, P: ${m.protein}g, C: ${m.carbs}g, F: ${m.fat}g (Qty: ${m.servingQuantity})`).join('\n');
      const totalCalories = (meals || []).reduce((sum, m) => sum + (m.calories * (m.servingQuantity || 1)), 0);
      const totalProtein = (meals || []).reduce((sum, m) => sum + (m.protein * (m.servingQuantity || 1)), 0);
      const totalCarbs = (meals || []).reduce((sum, m) => sum + (m.carbs * (m.servingQuantity || 1)), 0);
      const totalFat = (meals || []).reduce((sum, m) => sum + (m.fat * (m.servingQuantity || 1)), 0);
      const totalWater = (waterLogs || []).reduce((sum, w) => sum + w.amount, 0);

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
      const result = await model.generateContent(prompt);
      return res.status(200).json({ text: result.response.text() });
    } else {
      // Vision analysis
      const model = genAI.getGenerativeModel({
        model: activeModel,
        generationConfig: {
          responseMimeType: 'application/json'
        }
      });

      const matches = image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ error: 'Invalid image format.' });
      }

      const imagePart = {
        inlineData: {
          data: matches[2],
          mimeType: matches[1]
        }
      };

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

      const result = await model.generateContent([prompt, imagePart]);
      return res.status(200).json({ text: result.response.text() });
    }
  } catch (err) {
    console.error('Proxy Gemini failure:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error during AI query' });
  }
}
