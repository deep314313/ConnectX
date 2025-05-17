import axios from 'axios';
import { toast } from 'react-toastify';

// Gemini API configuration
const GEMINI_API_KEY = 'AIzaSyCyq9Ddq57kWDcCR3C55XLer9iUqXAnUYE';

// Function to ask AI about code
export const askAI = async (code, question, language) => {
  const toastId = toast.loading("Asking AI assistant...");
  
  try {
    console.log(`[AIService] Sending request to Gemini API`);
    
    // Truncate code if it's too long (Gemini has token limits)
    let processedCode = code;
    if (code.length > 12000) {
      processedCode = code.substring(0, 12000) + "\n// ... (code truncated for length) ...";
      toast.update(toastId, {
        render: "Code is very long, truncating for AI analysis...", 
        type: "info",
        isLoading: true,
      });
    }
    
    // Construct the prompt with code context
    const prompt = `I have the following ${language} code:

\`\`\`${language}
${processedCode}
\`\`\`

${question}

Please analyze the code and answer my question in a concise and helpful way.`;

    // Use the exact curl format provided - simplified for direct Gemini model
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const response = await axios.post(
      apiUrl,
      {
        contents: [{
          parts: [{ text: prompt }]
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`[AIService] Received AI response`);
    
    // Extract and return the response text
    const aiResponse = response.data.candidates[0].content.parts[0].text;
    
    toast.update(toastId, { 
      render: "AI assistant responded successfully!", 
      type: "success", 
      isLoading: false,
      autoClose: 2000,
    });
    
    return { success: true, response: aiResponse };
    
  } catch (error) {
    console.error(`[AIService] Error:`, error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    // Clear loading toast
    toast.dismiss(toastId);
    
    // Show error toast
    toast.error("Failed to get AI response. Please try again.");
    
    // Return error
    const errorMsg = error.response?.data?.error?.message || "Unknown error";
    return { 
      success: false, 
      error: `AI service error: ${errorMsg}` 
    };
  }
}; 