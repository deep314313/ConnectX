import React, { useState } from 'react';
import { Bot, X, Share2 } from 'lucide-react';

function AIAssistant() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [messages] = useState([]); // TODO: Replace with actual AI chat history

  const handleSendQuery = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    // TODO: Implement AI query handling
    setQuery('');
  };

  return (
    <div
      className={`fixed right-4 bottom-4 transition-all ${
        isExpanded ? 'w-96 h-[32rem]' : 'w-14 h-14'
      }`}
    >
      {isExpanded ? (
        <div className="w-full h-full bg-black bg-opacity-50 backdrop-blur-sm rounded-lg border border-primary/10 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-primary/10">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              AI Assistant
            </h2>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-2 text-gray-400 hover:text-primary transition-colors"
              title="Close AI Assistant"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
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
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.isAI ? 'justify-start' : 'justify-end'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.isAI
                          ? 'bg-primary/10 text-white'
                          : 'bg-primary text-white'
                      }`}
                    >
                      {message.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <form
            onSubmit={handleSendQuery}
            className="p-4 border-t border-primary/10"
          >
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask me anything..."
                className="w-full bg-black bg-opacity-50 border border-primary/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-primary pr-10"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-primary hover:text-primary-light transition-colors"
                title="Send Query"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full h-full rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-dark transition-colors"
          title="Open AI Assistant"
        >
          <Bot className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}

export default AIAssistant;
