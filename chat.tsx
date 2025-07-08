import { useState, useEffect, useRef } from "react";
import { 
  Menu, 
  Search, 
  Activity, 
  User, 
  MessageCircle, 
  Settings,
  Send
} from "lucide-react";
import avatarImage from "@assets/leadharvestai_avatar_1750820310692.png";

interface Message {
  id: string;
  type: 'incoming' | 'outgoing';
  text: string;
  time: string;
  timestamp: Date;
}

interface Contact {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline' | 'away';
  lastMessage: string;
  lastMessageTime: string;
  messages: Message[];
}

export default function ChatInterface() {
  const [selectedContact, setSelectedContact] = useState<string>('jenny');
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const contacts: Contact[] = [
    {
      id: 'jenny',
      name: 'LeadHarvest AI',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100&q=80',
      status: 'online',
      lastMessage: 'What video would you like me to analyze for potential leads?',
      lastMessageTime: 'now',
      messages: [
        { id: '1', type: 'incoming', text: 'Hello! 👋', time: '9:00 AM', timestamp: new Date() },
        { id: '2', type: 'incoming', text: 'I\'m your real estate lead scout specialist. I can help you identify potential buyers, renters, or property inquiry prospects by analyzing comments from social media videos on YouTube, TikTok, and Instagram.', time: '9:00 AM', timestamp: new Date() },
        { id: '3', type: 'incoming', text: 'Here\'s what I can do for you:\n\n• Analyze video comments to find people expressing interest in buying or renting properties\n• Extract key details like property type, location preferences, and contact information\n• Format clean, structured lead records ready for your CRM or follow-up', time: '9:01 AM', timestamp: new Date() },
        { id: '4', type: 'incoming', text: 'To get started, please provide:\n\nA video URL (YouTube, TikTok, or Instagram) that\'s related to real estate content\nLet me know if you want to focus on a specific platform or analyze across all platforms', time: '9:01 AM', timestamp: new Date() },
        { id: '5', type: 'incoming', text: 'For example, you could share a URL of a property tour, real estate market update, or any video where people might be commenting about their housing needs.', time: '9:02 AM', timestamp: new Date() },
        { id: '6', type: 'incoming', text: 'What video would you like me to analyze for potential leads?', time: '9:02 AM', timestamp: new Date() }
      ]
    },
    {
      id: 'mike',
      name: 'Mike Rodriguez',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100&q=80',
      status: 'online',
      lastMessage: 'The property listing looks great!',
      lastMessageTime: '15m',
      messages: [
        { id: '1', type: 'incoming', text: 'The property listing looks great!', time: '10:15 AM', timestamp: new Date() },
        { id: '2', type: 'outgoing', text: 'Thanks! I spent a lot of time on the photos and description.', time: '10:16 AM', timestamp: new Date() },
        { id: '3', type: 'incoming', text: 'It shows. The virtual tour is impressive too.', time: '10:17 AM', timestamp: new Date() },
        { id: '4', type: 'outgoing', text: 'I think it will attract serious buyers quickly.', time: '10:18 AM', timestamp: new Date() }
      ]
    },
    {
      id: 'sarah',
      name: 'Sarah Chen',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100&q=80',
      status: 'away',
      lastMessage: 'Thanks for the market report',
      lastMessageTime: '1h',
      messages: [
        { id: '1', type: 'outgoing', text: 'Here\'s the latest market report you requested.', time: '2:30 PM', timestamp: new Date() },
        { id: '2', type: 'incoming', text: 'Thanks for the market report', time: '2:45 PM', timestamp: new Date() },
        { id: '3', type: 'incoming', text: 'The numbers look promising for Q4.', time: '2:46 PM', timestamp: new Date() }
      ]
    },
    {
      id: 'david',
      name: 'David Thompson',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100&q=80',
      status: 'online',
      lastMessage: 'Are you available for a showing?',
      lastMessageTime: '2h',
      messages: [
        { id: '1', type: 'incoming', text: 'Are you available for a showing?', time: '11:30 AM', timestamp: new Date() },
        { id: '2', type: 'outgoing', text: 'Yes, what time works for your client?', time: '11:32 AM', timestamp: new Date() },
        { id: '3', type: 'incoming', text: 'How about 3 PM tomorrow?', time: '11:35 AM', timestamp: new Date() },
        { id: '4', type: 'outgoing', text: 'Perfect! I\'ll prepare the property details.', time: '11:36 AM', timestamp: new Date() }
      ]
    },
    {
      id: 'lisa',
      name: 'Lisa Park',
      avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100&q=80',
      status: 'away',
      lastMessage: 'Client loved the virtual tour!',
      lastMessageTime: '3h',
      messages: [
        { id: '1', type: 'incoming', text: 'Client loved the virtual tour!', time: '1:15 PM', timestamp: new Date() },
        { id: '2', type: 'outgoing', text: 'That\'s fantastic! Are they ready to move forward?', time: '1:16 PM', timestamp: new Date() },
        { id: '3', type: 'incoming', text: 'They want to schedule an in-person viewing this week.', time: '1:17 PM', timestamp: new Date() }
      ]
    },
    {
      id: 'robert',
      name: 'Robert Kim',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100&q=80',
      status: 'online',
      lastMessage: 'Hot lead - call me back!',
      lastMessageTime: '1d',
      messages: [
        { id: '1', type: 'incoming', text: 'Hot lead - call me back!', time: 'Yesterday', timestamp: new Date() },
        { id: '2', type: 'outgoing', text: 'Just saw your message. What\'s the situation?', time: 'Yesterday', timestamp: new Date() },
        { id: '3', type: 'incoming', text: 'Client wants to put in an offer above asking price!', time: 'Yesterday', timestamp: new Date() }
      ]
    },
    {
      id: 'amanda',
      name: 'Amanda Foster',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100&q=80',
      status: 'offline',
      lastMessage: 'Mortgage approval came through',
      lastMessageTime: '1d',
      messages: [
        { id: '1', type: 'incoming', text: 'Mortgage approval came through', time: 'Yesterday', timestamp: new Date() },
        { id: '2', type: 'outgoing', text: 'Excellent news! When can we proceed with the closing?', time: 'Yesterday', timestamp: new Date() }
      ]
    },
    {
      id: 'james',
      name: 'James Miller',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100&q=80',
      status: 'online',
      lastMessage: 'Can we schedule a walk-through?',
      lastMessageTime: '2d',
      messages: [
        { id: '1', type: 'incoming', text: 'Can we schedule a walk-through?', time: '2 days ago', timestamp: new Date() },
        { id: '2', type: 'outgoing', text: 'Absolutely! I have availability Thursday and Friday.', time: '2 days ago', timestamp: new Date() }
      ]
    }
  ];

  const [contactList, setContactList] = useState<Contact[]>(contacts);

  const currentContact = contactList.find(c => c.id === selectedContact);
  const currentMessages = currentContact?.messages || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages, isTyping]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !currentContact) return;

    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMessage: Message = {
      id: Date.now().toString(),
      type: 'outgoing',
      text: messageInput.trim(),
      time: timeString,
      timestamp: now
    };

    // Update the contact's messages
    setContactList(prev => prev.map(contact => 
      contact.id === selectedContact 
        ? { 
            ...contact, 
            messages: [...contact.messages, newMessage],
            lastMessage: messageInput.trim(),
            lastMessageTime: 'now'
          }
        : contact
    ));

    setMessageInput('');

    // Simulate typing and response
    setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        
        const responses = [
          "Thanks for the update!",
          "That sounds great, let me check my calendar.",
          "I'll get back to you on that shortly.",
          "Perfect, I'll prepare the documents.",
          "Let me know if you need anything else.",
          "Sounds good! I'll handle that right away.",
          "Great to hear from you. Let's discuss this further.",
          "I appreciate the quick response. Very helpful!"
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        const responseTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const responseMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'incoming',
          text: randomResponse,
          time: responseTime,
          timestamp: new Date()
        };

        setContactList(prev => prev.map(contact => 
          contact.id === selectedContact 
            ? { 
                ...contact, 
                messages: [...contact.messages, responseMessage],
                lastMessage: randomResponse,
                lastMessageTime: 'now'
              }
            : contact
        ));
      }, 2000);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-bg-light font-inter">
      {/* Left Sidebar */}
      <div className="w-80 bg-white shadow-lg flex flex-col border-r border-gray-200">
        {/* Sidebar Header */}
        <div className="bg-teal-primary px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Menu className="text-white w-5 h-5 cursor-pointer hover:opacity-80" />
            <span className="text-white font-semibold text-sm tracking-wide">MENU</span>
          </div>
          <Search className="text-white w-5 h-5 cursor-pointer hover:opacity-80" />
        </div>

        {/* Navigation Sections */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
              <div className="flex items-center space-x-3">
                <Activity className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Activity</span>
              </div>
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            </div>
            <div className="flex items-center p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
              <User className="w-4 h-4 text-gray-600 mr-3" />
              <span className="text-sm font-medium text-gray-700">Profile</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-teal-50 cursor-pointer transition-colors">
              <div className="flex items-center space-x-3">
                <MessageCircle className="w-4 h-4 text-teal-primary" />
                <span className="text-sm font-medium text-teal-primary">Messages</span>
              </div>
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            </div>
            <div className="flex items-center p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
              <Settings className="w-4 h-4 text-gray-600 mr-3" />
              <span className="text-sm font-medium text-gray-700">Settings</span>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="p-4">
            <div className="space-y-1">
              {/* Show only the selected contact */}
              {currentContact && (
                <div className="p-3 rounded-lg bg-teal-50 border-l-2 border-teal-primary">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <img 
                        src={currentContact.avatar} 
                        alt={currentContact.name} 
                        className="w-10 h-10 rounded-full object-cover shadow-sm"
                      />
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                        currentContact.status === 'online' ? 'bg-green-500' : 
                        currentContact.status === 'away' ? 'bg-yellow-500' : 'bg-gray-400'
                      }`}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900 text-sm truncate">{currentContact.name}</h4>
                        <span className="text-xs text-gray-500">{currentContact.lastMessageTime}</span>
                      </div>
                      <p className="text-xs text-gray-600 truncate">{currentContact.lastMessage}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Chat Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center space-x-4">
            <img 
              src={avatarImage} 
              alt="LeadHarvest AI" 
              className="w-12 h-12 rounded-full object-cover shadow-md border-2 border-gray-100"
            />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Your conversation with LeadHarvest AI
              </h2>
              <div className="flex items-center space-x-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-600">Online</span>
              </div>
            </div>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
          {currentMessages.map((message) => (
            <div key={message.id} className={`flex items-start space-x-3 ${message.type === 'outgoing' ? 'justify-end' : ''}`}>
              {message.type === 'incoming' && currentContact && (
                <img 
                  src={avatarImage} 
                  alt="LeadHarvest AI" 
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
              )}
              <div className={`flex flex-col space-y-1 max-w-xs ${message.type === 'outgoing' ? 'items-end' : ''}`}>
                <div className={`px-4 py-2 shadow-sm ${
                  message.type === 'incoming' 
                    ? 'bg-gray-100 rounded-2xl rounded-tl-md'
                    : 'bg-teal-primary rounded-2xl rounded-tr-md'
                }`}>
                  <p className={`text-sm ${message.type === 'incoming' ? 'text-gray-800' : 'text-white'} whitespace-pre-line`}>
                    {message.text}
                  </p>
                </div>
                <span className="text-xs text-gray-500 px-2">{message.time}</span>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && currentContact && (
            <div className="flex items-start space-x-3">
              <img 
                src={avatarImage} 
                alt="LeadHarvest AI" 
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
              <div className="bg-gray-100 rounded-2xl rounded-tl-md px-4 py-2 shadow-sm">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce animate-bounce-delay-1"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce animate-bounce-delay-2"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <div className="flex-1 relative">
              <input 
                type="text" 
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..." 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-teal-primary focus:border-transparent text-sm transition-all"
              />
            </div>
            <button 
              onClick={handleSendMessage}
              className="bg-teal-primary hover:bg-teal-600 text-white p-3 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-teal-primary focus:ring-offset-2"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
