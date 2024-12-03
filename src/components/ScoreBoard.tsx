import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, Medal, Award, Edit2, Check, X } from "lucide-react";
import { db } from "../firebase/firebase";
import { getDocs, collection, doc,setDoc } from "firebase/firestore";
import styles from './ScoreBoard.module.css';

interface Score {
  id: string;
  userId: string;
  player: string;
  score: number;
}

interface UserStats extends Score {
  rank: number;
}

export default function ScoreBoard({ onBack = () => {}, currentScore = 0 }) {
  const [scores, setScores] = useState<Score[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const scoreRef = useRef<HTMLDivElement>(null);
  const userScoreRef = useRef<HTMLDivElement>(null);

  const generatePlayerName = () => `Player-${Math.floor(100000 + Math.random() * 900000)}`;

  useEffect(() => {
    const fetchScores = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        
        const newScores = usersSnapshot.docs.map((doc) => ({
          id: doc.id,
          userId: doc.id,
          player: doc.data().username || generatePlayerName(),
          score: doc.data().highScore || 0,
        }));

        const userId = 'current-user';
        const existingUserScore = newScores.find(score => score.userId === userId);
        
        if (!existingUserScore || currentScore > existingUserScore.score) {
          await setDoc(doc(db, "users", userId), {
            username: existingUserScore?.player || generatePlayerName(),
            highScore: currentScore,
          });

          if (existingUserScore) {
            existingUserScore.score = currentScore;
          } else {
            newScores.push({
              id: userId,
              userId,
              player: generatePlayerName(),
              score: currentScore,
            });
          }
        }

        newScores.sort((a, b) => b.score - a.score);

        const userPosition = newScores.findIndex(score => score.userId === userId);
        if (userPosition !== -1) {
          setUserStats({
            rank: userPosition + 1,
            ...newScores[userPosition],
          });
          
          // Set initial name for editing
          setNewName(newScores[userPosition].player);
        }

        setScores(newScores.slice(0, 50));

        // Scroll to user's position after a short delay
        setTimeout(() => {
          if (userScoreRef.current) {
            userScoreRef.current.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
          }
        }, 500);
      } catch (error) {
        console.error("Error fetching scores:", error);
      }
    };

    fetchScores();
  }, [currentScore]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only alphanumeric characters and hyphens, max 15 characters
    if (value.length <= 15 && /^[a-zA-Z0-9-]*$/.test(value)) {
      setNewName(value);
    }
  };

  const handleNameSubmit = async () => {
    if (!newName.trim() || !userStats) return;

    try {
      await setDoc(doc(db, "users", userStats.userId), {
        username: newName,
        highScore: userStats.score,
      });

      setUserStats(prev => prev ? { ...prev, player: newName } : null);
      setScores(prev => prev.map(score => 
        score.userId === userStats.userId 
          ? { ...score, player: newName }
          : score
      ));
      setIsEditingName(false);
    } catch (error) {
      console.error("Error updating name:", error);
    }
  };

  const getRankIcon = (rank: number) => {
    const iconSize = 24;
    
    switch (rank) {
      case 1:
        return <Trophy size={iconSize} className={styles.rankIconFirst} />;
      case 2:
        return <Medal size={iconSize} className={styles.rankIconSecond} />;
      case 3:
        return <Award size={iconSize} className={styles.rankIconThird} />;
      default:
        return (
          <span className={styles.rankNumber}>
            {rank}
          </span>
        );
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.scoreboardCard}>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={styles.backButton}
          onClick={onBack}
        >
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 min-w-[20px] min-h-[20px] max-w-[28px] max-h-[28px]" />
        </motion.button>

        <h1 className={styles.title}>
          Leaderboard
        </h1>

        {userStats && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={styles.userStatsCard}
          >
            <div className={styles.scoreItemContent}>
              <div className={styles.scoreLeftSection}>
                <div className={styles.rankNumber}>
                  #{userStats.rank}
                </div>
                <div className={styles.playerInfo}>
                  {isEditingName ? (
                    <div className={styles.nameEditContainer}>
                      <input
                        type="text"
                        value={newName}
                        onChange={handleNameChange}
                        className={styles.nameInput}
                        autoFocus
                        placeholder="Enter name"
                      />
                      <button 
                        onClick={handleNameSubmit}
                        className={styles.editButton}
                      >
                        <Check size={16} />
                      </button>
                      <button 
                        onClick={() => setIsEditingName(false)}
                        className={styles.cancelButton}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className={styles.nameDisplay}>
                      <h2>{userStats.player}</h2>
                      <button 
                        onClick={() => setIsEditingName(true)}
                        className={styles.editButton}
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
                  )}
                  <p>Your Ranking</p>
                </div>
              </div>
              <div className={styles.score}>
                {userStats.score.toLocaleString()}
              </div>
            </div>
          </motion.div>
        )}

        <div className={styles.scoreList} ref={scoreRef}>
          {scores.map((score, index) => (
            <motion.div
              key={score.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`${styles.scoreItem} ${
                score.userId === 'current-user' ? styles.currentUser : styles.otherUser
              }`}
              ref={score.userId === 'current-user' ? userScoreRef : null}
            >
              <div className={styles.scoreItemContent}>
                <div className={styles.scoreLeftSection}>
                  <div className={styles.rankContainer}>
                    {getRankIcon(index + 1)}
                  </div>
                  <span className={styles.playerName}>
                    {score.player}
                  </span>
                </div>
                <div className={styles.scoreValue}>
                  {score.score.toLocaleString()}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
} 