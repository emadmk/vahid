import { useState, useEffect, useRef } from 'react';
import {
  FaComments, FaPaperPlane, FaSearch, FaUser, FaEllipsisV,
  FaCheck, FaCheckDouble, FaClock, FaPaperclip, FaSmile,
  FaTimes, FaPlus, FaPhone, FaVideo, FaInfoCircle,
  FaExclamationTriangle, FaArrowLeft
} from 'react-icons/fa';
import api from '../../services/api';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

const MessagesPage = () => {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [customers, setCustomers] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    fetchConversations();
    if (user?.role === 'sarafi') {
      fetchCustomers();
    }
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation._id);
      // Polling for new messages
      const interval = setInterval(() => {
        fetchMessages(selectedConversation._id, true);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      const res = await api.get('/messages/conversations');
      setConversations(res.data.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId, silent = false) => {
    try {
      const res = await api.get(`/messages/conversations/${conversationId}/messages`);
      setMessages(res.data.data || []);
      // Mark as read
      await api.put(`/messages/conversations/${conversationId}/read`);
    } catch (error) {
      if (!silent) console.error(error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/sarafi/customers');
      setCustomers((res.data.data || []).filter(c => c.status === 'approved'));
    } catch (error) {
      console.error(error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    setSending(true);
    try {
      const res = await api.post(`/messages/conversations/${selectedConversation._id}/messages`, {
        content: newMessage.trim()
      });
      setMessages([...messages, res.data.data]);
      setNewMessage('');
      inputRef.current?.focus();
      fetchConversations(); // Update last message
    } catch (error) {
      toast.error('خطا در ارسال پیام');
    } finally {
      setSending(false);
    }
  };

  const handleStartConversation = async (userId) => {
    try {
      const res = await api.post('/messages/conversations/direct', { userId });
      setSelectedConversation(res.data.data);
      setShowNewChat(false);
      fetchConversations();
    } catch (error) {
      toast.error('خطا در ایجاد مکالمه');
    }
  };

  const getOtherParticipant = (conversation) => {
    if (!conversation?.participants) return null;
    return conversation.participants.find(p => p.user?._id !== user?._id)?.user;
  };

  const formatTime = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;

    if (diff < 86400000) { // Less than 24 hours
      return d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    } else if (diff < 604800000) { // Less than a week
      return d.toLocaleDateString('fa-IR', { weekday: 'short' });
    }
    return d.toLocaleDateString('fa-IR', { month: 'short', day: 'numeric' });
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const other = getOtherParticipant(conv);
    const name = `${other?.firstName || ''} ${other?.lastName || ''}`.toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="h-[calc(100vh-120px)] flex bg-dark-900 rounded-xl overflow-hidden">
      {/* Sidebar - Conversations List */}
      <div className={`w-full md:w-80 lg:w-96 bg-dark-850 border-l border-dark-800 flex flex-col ${
        selectedConversation ? 'hidden md:flex' : 'flex'
      }`}>
        {/* Header */}
        <div className="p-4 border-b border-dark-800">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <FaComments className="text-gold" />
              پیام‌ها
            </h1>
            <button
              onClick={() => setShowNewChat(true)}
              className="p-2 rounded-lg bg-gold text-dark-900 hover:bg-gold/80"
            >
              <FaPlus />
            </button>
          </div>
          <div className="relative">
            <FaSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400" />
            <input
              type="text"
              placeholder="جستجو..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input w-full pr-10"
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="loading-spinner"></div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center p-8">
              <FaComments className="text-dark-600 text-4xl mx-auto mb-4" />
              <p className="text-dark-400">مکالمه‌ای وجود ندارد</p>
              <button
                onClick={() => setShowNewChat(true)}
                className="btn-gold mt-4"
              >
                شروع مکالمه جدید
              </button>
            </div>
          ) : (
            filteredConversations.map(conv => {
              const other = getOtherParticipant(conv);
              return (
                <div
                  key={conv._id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`p-4 border-b border-dark-800 cursor-pointer transition-all hover:bg-dark-800 ${
                    selectedConversation?._id === conv._id ? 'bg-dark-800' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold to-yellow-600 flex items-center justify-center text-dark-900 font-bold text-lg">
                      {other?.firstName?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-white truncate">
                          {other?.firstName} {other?.lastName}
                        </h3>
                        <span className="text-dark-500 text-xs">
                          {conv.lastMessage?.sentAt && formatTime(conv.lastMessage.sentAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-dark-400 text-sm truncate">
                          {conv.lastMessage?.content || 'بدون پیام'}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="bg-gold text-dark-900 text-xs font-bold rounded-full px-2 py-0.5">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col ${
        !selectedConversation ? 'hidden md:flex' : 'flex'
      }`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-dark-800 flex items-center justify-between bg-dark-850">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="md:hidden p-2 text-dark-400 hover:text-white"
                >
                  <FaArrowLeft />
                </button>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold to-yellow-600 flex items-center justify-center text-dark-900 font-bold">
                  {getOtherParticipant(selectedConversation)?.firstName?.[0] || '?'}
                </div>
                <div>
                  <h3 className="font-bold text-white">
                    {getOtherParticipant(selectedConversation)?.firstName}{' '}
                    {getOtherParticipant(selectedConversation)?.lastName}
                  </h3>
                  <p className="text-dark-400 text-xs">
                    {getOtherParticipant(selectedConversation)?.phone}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-dark-400 hover:text-white rounded-lg hover:bg-dark-800">
                  <FaPhone />
                </button>
                <button className="p-2 text-dark-400 hover:text-white rounded-lg hover:bg-dark-800">
                  <FaInfoCircle />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gradient-to-b from-dark-950 to-dark-900">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <FaComments className="text-dark-700 text-5xl mx-auto mb-3" />
                    <p className="text-dark-500">هنوز پیامی ارسال نشده</p>
                  </div>
                </div>
              ) : (
                messages.map((message, idx) => {
                  const isMine = message.sender?._id === user?._id;
                  const showAvatar = !isMine && (idx === 0 || messages[idx - 1]?.sender?._id !== message.sender?._id);
                  const isFirstInGroup = idx === 0 || messages[idx - 1]?.sender?._id !== message.sender?._id;

                  return (
                    <div
                      key={message._id}
                      className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-4' : 'mt-0.5'}`}
                    >
                      <div className={`flex items-end gap-2 max-w-[80%] ${isMine ? 'flex-row-reverse' : ''}`}>
                        {/* آواتار */}
                        {!isMine && showAvatar && (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold shadow-lg flex-shrink-0">
                            {message.sender?.firstName?.[0] || '?'}
                          </div>
                        )}
                        {!isMine && !showAvatar && <div className="w-8 flex-shrink-0" />}

                        {/* حباب پیام */}
                        <div
                          className={`relative px-4 py-2.5 shadow-lg ${
                            isMine
                              ? 'bg-gradient-to-r from-amber-500 to-yellow-400 rounded-2xl rounded-br-sm'
                              : 'bg-slate-700 border border-slate-600 rounded-2xl rounded-bl-sm'
                          }`}
                        >
                          {/* نام فرستنده */}
                          {!isMine && isFirstInGroup && (
                            <p className="text-xs font-semibold text-emerald-400 mb-1">
                              {message.sender?.firstName} {message.sender?.lastName}
                            </p>
                          )}

                          {/* محتوای پیام */}
                          <p
                            className="whitespace-pre-wrap break-words text-[15px] leading-relaxed"
                            style={{ color: isMine ? '#1a1a1a' : '#f1f5f9' }}
                          >
                            {message.content}
                          </p>

                          {/* زمان و وضعیت */}
                          <div
                            className="flex items-center gap-1.5 mt-1.5 text-[10px]"
                            style={{
                              color: isMine ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.5)',
                              justifyContent: 'flex-end'
                            }}
                          >
                            <span>{formatTime(message.createdAt)}</span>
                            {isMine && (
                              message.readBy?.length > 1 ? (
                                <FaCheckDouble style={{ color: '#16a34a' }} />
                              ) : (
                                <FaCheck style={{ opacity: 0.7 }} />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-dark-800 bg-dark-850">
              <div className="flex items-center gap-2">
                <button type="button" className="p-2 text-dark-400 hover:text-white">
                  <FaPaperclip />
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="پیام خود را بنویسید..."
                  className="input flex-1"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="p-3 rounded-lg bg-gold text-dark-900 hover:bg-gold/80 disabled:opacity-50"
                >
                  <FaPaperPlane />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FaComments className="text-dark-600 text-6xl mx-auto mb-4" />
              <p className="text-dark-400 text-lg">یک مکالمه را انتخاب کنید</p>
            </div>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">مکالمه جدید</h2>
              <button onClick={() => setShowNewChat(false)} className="text-dark-400 hover:text-white">
                <FaTimes />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {customers.length === 0 ? (
                <p className="text-dark-400 text-center py-8">مشتری‌ای یافت نشد</p>
              ) : (
                customers.map(customer => (
                  <div
                    key={customer._id}
                    onClick={() => handleStartConversation(customer._id)}
                    className="p-3 rounded-lg hover:bg-dark-800 cursor-pointer flex items-center gap-3 transition-all"
                  >
                    <div className="w-10 h-10 rounded-full bg-dark-700 flex items-center justify-center">
                      <FaUser className="text-dark-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {customer.firstName} {customer.lastName}
                      </p>
                      <p className="text-dark-400 text-sm">{customer.phone}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesPage;
