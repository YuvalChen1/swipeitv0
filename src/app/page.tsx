'use client';

import { useState, useEffect } from 'react';
import { Block, BlockAction } from '@/types/game';
import styles from './page.module.css';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Circle,
  CircleDot,
  X,
  Heart,
  CircleDollarSign,
  Trophy,
  Clock,
} from "lucide-react";

// Add a scoring constant at the top of the component
const SCORE_VALUES = {
  [BlockAction.SWIPE_LEFT]: 10,
  [BlockAction.SWIPE_RIGHT]: 10,
  [BlockAction.SWIPE_UP]: 10,
  [BlockAction.SWIPE_DOWN]: 10,
  [BlockAction.TAP]: 10,
  [BlockAction.DOUBLE_TAP]: 10,
  [BlockAction.AVOID]: 10,
  [BlockAction.EXTRA_LIFE]: 10,
  [BlockAction.COINS]: 10,
} as const;

export default function Game() {
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(6.0);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [blockTimers, setBlockTimers] = useState<Record<string, number>>({});
  const [activeAnimations, setActiveAnimations] = useState<Record<string, string>>({});
  // const [swipePosition, setSwipePosition] = useState<Record<string, { x: number, y: number }>>({});
  const [animatingBlocks, setAnimatingBlocks] = useState<Set<string>>(new Set());
  const [bonusNotification, setBonusNotification] = useState<{ points: number, visible: boolean }>({ points: 0, visible: false });
  const [isTutorialComplete, setIsTutorialComplete] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tutorialComplete') === 'true';
    }
    return false;
  });
  const [tutorialStep, setTutorialStep] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [lives, setLives] = useState(0);

  // Add this function at the top of your component to calculate block width
  const getBlockDimensions = () => {
    // Check if window is available (client-side only)
    if (typeof window === 'undefined') {
      return {
        width: 0,
        height: 0,
        gap: 0,
        headerHeight: 60
      };
    }

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Calculate header height based on screen size
    const headerHeight = windowHeight < 600 ? 50 : 60;
    
    // Calculate available height (screen height minus header)
    const availableHeight = windowHeight - headerHeight;
    
    // For very small screens (like iPhone 4)
    if (windowHeight < 600) {
      return {
        width: windowWidth * 0.9,
        height: Math.min(availableHeight * 0.11, 75),
        gap: 5,
        headerHeight
      };
    }
    // For regular mobile screens
    else if (windowWidth < 768) {
      return {
        width: windowWidth * 0.9,
        height: Math.min(availableHeight * 0.115, 75),
        gap: 8,
        headerHeight
      };
    }
    // For larger screens
    return {
      width: windowWidth * 0.4,
      height: Math.min(availableHeight * 0.12, 75),
      gap: 12,
      headerHeight
    };
  };

  // Update colors object
  const colors = {
    [BlockAction.SWIPE_LEFT]: '#FF6B6B',
    [BlockAction.SWIPE_RIGHT]: '#4ECDC4',
    [BlockAction.SWIPE_UP]: '#45B7D1',
    [BlockAction.SWIPE_DOWN]: '#96CEB4',
    [BlockAction.TAP]: '#FFBE0B',
    [BlockAction.DOUBLE_TAP]: '#FF006E',
    [BlockAction.AVOID]: '#000000',
    [BlockAction.EXTRA_LIFE]: '#ff0000',
    [BlockAction.COINS]: '#22d65e',
  };

  // Update icon getter to use Lucide icons
  const getIconForAction = (action: BlockAction) => {
    const iconProps = { size: 32, color: 'white' };
    
    switch (action) {
      case BlockAction.SWIPE_LEFT:
        return <ArrowLeft {...iconProps} />;
      case BlockAction.SWIPE_RIGHT:
        return <ArrowRight {...iconProps} />;
      case BlockAction.SWIPE_UP:
        return <ArrowUp {...iconProps} />;
      case BlockAction.SWIPE_DOWN:
        return <ArrowDown {...iconProps} />;
      case BlockAction.TAP:
        return <Circle {...iconProps} />;
      case BlockAction.DOUBLE_TAP:
        return <CircleDot {...iconProps} />;
      case BlockAction.AVOID:
        return <X {...iconProps} />;
      case BlockAction.EXTRA_LIFE:
        return <Heart {...iconProps} />;
      case BlockAction.COINS:
        return <CircleDollarSign {...iconProps} />;
    }
  };

  // Timer effect - main game timer
  useEffect(() => {
    if (gameOver || !isTutorialComplete) return;
    
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 0) {
          setGameOver(true);
          return 0;
        }
        return Math.round((prev - 0.1) * 10) / 10; // Round to 1 decimal place
      });
    }, 100); // Update every 100ms instead of 1000ms

    return () => clearInterval(interval);
  }, [gameOver, isTutorialComplete]);

  // Remove bonus logic from handleBlockClear
  const handleBlockClear = (blockId: string) => {
    setBlocks(prev => {
      const newBlocks = prev.filter(b => b.id !== blockId);
      return newBlocks;
    });
  };

  // Move these functions up, before they're used
  const calculateTimeBonus = (remainingTime: number, totalBlockCount: number) => {
    if (totalBlockCount < 9) return 0;
    if (remainingTime >= 3.5) return 50;
    if (remainingTime >= 2.5) return 30;
    if (remainingTime >= 1.5) return 10;
    return 0;
  };

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

  // Now the useEffect that uses awardTimeBonus
  useEffect(() => {
    if (blocks.length === 0 && !gameOver) {
      const blockCount = getBlockCount(score);
      awardTimeBonus(timer, blockCount);
      setTimeout(() => {
        setTimer(6);
      }, 0);
    }
  }, [blocks.length, timer, score, gameOver]);

  // Update block timers effect to ignore tutorial blocks
  useEffect(() => {
    if (gameOver) return;
    
    const interval = setInterval(() => {
      setBlockTimers(prev => {
        const newTimers = { ...prev };
        blocks.forEach(block => {
          // Skip timer for tutorial blocks
          if (block.isTutorial) return;

          if (!(block.id in newTimers)) {
            newTimers[block.id] = block.action === BlockAction.AVOID ? 2 : 6;
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
    if (score >= 100) return 9;
    if (score >= 75) return 7;
    if (score >= 60) return 6;
    if (score >= 50) return 5;
    if (score >= 40) return 4;
    if (score >= 25) return 3;
    if (score >= 10) return 2;
    return 1;
  };

  // Helper function to calculate block positions
  const calculateBlockPositions = (count: number) => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const { width: blockWidth, height: blockHeight, gap } = getBlockDimensions();

    // Calculate center column
    const centerX = (windowWidth - blockWidth) / 2;
    
    // Add extra margin-top for small screens
    const marginTop = windowHeight < 850 ? 20 : 0;
    
    // Calculate starting Y position for the first block
    const totalHeight = (count * blockHeight) + ((count - 1) * gap);
    const startY = ((windowHeight - totalHeight) / 2) + marginTop;

    // Return fixed positions
    const positions = [];
    for (let i = 0; i < count; i++) {
      positions.push({
        x: centerX,
        y: startY + (i * (blockHeight + gap))
      });
    }
    return positions;
  };

  // Add tutorial blocks generator
  const getTutorialBlocks = (): Block[] => {
    const { width: blockWidth, height: blockHeight } = getBlockDimensions();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const centerX = (windowWidth - blockWidth) / 2;
    const centerY = (windowHeight - blockHeight) / 2;

    return [
      {
        id: 'tutorial-1',
        action: BlockAction.TAP,
        color: colors[BlockAction.TAP],
        icon: getIconForAction(BlockAction.TAP),
        position: { x: centerX, y: centerY },
        originalIndex: 0,
        isTutorial: true,
        tutorialText: 'Tap'
      },
      {
        id: 'tutorial-2',
        action: BlockAction.DOUBLE_TAP,
        color: colors[BlockAction.DOUBLE_TAP],
        icon: getIconForAction(BlockAction.DOUBLE_TAP),
        position: { x: centerX, y: centerY },
        originalIndex: 0,
        isTutorial: true,
        tutorialText: 'Double Tap'
      },
      {
        id: 'tutorial-3',
        action: BlockAction.SWIPE_LEFT,
        color: colors[BlockAction.SWIPE_LEFT],
        icon: getIconForAction(BlockAction.SWIPE_LEFT),
        position: { x: centerX, y: centerY },
        originalIndex: 0,
        isTutorial: true,
        tutorialText: 'Swipe Left'
      }
    ];
  };

  // Update block spawning effect
  useEffect(() => {
    if (gameOver) return;
    
    if (!isTutorialComplete) {
      setBlocks([getTutorialBlocks()[tutorialStep]]);
      return;
    }
    
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
  }, [score, gameOver, blocks.length, isTutorialComplete, tutorialStep, calculateBlockPositions, colors, getTutorialBlocks]);

  // Update handleBlockAction
  const handleBlockAction = (block: Block, action: BlockAction) => {
    if (block.action === BlockAction.AVOID) {
      // Add overlay to freeze game appearance
      const overlay = document.createElement('div');
      overlay.className = styles.gameFreeze;
      document.body.appendChild(overlay);

      // Add shatter effect with more shards
      const blockElement = document.querySelector(`[data-block-id="${block.id}"]`);
      if (blockElement) {
        // First, clone the current background color and icon color
        const currentColor = window.getComputedStyle(blockElement).backgroundColor;
        
        // Create a container for shatter pieces
        const shatterContainer = document.createElement('div');
        shatterContainer.className = styles.avoidShatter;
        shatterContainer.style.position = 'absolute';
        shatterContainer.style.inset = '0';
        shatterContainer.style.backgroundColor = currentColor;
        
        // Add shatter pieces to the container
        shatterContainer.innerHTML = '<span></span>'.repeat(6);
        
        // Apply the color to shatter pieces
        const shatterPieces = shatterContainer.querySelectorAll('span');
        shatterPieces.forEach(piece => {
          (piece as HTMLElement).style.backgroundColor = currentColor;
        });

        // Add the shatter container to the block
        blockElement.appendChild(shatterContainer);
        
        // Hide original content after a tiny delay to allow shatter animation to start
        setTimeout(() => {
          (blockElement as HTMLElement).style.backgroundColor = 'transparent';
          const icon = blockElement.querySelector('svg');
          if (icon) icon.style.opacity = '0';
        }, 50);
      }
      
      setActiveAnimations(prev => ({ ...prev, [block.id]: styles.avoidShatter }));
      
      // Make all blocks non-interactable
      const allBlocks = document.querySelectorAll(`.${styles.block}`);
      allBlocks.forEach(block => {
        (block as HTMLElement).style.pointerEvents = 'none';
      });

      // Store current timer value
      const currentTimer = timer;
      
      // Freeze timer updates
      const timerInterval = setInterval(() => {
        setTimer(currentTimer);
      }, 100);

      // Delay game over and remove overlay
      setTimeout(() => {
        clearInterval(timerInterval);
        document.body.removeChild(overlay);
        setGameOver(true);
      }, 2000);
      return;
    }

    if (block.action === action || 
        block.action === BlockAction.EXTRA_LIFE || 
        block.action === BlockAction.COINS) {
      
      // Handle special blocks
      if (block.action === BlockAction.COINS) {
        console.log('Coins block clicked!');
        setActiveAnimations(prev => ({ ...prev, [block.id]: styles.coinShatter }));
      } else if (block.action === BlockAction.EXTRA_LIFE) {
        console.log('Heart block clicked!');
        setActiveAnimations(prev => ({ ...prev, [block.id]: styles.heartShatter }));
        setLives(prev => prev + 1);
      }

      if (!isTutorialComplete) {
        if (tutorialStep < 2) {
          setTutorialStep(prev => prev + 1);
        } else {
          setIsTutorialComplete(true);
          localStorage.setItem('tutorialComplete', 'true');
          setTimer(6);
        }
      } else {
        setScore(prev => prev + SCORE_VALUES[block.action]);
      }
      
      setTimeout(() => handleBlockClear(block.id), 500);
    }
  };

  // Update handleGesture
  const handleGesture = (
    block: Block, 
    event: MouseEvent | TouchEvent, 
    movement: [number, number]
  ) => {
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
        [BlockAction.AVOID]: '',
        [BlockAction.EXTRA_LIFE]: '',
        [BlockAction.COINS]: ''
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
    if (block.action === BlockAction.TAP || 
        block.action === BlockAction.EXTRA_LIFE || 
        block.action === BlockAction.COINS) {
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

  // Update handleTouchStart to reset lastTapTime when touching different blocks
  const handleTouchStart = (e: React.TouchEvent, block: Block) => {
    const touch = e.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;
    
    const handleTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      const movement: [number, number] = [deltaX, deltaY];
      const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Handle double tap
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTapTime;
      
      if (tapLength < 300 && totalMovement < 10 && block.action === BlockAction.DOUBLE_TAP) {
        // Double tap detected
        onDoubleTap(block);
        setLastTapTime(0); // Reset after double tap
      } else if (totalMovement < 10) {
        // Single tap detected
        onTap(block);
        if (block.action === BlockAction.DOUBLE_TAP) {
          setLastTapTime(currentTime);
        } else {
          setLastTapTime(0); // Reset for non-double-tap blocks
        }
      } else {
        // Swipe detected
        handleGesture(block, e, movement);
        setLastTapTime(0); // Reset after swipe
      }

      window.removeEventListener('touchend', handleTouchEnd);
    };

    window.addEventListener('touchend', handleTouchEnd);
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
        alignItems: 'center',
        padding: '0.75rem',
        height: `${getBlockDimensions().headerHeight}px`,
        backgroundColor: 'rgb(17, 24, 39)', // bg-gray-900
        backdropFilter: 'blur(8px)',
        color: 'white',
        zIndex: 1000
      }}>
        <div className={styles.scoreContainer}>
          <Trophy size={24} color="#FCD34D" /> {/* text-yellow-300 */}
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
            {timer.toFixed(1)}s
          </span>
        </div>
      </header>
      
      {bonusNotification.visible && (
        <div className={styles.bonusNotification}>
          +{bonusNotification.points}
        </div>
      )}
      
      <div className={styles.gameArea} style={{
        paddingTop: `${getBlockDimensions().headerHeight}px`
      }}>
        {blocks.map((block) => (
          <div
            key={block.id}
            data-block-id={block.id}
            className={`${styles.block} ${activeAnimations[block.id] || ''} ${
              !block.isTutorial && blockTimers[block.id] <= 1.5 ? styles.shake : ''
            }`}
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
              opacity: !block.isTutorial ? 
                (!activeAnimations[block.id] ? 
                  (block.action === BlockAction.AVOID ? 
                    blockTimers[block.id] <= 1.5 ? // Start fade at 1.5 seconds for avoid blocks
                      blockTimers[block.id] / 1.5 : 1 : 
                    blockTimers[block.id] <= 1.5 ? // Start fade at 1.5 seconds for regular blocks
                      blockTimers[block.id] / 1.5 : 1)
                  : 1)
                : 1,
              fontSize: undefined, // Remove font-size as we're using SVG icons now
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
            onTouchStart={(e) => handleTouchStart(e, block)}
            onClick={() => onTap(block)}
            onDoubleClick={() => onDoubleTap(block)}
          >
            {getIconForAction(block.action)}
            {block.isTutorial && (
              <div className={styles.tutorialText}>
                {block.tutorialText}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}