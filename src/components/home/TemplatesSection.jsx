import React from 'react';

const templates = [
  {
    title: 'ויראלי בטיקטוק',
    desc: '12 קליפים • 15 שניות',
    image: 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=400&h=700&fit=crop',
    isNew: true,
  },
  {
    title: 'ולוג קולנועי',
    desc: '8 קליפים • 30 שניות',
    image: 'https://images.unsplash.com/photo-1533488765986-dfa2a9939acd?w=400&h=700&fit=crop',
    isNew: false,
  },
];

export default function TemplatesSection() {
  return (
    <div className="space-y-4 pb-4">
      <h2 className="text-lg font-bold text-white">תבניות פופולריות</h2>
      <div className="grid grid-cols-2 gap-3">
        {templates.map((t) => (
          <div key={t.title} className="relative rounded-xl overflow-hidden aspect-[9/16] group cursor-pointer active:scale-[0.98] transition-transform">
            <img
              alt={t.title}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              src={t.image}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80" />
            <div className="absolute bottom-3 left-3 right-3 text-right">
              <p className="text-white text-sm font-bold">{t.title}</p>
              <p className="text-white/60 text-xs">{t.desc}</p>
            </div>
            {t.isNew && (
              <div className="absolute top-2 left-2 bg-purple-600/80 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                חדש
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}