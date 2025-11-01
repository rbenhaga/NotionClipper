// packages/ui/src/components/common/MotionWrapper.tsx
import { forwardRef, useRef, useImperativeHandle } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

// Types pour les props motion
type MotionDivProps = HTMLMotionProps<"div">;
type MotionButtonProps = HTMLMotionProps<"button">;
type MotionMainProps = HTMLMotionProps<"main">;
type MotionAsideProps = HTMLMotionProps<"aside">;

// Solution définitive pour AnimatePresence - évite complètement les erreurs de ref
export const MotionDiv = forwardRef<HTMLDivElement, MotionDivProps>((props, ref) => {
  const internalRef = useRef<HTMLDivElement>(null);
  
  useImperativeHandle(ref, () => internalRef.current!, []);
  
  return <motion.div {...props} ref={internalRef} />;
});
MotionDiv.displayName = 'MotionDiv';

export const MotionButton = forwardRef<HTMLButtonElement, MotionButtonProps>((props, ref) => {
  const internalRef = useRef<HTMLButtonElement>(null);
  
  useImperativeHandle(ref, () => internalRef.current!, []);
  
  return <motion.button {...props} ref={internalRef} />;
});
MotionButton.displayName = 'MotionButton';

export const MotionMain = forwardRef<HTMLElement, MotionMainProps>((props, ref) => {
  const internalRef = useRef<HTMLElement>(null);
  
  useImperativeHandle(ref, () => internalRef.current!, []);
  
  return <motion.main {...props} ref={internalRef} />;
});
MotionMain.displayName = 'MotionMain';

export const MotionAside = forwardRef<HTMLElement, MotionAsideProps>((props, ref) => {
  const internalRef = useRef<HTMLElement>(null);
  
  useImperativeHandle(ref, () => internalRef.current!, []);
  
  return <motion.aside {...props} ref={internalRef} />;
});
MotionAside.displayName = 'MotionAside';