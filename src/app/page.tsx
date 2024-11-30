'use client';

import { useState, useEffect } from 'react';
import { Block, BlockAction } from '@/types/game';
import styles from './page.module.css';

export default function Game() {
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(6);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [blockTimers, setBlockTimers] = useState<Record<string, number>>({});
  const [activeAnimations, setActiveAnimations] = useState<Record<string, string>>({});
  // const [swipePosition, setSwipePosition] = useState<Record<string, { x: number, y: number }>>({});
  const [animatingBlocks, setAnimatingBlocks] = useState<Set<string>>(new Set());
  const [bonusNotification, setBonusNotification] = useState<{ points: number, visible: boolean }>({ points: 0, visible: false });

  // Add this function at the top of your component to calculate block width
  const getBlockDimensions = () => {
    const windowWidth = window.innerWidth;
    // For mobile devices (small screens)
    if (windowWidth < 768) {
      return {
        width: windowWidth * 0.9, // 90% of screen width
        height: 80
      };
    }
    // For larger screens
    return {
      width: windowWidth * 0.4, // 40% of screen width
      height: 80
    };
  };

  // Add back the colors object
  const colors = {
    [BlockAction.SWIPE_LEFT]: '#FF6B6B',
    [BlockAction.SWIPE_RIGHT]: '#4ECDC4',
    [BlockAction.SWIPE_UP]: '#45B7D1',
    [BlockAction.SWIPE_DOWN]: '#96CEB4',
    [BlockAction.TAP]: '#FFEEAD',
    [BlockAction.DOUBLE_TAP]: '#FFD93D',
    [BlockAction.AVOID]: '#000000',
  };

  // Simple icon getter
  const getIconForAction = (action: BlockAction): string => {
    const icons = {
      [BlockAction.SWIPE_LEFT]: '←',
      [BlockAction.SWIPE_RIGHT]: '→',
      [BlockAction.SWIPE_UP]: '↑',
      [BlockAction.SWIPE_DOWN]: '↓',
      [BlockAction.TAP]: '●',
      [BlockAction.DOUBLE_TAP]: '◎',
      [BlockAction.AVOID]: '✕',
    };
    return icons[action];
  };

  // Timer effect - main game timer
  useEffect(() => {
    // Don't run timer during tutorial or game over
    if (gameOver) return;
    
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 0) {
          setGameOver(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameOver]);

  // Remove bonus logic from handleBlockClear
  const handleBlockClear = (blockId: string) => {
    setBlocks(prev => {
      const newBlocks = prev.filter(b => b.id !== blockId);
      return newBlocks;
    });
  };

  // Update the effect that handles bonus awards and timer reset
  useEffect(() => {
    if (blocks.length === 0 && !gameOver) {
      const blockCount = getBlockCount(score);

      // Award bonus first
      awardTimeBonus(timer, blockCount);
      
      // Then reset timer
      setTimeout(() => {
        setTimer(6);
      }, 0);
    }
  }, [blocks.length, timer, score, gameOver]);

  // Update the bonus calculation
  const calculateTimeBonus = (remainingTime: number, totalBlockCount: number) => {
    // Only give time bonus for 9 or more blocks
    if (totalBlockCount < 2) return 0;

    if (remainingTime >= 4) return 50;
    if (remainingTime >= 3) return 30;
    if (remainingTime >= 2) return 10;
    return 0;
  };

  // Update the bonus award logic
  const awardTimeBonus = (remainingTime: number, blockCount: number) => {
    const bonus = calculateTimeBonus(remainingTime, blockCount);
    if (bonus > 0) {
      setScore(prev => prev + bonus);
      setBonusNotification({ points: bonus, visible: true });
      setTimeout(() => {
        setBonusNotification({ points: 0, visible: false });
      }, 1500);
    }
  };

  // Update block timers effect
  useEffect(() => {
    if (gameOver) return;
    
    const interval = setInterval(() => {
      setBlockTimers(prev => {
        const newTimers = { ...prev };
        blocks.forEach(block => {
          if (!(block.id in newTimers)) {
            newTimers[block.id] = block.action === BlockAction.AVOID ? 1.5 : 6;
          } else {
            newTimers[block.id] -= 0.1;
            if (newTimers[block.id] <= 0) {
              if (block.action === BlockAction.AVOID) {
                setScore(prev => prev + 5);
                setActiveAnimations(prev => ({ ...prev, [block.id]: styles.success }));
                setTimeout(() => handleBlockClear(block.id), 300);
              } else {
                setGameOver(true);
              }
              delete newTimers[block.id];
            }
          }
        });
        return newTimers;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [gameOver, blocks]);

  const getBlockCount = (score: number) => {
    if (score >= 1500) return 9;
    if (score >= 1000) return 7;
    if (score >= 700) return 6;
    if (score >= 500) return 5;
    if (score >= 300) return 4;
    if (score >= 200) return 3;
    if (score >= 50) return 2;
    return 1;
  };

  // Helper function to calculate block positions
  const calculateBlockPositions = (count: number) => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const { width: blockWidth, height: blockHeight } = getBlockDimensions();
    const verticalGap = 20;

    // Calculate center column
    const centerX = (windowWidth - blockWidth) / 2;
    
    // Calculate starting Y position for the first block
    const totalHeight = (count * blockHeight) + ((count - 1) * verticalGap);
    const startY = (windowHeight - totalHeight) / 2;

    // Return fixed positions
    const positions = [];
    for (let i = 0; i < count; i++) {
      positions.push({
        x: centerX,
        y: startY + (i * (blockHeight + verticalGap))
      });
    }
    return positions;
  };

  // Update block spawning effect
  useEffect(() => {
    if (gameOver) return;
    
    if (blocks.length === 0) {
      const blockCount = getBlockCount(score);
      const positions = calculateBlockPositions(blockCount);
      
      // Create all blocks at once with their fixed positions
      const newBlocks = positions.map((position, index) => {
        const actions = Object.values(BlockAction);
        const action = actions[Math.floor(Math.random() * actions.length)];
        
        return {
          id: Math.random().toString(36).substr(2, 9),
          action,
          color: colors[action],
          icon: getIconForAction(action),
          position: position,  // Use the exact position from the array
          originalIndex: index  // Add this to maintain position
        };
      });
      
      setBlocks(newBlocks);
    }
  }, [score, gameOver, blocks.length]);

  // Update handleBlockAction
  const handleBlockAction = (block: Block, action: BlockAction) => {
    if (block.action === BlockAction.AVOID) {
      setGameOver(true);
      return;
    }

    if (block.action === action) {
      setScore(prev => prev + 10);
      setTimeout(() => handleBlockClear(block.id), 500);
    }
  };

  // Update handleGesture
  const handleGesture = (block: Block, event: any, movement: [number, number]) => {
    if (!block.action.includes('SWIPE')) return;
    
    // Don't handle new gestures if block is being animated
    if (animatingBlocks.has(block.id)) return;

    const [x, y] = movement;
    const totalDistance = Math.sqrt(x * x + y * y);
    if (totalDistance < 20) return;

    let action;
    if (Math.abs(x) > Math.abs(y)) {
      action = x > 0 ? BlockAction.SWIPE_RIGHT : BlockAction.SWIPE_LEFT;
    } else {
      action = y > 0 ? BlockAction.SWIPE_DOWN : BlockAction.SWIPE_UP;
    }

    const isCorrectSwipe = action === block.action;

    // Mark block as animating
    setAnimatingBlocks(prev => new Set(prev).add(block.id));

    if (isCorrectSwipe) {
      const successAnimations: Record<BlockAction, string> = {
        [BlockAction.SWIPE_RIGHT]: styles.swipeRightSuccess,
        [BlockAction.SWIPE_LEFT]: styles.swipeLeftSuccess,
        [BlockAction.SWIPE_UP]: styles.swipeUpSuccess,
        [BlockAction.SWIPE_DOWN]: styles.swipeDownSuccess,
        [BlockAction.TAP]: '',
        [BlockAction.DOUBLE_TAP]: '',
        [BlockAction.AVOID]: ''
      };
      setActiveAnimations(prev => ({ ...prev, [block.id]: successAnimations[action] }));
      handleBlockAction(block, action);
      
      // Remove from animating after success animation
      setTimeout(() => {
        setAnimatingBlocks(prev => {
          const next = new Set(prev);
          next.delete(block.id);
          return next;
        });
      }, 500);
    } else {
      setActiveAnimations(prev => ({ ...prev, [block.id]: styles.swipeFail }));
      
      // Remove from animating after bounce animation
      setTimeout(() => {
        setActiveAnimations(prev => {
          const newAnimations = { ...prev };
          delete newAnimations[block.id];
          return newAnimations;
        });
        setAnimatingBlocks(prev => {
          const next = new Set(prev);
          next.delete(block.id);
          return next;
        });
      }, 500);
    }
  };

  // Update click handlers
  const onTap = (block: Block) => {
    if (block.action === BlockAction.TAP) {
      setActiveAnimations(prev => ({ ...prev, [block.id]: styles.tapping }));
      setTimeout(() => {
        setActiveAnimations(prev => ({ ...prev, [block.id]: styles.success }));
        handleBlockAction(block, BlockAction.TAP);
      }, 200);
    } else if (block.action === BlockAction.AVOID) {
      handleBlockAction(block, BlockAction.AVOID);
    }
  };

  // Add double tap handler
  const onDoubleTap = (block: Block) => {
    if (block.action === BlockAction.DOUBLE_TAP) {
      setActiveAnimations(prev => ({ ...prev, [block.id]: styles.tapping }));
      setTimeout(() => {
        setActiveAnimations(prev => ({ ...prev, [block.id]: styles.success }));
        handleBlockAction(block, BlockAction.DOUBLE_TAP);
      }, 200);
    }
  };

  if (gameOver) {
    return (
      <div className={styles.gameOver}>
        <h1>Game Over!</h1>
        <p>Final Score: {score}</p>
        <button onClick={() => {
          setScore(0);
          setTimer(6);
          setGameOver(false);
          setBlocks([]);
        }}>Play Again</button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header} style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'space-between',
        padding: '1rem',
        backgroundColor: '#000000',
        color: 'white',
        zIndex: 1000
      }}>
        <div className={styles.score} style={{ color: 'white', fontWeight: 'bold', fontSize: '1.2rem' }}>
          Score: {score}
        </div>
        <div className={styles.timer} style={{ color: 'white', fontWeight: 'bold', fontSize: '1.2rem' }}>
          Time: {timer}s
        </div>
      </header>
      
      {bonusNotification.visible && (
        <div className={styles.bonusNotification}>
          +{bonusNotification.points}
        </div>
      )}
      
      <div className={styles.gameArea}>
        {blocks.map((block) => (
          <div
            key={block.id}
            className={`${styles.block} ${activeAnimations[block.id] || ''} ${blockTimers[block.id] <= 1 ? styles.shake : ''}`}
            style={{
              backgroundColor: block.color,
              width: getBlockDimensions().width + 'px',
              height: getBlockDimensions().height + 'px',
              position: 'absolute',
              left: block.position.x,
              top: block.position.y,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              userSelect: 'none',
              touchAction: 'none',
              opacity: !activeAnimations[block.id] ? 
                (block.action === BlockAction.AVOID ? 
                  Math.min(blockTimers[block.id] / 2.5, 1) : 
                  Math.min(blockTimers[block.id] / 6, 1))
                : 1
            }}
            onMouseDown={(e) => {
              const startX = e.clientX;
              const startY = e.clientY;
              
              const handleMouseUp = (e: MouseEvent) => {
                const movement: [number, number] = [
                  e.clientX - startX,
                  e.clientY - startY
                ];
                handleGesture(block, e, movement);
                window.removeEventListener('mouseup', handleMouseUp);
              };
              
              window.addEventListener('mouseup', handleMouseUp);
            }}
            onClick={() => onTap(block)}
            onDoubleClick={() => onDoubleTap(block)}
          >
            {block.icon}
          </div>
        ))}
      </div>
    </div>
  );
}