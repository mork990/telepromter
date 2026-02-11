import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

export default function FeatureCard({ icon: Icon, title, description, page, gradient, delay = 0 }) {
  const navigate = useNavigate();

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      onClick={() => navigate(createPageUrl(page))}
      className="relative w-full aspect-[1/1.1] rounded-3xl overflow-hidden group active:scale-[0.96] transition-transform"
    >
      {/* Background gradient */}
      <div className={`absolute inset-0 ${gradient} opacity-90`} />

      {/* Glass overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-white/5" />

      {/* Decorative circles */}
      <div className="absolute -top-8 -left-8 w-24 h-24 rounded-full bg-white/10 blur-xl group-hover:scale-125 transition-transform duration-700" />
      <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-white/5 blur-lg" />

      {/* Content */}
      <div className="relative h-full flex flex-col items-center justify-center p-5 text-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform duration-300">
          <Icon className="w-7 h-7 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-extrabold text-white mb-1.5 drop-shadow-lg">{title}</h3>
          <p className="text-[11px] text-white/70 leading-relaxed drop-shadow-md max-w-[140px] mx-auto">{description}</p>
        </div>
      </div>

      {/* Shine effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </motion.button>
  );
}