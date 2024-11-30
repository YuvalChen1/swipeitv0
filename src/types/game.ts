export enum BlockAction {
    SWIPE_LEFT = 'SWIPE_LEFT',
    SWIPE_RIGHT = 'SWIPE_RIGHT',
    SWIPE_UP = 'SWIPE_UP',
    SWIPE_DOWN = 'SWIPE_DOWN',
    TAP = 'TAP',
    DOUBLE_TAP = 'DOUBLE_TAP',
    AVOID = 'AVOID'
  }
  
  export interface Block {
    id: string;
    action: BlockAction;
    color: string;
    icon: string;
    position: {
      x: number;
      y: number;
    };
    originalIndex: number;
  }