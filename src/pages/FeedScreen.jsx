import React, { useState, useEffect } from 'react';
import { MapPin, Image as ImageIcon, ChevronRight, Bookmark } from 'lucide-react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { mockPosts } from '../data/mockData';

const categoryColors = {
  'Activities': { bg: 'rgba(27,109,36,0.08)', text: '#1B6D24', dot: '#1B6D24' },
  'Monitoring': { bg: 'rgba(136,0,14,0.08)', text: '#88000E', dot: '#88000E' },
  'Announcements': { bg: 'rgba(0,63,135,0.08)', text: '#003F87', dot: '#003F87' },
};

export function FeedScreen() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    const fetchPosts = async () => {
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
    fetchPosts();
  }, []);

  const categories = ['All', 'Activities', 'Monitoring', 'Announcements'];
  const filteredPosts = activeCategory === 'All' ? posts : posts.filter(p => p.category === activeCategory);

  return (
    <div className="flex flex-col h-full px-5 py-5 space-y-4 overflow-y-auto pb-4">
      {/* Header */}
      <div className="animate-slide-up">
        <span className="text-[9px] text-primary font-bold tracking-[0.2em]">ORGANIZATION</span>
        <h2 className="text-2xl font-black text-on-surface leading-tight">Activity Feed</h2>
        <p className="text-xs text-gray-400 mt-1">Latest updates from your network</p>
      </div>

      {/* Category Filter Chips */}
      <div className="flex space-x-2 overflow-x-auto pb-1 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        {categories.map(cat => {
          const isActive = activeCategory === cat;
          const catColor = categoryColors[cat];
          return (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-[10px] font-bold whitespace-nowrap transition-all active:scale-95 ${
                isActive 
                  ? 'text-white shadow-lg' 
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
              style={isActive ? {
                background: cat === 'All' ? 'linear-gradient(135deg, #003F87, #0056B3)' : catColor?.bg,
                color: cat === 'All' ? '#fff' : catColor?.text,
                boxShadow: cat === 'All' ? '0 4px 15px rgba(0,63,135,0.3)' : 'none',
                border: cat !== 'All' ? `1px solid ${catColor?.dot}30` : 'none'
              } : {
                background: 'rgba(255,255,255,0.7)',
                border: '1px solid rgba(0,0,0,0.06)'
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 rounded-full border-[3px] border-primary/20 border-t-primary animate-spin" />
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-gray-400">
          <Bookmark size={40} className="mb-3 text-gray-300" />
          <span className="text-sm font-bold">No posts in this category</span>
        </div>
      ) : filteredPosts.map((post, idx) => {
        const catColor = categoryColors[post.category] || categoryColors['Activities'];
        return (
          <div key={idx} className="glass-card rounded-2xl overflow-hidden animate-slide-up transition-all hover:scale-[1.01] cursor-pointer"
            style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)', animationDelay: `${0.15 + idx * 0.05}s` }}>
            
            {/* Image or colored accent bar */}
            {post.imageUrl ? (
              <div className="h-44 w-full relative overflow-hidden">
                <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" 
                  onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 hidden">
                  <ImageIcon size={36} className="text-gray-300" />
                </div>
                {/* Gradient overlay at bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-16" 
                  style={{ background: 'linear-gradient(transparent, rgba(255,255,255,0.9))' }} />
                {/* Category chip on image */}
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[9px] font-black tracking-wider"
                  style={{ background: catColor.bg, color: catColor.text, backdropFilter: 'blur(8px)' }}>
                  {post.category?.toUpperCase()}
                </div>
              </div>
            ) : (
              <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${catColor.dot}, ${catColor.dot}60)` }} />
            )}
            
            <div className="p-4 flex flex-col">
              {!post.imageUrl && (
                <span className="text-[9px] font-black tracking-[0.15em] mb-1.5" style={{ color: catColor.text }}>
                  {post.category?.toUpperCase()}
                </span>
              )}
              <h3 className="font-bold text-on-surface text-[15px] mb-1.5 leading-snug">{post.title}</h3>
              <p className="text-xs text-gray-500 mb-3 leading-relaxed line-clamp-3">{post.content}</p>
              
              <div className="flex items-center justify-between text-[9px] text-gray-400 font-bold border-t border-gray-100 pt-3">
                <div className="flex items-center">
                  <MapPin size={10} className="mr-1" style={{ color: catColor.dot }} />
                  <span>{post.location || 'Unknown'}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span>By: {post.author}</span>
                  <ChevronRight size={12} className="text-gray-300" />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
