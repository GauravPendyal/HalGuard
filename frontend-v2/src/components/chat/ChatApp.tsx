"use client";

import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { ChatArea } from './ChatArea';
import { ChatInput } from './ChatInput';
import { SettingsModal } from './SettingsModal';
import { UpgradeModal } from './UpgradeModal';
import { SearchModal } from './SearchModal';
import { Conversation, Message, ModelOption, UserSettings, Attachment } from './types';
import { AI_MODELS, MOCK_CONVERSATIONS } from '@/constants/models';

export function ChatApp() {
  // State initialization with localStorage persistence
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    if (typeof window === 'undefined') return MOCK_CONVERSATIONS;
    try {
      const saved = localStorage.getItem('chatgpt_conversations');
      return saved ? JSON.parse(saved) : MOCK_CONVERSATIONS;
    } catch {
      return MOCK_CONVERSATIONS;
    }
  });

  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => {
    return MOCK_CONVERSATIONS[0]?.id || null;
  });

  const [selectedModel, setSelectedModel] = useState<ModelOption>(AI_MODELS[0]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tempChat, setTempChat] = useState(false);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Settings
  const [settings, setSettings] = useState<UserSettings>(() => {
    const defaultSettings: UserSettings = {
      theme: 'dark',
      webSearchEnabled: false,
      reasoningEnabled: false,
      tempChat: false,
    };
    if (typeof window === 'undefined') return defaultSettings;
    try {
      const saved = localStorage.getItem('chatgpt_settings');
      return saved ? JSON.parse(saved) : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  // Save conversations to localStorage
  useEffect(() => {
    if (!tempChat && typeof window !== 'undefined') {
      try {
        localStorage.setItem('chatgpt_conversations', JSON.stringify(conversations));
      } catch {}
    }
  }, [conversations, tempChat]);

  // Save settings & theme class on document element
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('chatgpt_settings', JSON.stringify(settings));
      } catch {}

      const root = document.documentElement;
      if (settings.theme === 'dark') {
        root.classList.add('dark');
      } else if (settings.theme === 'light') {
        root.classList.remove('dark');
      } else {
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
    }
  }, [settings]);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  // Handlers
  const handleNewChat = () => {
    const newConv: Conversation = {
      id: `conv-${Date.now()}`,
      title: 'New Chat',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      modelId: selectedModel.id,
      messages: [],
      pinned: false,
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
  };

  const handleDeleteConversation = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversationId === id) {
      const remaining = conversations.filter((c) => c.id !== id);
      setActiveConversationId(remaining[0]?.id || null);
    }
  };

  const handleRenameConversation = (id: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle, updatedAt: Date.now() } : c))
    );
  };

  const handlePinConversation = (id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c))
    );
  };

  const handleUpdateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const handleFeedbackMessage = (messageId: string, type: 'like' | 'dislike') => {
    if (!activeConversationId) return;
    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id !== activeConversationId) return conv;
        return {
          ...conv,
          messages: conv.messages.map((m) =>
            m.id === messageId ? { ...m, feedback: m.feedback === type ? null : type } : m
          ),
        };
      })
    );
  };

  // Message sending & simulated streaming AI response
  const handleSendMessage = (text: string, attachments: Attachment[]) => {
    let currentConvId = activeConversationId;

    // Create new conversation if none active or empty
    if (!currentConvId || !activeConversation) {
      const newConv: Conversation = {
        id: `conv-${Date.now()}`,
        title: text.slice(0, 30) || 'New Chat',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        modelId: selectedModel.id,
        messages: [],
      };
      setConversations((prev) => [newConv, ...prev]);
      currentConvId = newConv.id;
      setActiveConversationId(newConv.id);
    }

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachments,
    };

    // Append user message
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== currentConvId) return c;
        const isFirstMsg = c.messages.length === 0;
        return {
          ...c,
          title: isFirstMsg ? text.slice(0, 32) || 'New Chat' : c.title,
          updatedAt: Date.now(),
          messages: [...c.messages, userMsg],
        };
      })
    );

    setIsGenerating(true);

    // Simulated AI response generation
    setTimeout(() => {
      const assistantMsgId = `msg-reply-${Date.now()}`;
      const reasoningTime = selectedModel.id.includes('o1') || settings.reasoningEnabled ? '4' : undefined;

      const aiResponseContent = generateSimulatedResponse(text, selectedModel.id, settings.webSearchEnabled);

      const assistantMsg: Message = {
        id: assistantMsgId,
        role: 'assistant',
        content: aiResponseContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        reasoningTime,
      };

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== currentConvId) return c;
          return {
            ...c,
            updatedAt: Date.now(),
            messages: [...c.messages, assistantMsg],
          };
        })
      );

      setIsGenerating(false);
    }, 1200);
  };

  const handleRegenerate = () => {
    if (!activeConversation || activeConversation.messages.length === 0) return;
    const lastUserMsg = [...activeConversation.messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) {
      handleSendMessage(lastUserMsg.content, lastUserMsg.attachments || []);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-chatgpt-lightBg dark:bg-chatgpt-darkBg text-chatgpt-textLight dark:text-chatgpt-textDark">
      {/* Collapsible Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onPinConversation={handlePinConversation}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenUpgrade={() => setIsUpgradeOpen(true)}
        theme={settings.theme}
        onToggleTheme={() =>
          handleUpdateSettings({
            theme: settings.theme === 'dark' ? 'light' : 'dark',
          })
        }
      />

      {/* Main Container Viewport */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative overflow-hidden">
        {/* Top Navigation Bar */}
        <Header
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(true)}
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
          onNewChat={handleNewChat}
          onOpenSearch={() => setIsSearchOpen(true)}
          tempChat={tempChat}
          onToggleTempChat={() => setTempChat(!tempChat)}
          hasMessages={Boolean(activeConversation && activeConversation.messages.length > 0)}
        />

        {/* Scrollable Conversation Workspace */}
        <ChatArea
          messages={activeConversation?.messages || []}
          isGenerating={isGenerating}
          onSelectPrompt={(promptText) => handleSendMessage(promptText, [])}
          onRegenerate={handleRegenerate}
          onFeedbackMessage={handleFeedbackMessage}
        />

        {/* Fixed Bottom Input Area */}
        <ChatInput
          onSendMessage={handleSendMessage}
          isGenerating={isGenerating}
          onStopGeneration={() => setIsGenerating(false)}
          webSearchEnabled={settings.webSearchEnabled}
          onToggleWebSearch={() =>
            handleUpdateSettings({ webSearchEnabled: !settings.webSearchEnabled })
          }
          reasoningEnabled={settings.reasoningEnabled}
          onToggleReasoning={() =>
            handleUpdateSettings({ reasoningEnabled: !settings.reasoningEnabled })
          }
        />
      </div>

      {/* Modals & Overlays */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />

      <UpgradeModal isOpen={isUpgradeOpen} onClose={() => setIsUpgradeOpen(false)} />

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        conversations={conversations}
        onSelectConversation={handleSelectConversation}
      />
    </div>
  );
}

// Helper: Rich simulated responses matching ChatGPT's intelligent style
function generateSimulatedResponse(userText: string, modelId: string, webSearch: boolean): string {
  const query = userText.toLowerCase();

  if (query.includes('code') || query.includes('python') || query.includes('script') || query.includes('function')) {
    return `Here is a production-ready implementation tailored to your request:

\`\`\`python
import requests
from bs4 import BeautifulSoup
import pandas as pd

def scrape_data(url: str):
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    response = requests.get(url, headers=headers)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    rows = []

    for item in soup.select(".data-row"):
        title = item.select_one(".title")
        price = item.select_one(".price")
        if title and price:
            rows.append({
                "title": title.get_text(strip=True),
                "price": price.get_text(strip=True)
            })

    df = pd.DataFrame(rows)
    df.to_csv("output.csv", index=False)
    print(f"Successfully exported {len(df)} records to output.csv")

if __name__ == "__main__":
    scrape_data("https://news.ycombinator.com")
\`\`\`

### Key Features:
- **Error handling**: Checks HTTP status with \`raise_for_status()\`.
- **Data export**: Uses pandas for instant clean CSV formatting.
- **Custom User-Agent**: Prevents default bot blocking.`;
  }

  if (query.includes('email') || query.includes('pitch') || query.includes('draft')) {
    return `Here is a concise, high-converting cold email template:

**Subject:** Streamlining your UI workflow for [Company Name]

Hi [Name],

I noticed your team is actively scaling frontend engineering efforts at [Company Name]. Building consistent, high-performance UI components often consumes significant sprint cycles.

We recently developed an enterprise-grade AI UI component kit that speeds up frontend prototyping by **3x** with production-ready React & Tailwind CSS integration.

Would you be open to a quick 5-minute preview this Thursday?

Best regards,  
**Manjunath Reddy**  
*Lead Product Engineer*`;
  }

  if (webSearch) {
    return `### Search Results Summary

Based on live web references regarding **"${userText}"**:

1. **Latest Updates**: Modern AI chat interfaces focus on contextual retention, multi-modal file support, and instant code execution capabilities.
2. **Key Metrics**: Latency has decreased significantly with lightweight models like \`GPT-4o mini\`.
3. **Best Practices**: Maintain accessible UI contrast ratio, responsive sidebar navigation, and local storage state persistence.

Let me know if you would like me to drill deeper into any specific section!`;
  }

  return `That's a great question! 

Here is a structured overview addressing **"${userText}"**:

1. **Overview & Context**: Setting clear parameters ensures optimal results across complex workflows.
2. **Implementation Strategy**:
   - Break down objectives into modular sub-tasks.
   - Leverage fast feedback loops and automated testing.
   - Maintain robust dark/light accessibility across UI elements.
3. **Next Steps**:
   - Review requirements.
   - Deploy scalable components with clean state management.

Is there anything specific you would like me to elaborate on or adapt to your stack?`;
}
