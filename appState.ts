// Global app state management for persisting data across page navigation
interface Message {
  id: string;
  type: 'user' | 'ai' | 'system';
  text: string;
  time: string;
  timestamp: Date;
  isExpanded?: boolean;
  hasResults?: boolean;
  results?: any[];
  canSaveToDatabase?: boolean;
  savedToDatabase?: boolean;
  originalText?: string;
  detailedText?: string;
  showDetailed?: boolean;
}

interface WorkflowStatus {
  step: 'idle' | 'scraping' | 'analyzing' | 'formatting' | 'complete';
  progress: number;
  message: string;
}

interface AppState {
  messages: Message[];
  workflowStatus: WorkflowStatus;
  isProcessing: boolean;
}

class AppStateManager {
  private state: AppState = {
    messages: [],
    workflowStatus: { step: 'idle', progress: 0, message: '' },
    isProcessing: false
  };

  private listeners: ((state: AppState) => void)[] = [];
  private storageKey = 'leadscout-app-state';

  constructor() {
    this.loadFromStorage();
  }

  getState(): AppState {
    return { ...this.state };
  }

  setState(updates: Partial<AppState>) {
    this.state = { ...this.state, ...updates };
    this.saveToStorage();
    this.notifyListeners();
  }

  updateMessages(messages: Message[]) {
    this.setState({ messages });
  }

  addMessage(message: Message) {
    this.setState({ messages: [...this.state.messages, message] });
  }

  updateMessage(messageId: string, updates: Partial<Message>) {
    const messages = this.state.messages.map(msg => 
      msg.id === messageId ? { ...msg, ...updates } : msg
    );
    this.setState({ messages });
  }

  updateWorkflowStatus(status: Partial<WorkflowStatus>) {
    this.setState({ 
      workflowStatus: { ...this.state.workflowStatus, ...status }
    });
  }

  setProcessing(isProcessing: boolean) {
    this.setState({ isProcessing });
  }

  subscribe(listener: (state: AppState) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.state));
  }

  private saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({
        messages: this.state.messages,
        workflowStatus: this.state.workflowStatus
      }));
    } catch (error) {
      console.warn('Failed to save app state to storage:', error);
    }
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.state = {
          messages: data.messages || [],
          workflowStatus: data.workflowStatus || { step: 'idle', progress: 0, message: '' },
          isProcessing: false
        };
      }
    } catch (error) {
      console.warn('Failed to load app state from storage:', error);
    }
  }

  clearState() {
    this.state = {
      messages: [],
      workflowStatus: { step: 'idle', progress: 0, message: '' },
      isProcessing: false
    };
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.warn('Failed to clear app state from storage:', error);
    }
    this.notifyListeners();
  }
}

export const appState = new AppStateManager();
export type { Message, WorkflowStatus, AppState };