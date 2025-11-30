"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

interface AnimatedContainerProps {
  children: ReactNode;
  className?: string;
  initial?: any;
  animate?: any;
  exit?: any;
  transition?: any;
}

/**
 * Standard animation container for consistent motion patterns
 */
export function AnimatedContainer({
  children,
  className,
  initial = { opacity: 0, y: 20 },
  animate = { opacity: 1, y: 0 },
  exit = { opacity: 0, scale: 0.95 },
  transition = { duration: 0.2 },
  ...props
}: AnimatedContainerProps) {
  return (
    <motion.div
      className={className}
      initial={initial}
      animate={animate}
      exit={exit}
      transition={transition}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface AnimatedListProps {
  children: ReactNode;
  className?: string;
}

/**
 * List container with staggered animations
 */
export function AnimatedList({ children, className }: AnimatedListProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.1,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

interface AnimatedListItemProps {
  children: ReactNode;
  className?: string;
}

/**
 * List item with slide-in animation
 */
export function AnimatedListItem({ children, className }: AnimatedListItemProps) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Modal/Drawer animation wrapper
 */
export function AnimatedModal({ children, className }: AnimatedContainerProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Hover animation for cards and buttons
 */
export function AnimatedHover({ children, className }: AnimatedContainerProps) {
  return (
    <motion.div
      className={className}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      {children}
    </motion.div>
  );
}
