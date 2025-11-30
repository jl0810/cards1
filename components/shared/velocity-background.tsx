"use client";

import { motion } from "framer-motion";
import React from "react";

export const VelocityBackground = () => {
  return (
    <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
        className="absolute inset-0 bg-background"
      />
      
      {/* Moving Blobs */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 100, 0],
          y: [0, 50, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-primary/20 blur-[120px]"
      />
      
      <motion.div
        animate={{
          scale: [1, 1.5, 1],
          x: [0, -100, 0],
          y: [0, 100, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear",
          delay: 2,
        }}
        className="absolute top-[20%] right-[-10%] h-[600px] w-[600px] rounded-full bg-purple-500/10 blur-[120px]"
      />
      
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          x: [0, 50, 0],
          y: [0, -50, 0],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "linear",
          delay: 5,
        }}
        className="absolute bottom-[-10%] left-[20%] h-[700px] w-[700px] rounded-full bg-indigo-500/10 blur-[120px]"
      />
      
      {/* Grid Overlay */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
    </div>
  );
};
