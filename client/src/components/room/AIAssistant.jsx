import React, { useState, useEffect } from 'react';
import { Bot, X, Share2, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { askAI } from '../../services/aiService';
import Markdown from 'react-markdown';

function AIAssistant({ show, onClose, roomId, socket, currentUser, code, language }) {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Initialize with greeting message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: Date.now(),
          isAI: true,
          text: "Hello! I'm your AI coding assistant. How can I help with your code today?",
          timestamp: new Date()
        }
      ]);
    }
  }, [messages.length]);

  // Handle API status
  useEffect(() => {
    // Add a gentle warning about experimental feature if this is first load
    if (messages.length === 1) {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: Date.now(),
          isAI: true,
          isWarning: true,
          text: "**Note:** This AI assistant is using the experimental Gemini API. If you encounter any issues, please try again or simplify your question.",
          timestamp: new Date()
        }]);
      }, 1000);
    }
  }, [messages.length]);

  const handleSendQuery = async (e) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    
    // Add user message to chat
    const userMessage = {
      id: Date.now(),
      isAI: false,
      text: query,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('[AIAssistant] Sending code to AI service:', { language, codeLength: code?.length });
      
      if (!code || code.trim() === '') {
        // Handle empty code specially
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          isAI: true,
          text: "I notice that there's no code in the editor. Please type some code first, or ask me a general programming question instead.",
          timestamp: new Date()
        }]);
        setIsLoading(false);
        setQuery('');
        return;
      }
      
      // Call AI service with current code and query
      const result = await askAI(code || '', query, language || 'text');
      
      if (result.success) {
        // Reset retry count on success
        setRetryCount(0);
        
        // Add AI response to chat
        const aiMessage = {
          id: Date.now() + 1,
          isAI: true,
          text: result.response,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, aiMessage]);
      } else {
        setError(result.error || "Failed to get a response from the AI assistant.");
        
        // Add error message to chat with guidance
        const errorText = `**Error:** ${result.error || "Failed to get a response."}

${getErrorGuidance(result.error)}`;
        
        const errorMessage = {
          id: Date.now() + 1,
          isAI: true,
          isError: true,
          text: errorText,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, errorMessage]);
        setRetryCount(prev => prev + 1);
      }
    } catch (err) {
      console.error('[AIAssistant] Error processing query:', err);
      setError("An unexpected error occurred. Please try again.");
      
      // Add error message to chat
      const errorMessage = {
        id: Date.now() + 1,
        isAI: true,
        isError: true,
        text: "I encountered an error while processing your request. Please try again or simplify your query.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setRetryCount(prev => prev + 1);
    } finally {
      setIsLoading(false);
      setQuery('');
    }
  };

  // Generate helpful guidance based on the error
  const getErrorGuidance = (errorMsg) => {
    if (!errorMsg) return "";
    
    if (errorMsg.includes("API model not found") || errorMsg.includes("supported AI models") || errorMsg.includes("404") || errorMsg.includes("is not found for API version")) {
      return "**Try this:**\n- Wait a moment and try again\n- The model might be temporarily unavailable \n- We're trying multiple Gemini models automatically";
    }
    
    if (errorMsg.includes("access forbidden") || errorMsg.includes("API key") || errorMsg.includes("403")) {
      return "**Try this:**\n- The API key might have reached its quota limit\n- Try a simpler question with less code\n- Wait and try again later";
    }
    
    if (errorMsg.includes("too long") || errorMsg.includes("invalid characters") || errorMsg.includes("400")) {
      return "**Try this:**\n- Make your query shorter and more specific\n- Focus on a smaller part of the code\n- Remove any special characters from your question";
    }
    
    if (errorMsg.includes("Too many requests") || errorMsg.includes("rate limit") || errorMsg.includes("429")) {
      return "**Try this:**\n- Wait a minute before trying again\n- The API has request rate limits\n- Try a different, shorter question";
    }
    
    return "**Try this:**\n- Try simplifying your question\n- Ask about a specific part of the code\n- Wait a few moments and try again";
  };

  // Retry the last question
  const handleRetry = () => {
    if (!isLoading && messages.length > 0) {
      // Find the last user message
      const lastUserMessage = [...messages].reverse().find(m => !m.isAI);
      if (lastUserMessage) {
        setQuery(lastUserMessage.text);
        
        // Add a retry message
        setMessages(prev => [...prev, {
          id: Date.now(),
          isAI: true,
          text: "I'll try to answer your question again with a different model...",
          timestamp: new Date()
        }]);
        
        // Submit the form
        setTimeout(() => {
          const form = document.querySelector('#ai-assistant-form');
          if (form) form.dispatchEvent(new Event('submit', { cancelable: true }));
        }, 500);
      }
    }
  };

  // Function to format timestamps
  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="w-full h-full bg-black bg-opacity-50 backdrop-blur-sm rounded-lg border border-primary/10 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-primary/10">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          AI Assistant {isLoading && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
        </h2>
        <div className="flex items-center gap-2">
          {retryCount > 0 && (
            <button
              onClick={handleRetry}
              className="p-2 text-primary hover:text-primary-light transition-colors"
              title="Retry Last Question"
              disabled={isLoading}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-primary transition-colors"
            title="Close AI Assistant"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4" id="ai-chat-messages">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400">
            <p className="mb-2">How can I help you with your code today?</p>
            <div className="space-y-2 text-sm">
              <p>I can help you with:</p>
              <ul className="list-disc list-inside">
                <li>Code suggestions</li>
                <li>Debugging assistance</li>
                <li>Best practices</li>
                <li>Code explanations</li>
                <li>Performance optimization</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.isAI ? 'justify-start' : 'justify-end'
                }`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-lg ${
                    message.isAI
                      ? message.isError 
                        ? 'bg-red-900/30 text-red-200 border border-red-700/30' 
                        : message.isWarning
                          ? 'bg-yellow-900/30 text-yellow-200 border border-yellow-700/30'
                          : 'bg-primary/10 text-white'
                      : 'bg-primary text-white'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs opacity-60 flex items-center gap-1">
                      {message.isAI ? (
                        <>
                          AI Assistant
                          {message.isWarning && <AlertTriangle className="w-3 h-3 text-yellow-400" />}
                        </>
                      ) : 'You'}
                    </span>
                    <span className="text-xs opacity-60">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  {message.isAI ? (
                    <div className="prose prose-sm prose-invert max-w-none">
                      <Markdown>{message.text}</Markdown>
                    </div>
                  ) : (
                    <div>{message.text}</div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] p-3 rounded-lg bg-primary/5 text-white">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <form
        id="ai-assistant-form"
        onSubmit={handleSendQuery}
        className="p-4 border-t border-primary/10"
      >
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={code ? "Ask me about your code..." : "Type some code first or ask a general question..."}
            className="w-full bg-black bg-opacity-50 border border-primary/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-primary pr-10"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 ${
              isLoading || !query.trim() 
                ? 'text-gray-500 cursor-not-allowed' 
                : 'text-primary hover:text-primary-light cursor-pointer'
            } transition-colors`}
            title="Send Query"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Share2 className="w-5 h-5" />
            )}
          </button>
        </div>
        {error && (
          <div className="mt-2 text-red-400 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button 
              onClick={handleRetry} 
              className="text-primary hover:text-primary-light text-xs flex items-center gap-1"
              disabled={isLoading}
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

export default AIAssistant;
