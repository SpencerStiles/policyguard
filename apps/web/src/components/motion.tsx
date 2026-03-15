"use client";

import {
  motion,
  type HTMLMotionProps,
  type Variants,
} from "framer-motion";
// HTMLMotionProps used for MotionButton/MotionCard prop typing
import { type ReactNode } from "react";

// ─── Spring presets ──────────────────────────────────────────────────────────

const snappy = { type: "spring", stiffness: 400, damping: 30 } as const;
const gentle = { type: "spring", stiffness: 200, damping: 25 } as const;

// ─── Stagger container ───────────────────────────────────────────────────────

const staggerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.04,
    },
  },
};

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function StaggerContainer({
  children,
  className,
  delay = 0,
}: StaggerContainerProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.04,
            delayChildren: delay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

// ─── Fade-up child item ───────────────────────────────────────────────────────

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: gentle,
  },
};

interface FadeInProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function FadeIn({ children, className, delay }: FadeInProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={
        delay !== undefined
          ? {
              hidden: { opacity: 0, y: 12 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { ...gentle, delay },
              },
            }
          : fadeUpVariants
      }
    >
      {children}
    </motion.div>
  );
}

// Used as a direct child of StaggerContainer — must pass variants prop
export function FadeUpItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={fadeUpVariants} className={className}>
      {children}
    </motion.div>
  );
}

// ─── Motion button (press feedback) ──────────────────────────────────────────

interface MotionButtonProps extends HTMLMotionProps<"button"> {
  children: ReactNode;
}

export function MotionButton({ children, ...props }: MotionButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.97, transition: snappy }}
      transition={snappy}
      {...props}
    >
      {children}
    </motion.button>
  );
}

// ─── Motion link wrapper (for clickable cards / rows) ───────────────────────

interface MotionCardProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
}

export function MotionCard({ children, ...props }: MotionCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.005, y: -1 }}
      whileTap={{ scale: 0.985, transition: snappy }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
