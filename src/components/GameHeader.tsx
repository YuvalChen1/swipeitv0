import { Trophy, Heart, Clock } from "lucide-react";
import { useEffect, useState } from 'react';
import styles from './GameHeader.module.css';

interface GameHeaderProps {
  score: number;
  lives: number;
  timer: number;
  headerHeight: number;
}

export default function GameHeader({ score, lives, timer, headerHeight }: GameHeaderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header 
      className={styles.header}
      style={mounted ? { '--header-height': `${headerHeight}px` } as React.CSSProperties : undefined}
    >
      <div className={styles.scoreContainer}>
        <Trophy size={24} color="#FCD34D" />
        <span className={styles.score}>
          {score}
        </span>
      </div>

      <div className={styles.livesContainer}>
        <Heart size={24} color="#EF4444" fill="#EF4444" />
        <span className={styles.lives}>
          {lives}
        </span>
      </div>

      <div className={styles.timerContainer}>
        <Clock size={24} color="#86EFAC" />
        <span className={styles.timer}>
          {Math.max(0, timer).toFixed(1)}s
        </span>
      </div>
    </header>
  );
} 