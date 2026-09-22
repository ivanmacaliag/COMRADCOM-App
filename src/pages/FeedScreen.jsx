import React, { useState, useEffect } from 'react';
import { 
  Search, MapPin, Image as ImageIcon, ChevronRight, 
  Bookmark, X, MessageSquare, Send, Tag, Calendar, User, 
  FolderOpen, AlertCircle, CheckCircle2
} from 'lucide-react';
import { collection, getDocs, orderBy, query, addDoc, updateDoc, doc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { mockPosts } from '../data/mockData';

const categoryColors = {
  'Activities': { bg: 'rgba(27,109,36,0.1)', text: '#1B6D24', border: '#1B6D2440' },
  'Monitoring': { bg: 'rgba(136,0,14,0.1)', text: '#88000E', border: '#88000E40' },
  'Announcements': { bg: 'rgba(0,63,135,0.1)', text: '#003F87', border: '#003F8740' },
  'Social Media': { bg: 'rgba(124,58,237,0.1)', text: '#7C3AED', border: '#7C3AED40' },
  'Community': { bg: 'rgba(217,119,6,0.1)', text: '#D97706', border: '#D9770640' }
};

export function FeedScreen() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState(null);

  // Selected post for detail modal view
  const [selectedPost, setSelectedPost] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('Operator');
  const [submittingComment, setSubmittingComment] = useState(false);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'posts'), orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      const fetched = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(fetched.length > 0 ? fetched : mockPosts);
    } catch (err) {
      console.error("Error fetching posts:", err);
      setPosts(mockPosts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const categories = ['All', 'Activities', 'Announcements', 'Monitoring', 'Social Media', 'Community'];
  const popularTags = ['Radio Comms', 'Emergency', 'Typhoon', 'VHF', 'Community', 'NetCall', 'Monitoring', 'Field Ops'];

  // Filter posts based on category, search, and active tag
  const filteredPosts = posts.filter(post => {
    const matchesCat = activeCategory === 'All' || post.category === activeCategory;
    
    const queryLower = searchQuery.toLowerCase().trim();
    const matchesSearch = !queryLower || 
      post.title?.toLowerCase().includes(queryLower) ||
      post.content?.toLowerCase().includes(queryLower) ||
      post.location?.toLowerCase().includes(queryLower) ||
      post.author?.toLowerCase().includes(queryLower) ||
      (Array.isArray(post.tags) && post.tags.some(t => t.toLowerCase().includes(queryLower)));

    const matchesTag = !activeTag || (Array.isArray(post.tags) && post.tags.some(t => t.toLowerCase() === activeTag.toLowerCase()));

    return matchesCat && matchesSearch && matchesTag;
  });

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedPost) return;

    setSubmittingComment(true);
    const newCommentObj = {
      author: commentAuthor || 'Operator',
      text: commentText.trim(),
      date: new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
    };

    try {
      if (selectedPost.id && !selectedPost.id.toString().startsWith('mock')) {
        const postRef = doc(db, 'posts', selectedPost.id);
        await updateDoc(postRef, {
          comments: arrayUnion(newCommentObj)
        });
      }

      const updatedComments = [...(selectedPost.comments || []), newCommentObj];
      const updatedPost = { ...selectedPost, comments: updatedComments };
      setSelectedPost(updatedPost);

      setPosts(prev => prev.map(p => p.id === selectedPost.id ? updatedPost : p));
      setCommentText('');
    } catch (err) {
      console.error('Comment error:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full px-4 sm:px-6 py-5 space-y-5 overflow-y-auto pb-6">
      
      {/* Header (No + New Post button) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-slide-up">
        <div>
          <span className="text-[10px] text-primary font-black tracking-[0.2em]">ORGANIZATION FEED</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">Activities & Posts</h2>
          <p className="text-xs text-slate-500 mt-0.5">News, emergency operations, field reports and community updates</p>
        </div>
      </div>

      {/* Search Bar & Category Filter Bar */}
      <div className="glass-card p-3 rounded-2xl border border-white/70 bg-white/80 shadow-sm space-y-3 animate-slide-up" style={{ animationDelay: '0.05s' }}>
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search posts by title, content, location, or tag..."
            className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-100/80 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-primary/20 transition"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Categories Bar */}
        <div className="flex space-x-2 overflow-x-auto pb-1 no-scrollbar">
          {categories.map(cat => {
            const isActive = activeCategory === cat;
            const catColor = categoryColors[cat];
            return (
              <button 
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-[10px] font-extrabold whitespace-nowrap transition-all active:scale-95 ${
                  isActive 
                    ? 'text-white shadow-md shadow-primary/20' 
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
                style={isActive ? {
                  background: cat === 'All' ? 'linear-gradient(135deg, #003F87, #0056B3)' : catColor?.text,
                } : {
                  background: 'rgba(241, 245, 249, 0.8)',
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tag Cloud Selector */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Tags:</span>
        {activeTag && (
          <button onClick={() => setActiveTag(null)} className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-bold text-[10px] flex items-center space-x-1 shrink-0">
            <span>#{activeTag}</span>
            <X size={12} />
          </button>
        )}
        {popularTags.map(tag => (
          <button
            key={tag}
            onClick={() => setActiveTag(activeTag === tag ? null : tag)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all shrink-0 ${
              activeTag === tag
                ? 'bg-primary text-white'
                : 'bg-white/80 border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            #{tag}
          </button>
        ))}
      </div>

      {/* Posts List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 rounded-full border-[3px] border-primary/20 border-t-primary animate-spin" />
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-slate-400 glass-card rounded-3xl p-8 text-center">
          <Bookmark size={40} className="mb-3 text-slate-300" />
          <span className="text-sm font-bold text-slate-700">No matching posts found</span>
          <p className="text-xs text-slate-400 mt-1">Try clearing your search filters or tag selections.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPosts.map((post, idx) => {
            const catColor = categoryColors[post.category] || categoryColors['Activities'];
            const postImg = post.image || post.imageUrl;
            const commentsCount = (post.comments || []).length;

            return (
              <div 
                key={post.id || idx}
                onClick={() => setSelectedPost(post)}
                className="glass-card rounded-3xl overflow-hidden border border-white/80 bg-white/90 shadow-sm transition-all hover:shadow-md hover:scale-[1.01] cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {postImg ? (
                    <div className="h-44 w-full relative overflow-hidden bg-slate-100">
                      <img 
                        src={postImg} 
                        alt={post.title} 
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = 'none'; }} 
                      />
                      <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-[9px] font-black tracking-wider uppercase shadow-sm"
                        style={{ background: 'rgba(255,255,255,0.95)', color: catColor.text, backdropFilter: 'blur(8px)' }}>
                        {post.category || 'Activities'}
                      </div>
                    </div>
                  ) : (
                    <div className="h-2 w-full" style={{ background: catColor.text }} />
                  )}

                  <div className="p-4 sm:p-5">
                    {!postImg && (
                      <span className="text-[9px] font-black tracking-widest uppercase mb-1.5 inline-block" style={{ color: catColor.text }}>
                        {post.category || 'Activities'}
                      </span>
                    )}

                    <h3 className="font-extrabold text-slate-900 text-base mb-2 leading-snug hover:text-primary transition-colors">
                      {post.title}
                    </h3>

                    <p className="text-xs text-slate-500 mb-4 leading-relaxed line-clamp-3">
                      {post.content}
                    </p>

                    {/* Tags preview */}
                    {Array.isArray(post.tags) && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {post.tags.slice(0, 3).map((tag, tIdx) => (
                          <span key={tIdx} className="px-2 py-0.5 rounded-md bg-slate-100 text-[9px] font-bold text-slate-500">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer metadata */}
                <div className="px-4 py-3 sm:px-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[10px] text-slate-400 font-bold">
                  <div className="flex items-center space-x-1 truncate max-w-[60%]">
                    <MapPin size={12} className="text-primary shrink-0" />
                    <span className="truncate">{post.location || 'Network Philippines'}</span>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    <div className="flex items-center space-x-1 text-slate-500">
                      <MessageSquare size={12} />
                      <span>{commentsCount}</span>
                    </div>
                    <span>By: {post.author || 'Operator'}</span>
                    <ChevronRight size={14} className="text-slate-300" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Post Detail Drawer / Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-slate-100 animate-slide-up">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase text-white"
                  style={{ background: categoryColors[selectedPost.category]?.text || '#003F87' }}>
                  {selectedPost.category || 'Activities'}
                </span>
                <span className="text-xs text-slate-400 font-bold">{selectedPost.location || 'Network'}</span>
              </div>
              <button 
                onClick={() => setSelectedPost(null)}
                className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
              
              {/* Optional Post Image */}
              {(selectedPost.image || selectedPost.imageUrl) && (
                <div className="rounded-2xl overflow-hidden bg-slate-950 max-h-72 flex items-center justify-center">
                  <img src={selectedPost.image || selectedPost.imageUrl} alt={selectedPost.title} className="w-full h-full object-cover" />
                </div>
              )}

              {/* Title & Author */}
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight mb-2">
                  {selectedPost.title}
                </h2>
                <div className="flex items-center space-x-3 text-xs text-slate-400 font-medium">
                  <span className="flex items-center space-x-1 text-slate-700 font-bold">
                    <User size={13} className="text-primary" />
                    <span>{selectedPost.author || 'Operator'}</span>
                  </span>
                  <span>•</span>
                  <span>{selectedPost.authorRole || 'COMRADCOM Network'}</span>
                </div>
              </div>

              {/* Content text */}
              <div className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line border-t border-slate-100 pt-4">
                {selectedPost.content}
              </div>

              {/* Tags */}
              {Array.isArray(selectedPost.tags) && selectedPost.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {selectedPost.tags.map((tag, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-primary/5 text-primary text-[10px] font-bold">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Comments Section */}
              <div className="border-t border-slate-100 pt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <MessageSquare size={16} className="text-primary" />
                    <span>Comments ({(selectedPost.comments || []).length})</span>
                  </h3>
                </div>

                {/* Comment Input */}
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition"
                  />
                  <button
                    type="submit"
                    disabled={submittingComment || !commentText.trim()}
                    className="px-4 py-2.5 rounded-xl bg-primary text-white font-bold text-xs shadow hover:bg-primary-light disabled:opacity-50 flex items-center space-x-1"
                  >
                    <Send size={14} />
                  </button>
                </form>

                {/* Comment List */}
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {(!selectedPost.comments || selectedPost.comments.length === 0) ? (
                    <p className="text-xs text-slate-400 py-2">No comments yet. Be the first to reply!</p>
                  ) : (
                    selectedPost.comments.map((c, i) => (
                      <div key={i} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{c.author || 'Anonymous'}</span>
                          <span className="text-[10px] text-slate-400">{c.date || ''}</span>
                        </div>
                        <p className="text-slate-600 font-normal leading-normal">{c.text}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
