import { useState } from 'react';
import styles from './GameOver.module.css';
import ScoreBoard from './ScoreBoard';

interface GameOverProps {
  score: number;
  onRestart: () => void;
}

export default function GameOver({ score, onRestart }: GameOverProps) {
  const [showScoreboard, setShowScoreboard] = useState(false);

  if (showScoreboard) {
    return (
      <ScoreBoard 
        currentScore={score} 
        onBack={() => setShowScoreboard(false)} 
      />
    );
  }

  return (
    <div className={styles.gameOver}>
      <h1>Game Over!</h1>
      <p>Final Score: {score}</p>
      <div className={styles.buttonContainer}>
        <button onClick={onRestart}>
          Play Again
        </button>
        <button onClick={() => setShowScoreboard(true)}>
          View Leaderboard
        </button>
      </div>
    </div>
  );
} 