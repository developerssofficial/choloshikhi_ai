import { Link } from "react-router-dom";

interface Conversation {
  id: string;
  title: string;
  model: string;
  created_at: string;
  updated_at: string;
}

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  isPro: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  isPro,
  isOpen,
  onClose,
}: SidebarProps) {
  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
        </div>
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-[260px] flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{ background: "linear-gradient(180deg, #0d0b1a 0%, #0a0815 100%)" }}
      >
        {/* Logo + Premium Badge */}
        <div className="px-5 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform"
              style={{ background: "linear-gradient(135deg, #7c3aed, #6366f1)" }}>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-white font-bold text-[16px]">Xparrow AI</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Premium
              </span>
            </div>
          </Link>
          <button onClick={onClose} className="lg:hidden text-gray-500 hover:text-white p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* New Chat Button - Purple Gradient */}
        <div className="px-4 mb-4">
          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all btn-click"
            style={{ background: "linear-gradient(135deg, #7c3aed, #6366f1)" }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span>New Chat</span>
          </button>
        </div>

        {/* Navigation */}
        <nav className="px-3 space-y-0.5">
          <NavItem icon={<HomeIcon />} label="Home" href="/" />
          <NavItem icon={<ChatIcon />} label="Chat History" active />
          <NavItem icon={<FileIcon />} label="Files" href="#" />
          <NavItem icon={<SettingsIcon />} label="Settings" href="#" />
        </nav>

        {/* Divider */}
        <div className="mx-5 my-4 border-t border-white/[0.06]"></div>

        {/* Quick Access */}
        <div className="px-3">
          <p className="px-3.5 mb-2 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Quick Access</p>
          <div className="space-y-0.5">
            <NavItem icon={<BulbIcon />} label="Smart Prompts" subtitle="Get better answers" href="#" />
            <NavItem icon={<BookIcon />} label="AI Guides" subtitle="Learn & Explore" href="#" />
          </div>
        </div>

        {/* Conversations */}
        {conversations.length > 0 && (
          <div className="flex-1 overflow-y-auto px-3 mt-4">
            <p className="px-3.5 mb-2 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Recent</p>
            <div className="space-y-0.5">
              {conversations.slice(0, 10).map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  className={`w-full text-left px-3.5 py-2 rounded-lg text-[13px] transition-colors truncate ${
                    activeConversationId === conv.id
                      ? "bg-purple-500/15 text-purple-300"
                      : "text-gray-500 hover:bg-white/[0.04] hover:text-gray-300"
                  }`}
                >
                  {conv.title}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1"></div>

        {/* Premium Upgrade Card */}
        {!isPro && (
          <div className="mx-3 mb-3">
            <div className="p-4 rounded-xl relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(99,102,241,0.1))" }}>
              <div className="absolute top-2 right-2 opacity-20">
                <svg className="w-16 h-16 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <p className="text-[13px] font-bold text-white mb-1 relative">Upgrade to Premium</p>
              <p className="text-[11px] text-gray-400 mb-3 relative">Unlock unlimited features</p>
              <Link
                to="/pro"
                className="relative inline-flex items-center space-x-1 text-[11px] font-semibold text-purple-300 hover:text-purple-200 transition-colors"
              >
                <span>Get Premium</span>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

function NavItem({ icon, label, subtitle, active, href }: { icon: React.ReactNode; label: string; subtitle?: string; active?: boolean; href?: string }) {
  const content = (
    <div className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-[13px] transition-all ${
      active
        ? "bg-white/[0.08] text-white"
        : "text-gray-500 hover:bg-white/[0.04] hover:text-gray-300"
    }`}>
      <div className={`${active ? "text-white" : "text-gray-500"}`}>{icon}</div>
      <div>
        <span className={`${active ? "text-white font-medium" : ""}`}>{label}</span>
        {subtitle && <p className="text-[10px] text-gray-600 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
  if (href) return <Link to={href}>{content}</Link>;
  return <button className="w-full text-left">{content}</button>;
}

function HomeIcon() {
  return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
}
function ChatIcon() {
  return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>;
}
function FileIcon() {
  return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
}
function SettingsIcon() {
  return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
}
function BulbIcon() {
  return <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>;
}
function BookIcon() {
  return <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>;
}
