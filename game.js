// ultra-snake - Phaser.js Game

let snake, food, cursors, obstacles, powerups;
let score = 0, scoreText, gameOver = false;
let direction = 'right', nextDirection = 'right';
let gridSize = 20, tileCount = 25;
let lastMoveTime = 0, moveDelay = 150;
let powerupActive = false, powerupTimer = 0;

function preload() {
    // Create simple textures programmatically
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    
    // Snake body texture (green square)
    graphics.fillStyle(0x00ff00);
    graphics.fillRect(0, 0, gridSize, gridSize);
    graphics.generateTexture('snakeBody', gridSize, gridSize);
    
    // Food texture (red circle)
    graphics.clear();
    graphics.fillStyle(0xff0000);
    graphics.fillCircle(gridSize/2, gridSize/2, gridSize/2);
    graphics.generateTexture('food', gridSize, gridSize);
    
    // Powerup texture (yellow star)
    graphics.clear();
    graphics.fillStyle(0xffff00);
    const star = new Phaser.Geom.Polygon([
        gridSize/2, 0,
        gridSize*0.65, gridSize*0.35,
        gridSize, gridSize*0.35,
        gridSize*0.75, gridSize*0.6,
        gridSize*0.85, gridSize,
        gridSize/2, gridSize*0.8,
        gridSize*0.15, gridSize,
        gridSize*0.25, gridSize*0.6,
        0, gridSize*0.35,
        gridSize*0.35, gridSize*0.35
    ]);
    graphics.fillPoints(star.points);
    graphics.generateTexture('powerup', gridSize, gridSize);
    
    // Obstacle texture (gray square)
    graphics.clear();
    graphics.fillStyle(0x666666);
    graphics.fillRect(0, 0, gridSize, gridSize);
    graphics.generateTexture('obstacle', gridSize, gridSize);
}

function create() {
    // Background
    this.cameras.main.setBackgroundColor('#1a1a2e');
    
    // Create snake group
    snake = this.add.group();
    
    // Create initial snake (3 segments)
    for (let i = 0; i < 3; i++) {
        const segment = this.add.image((10 - i) * gridSize, 10 * gridSize, 'snakeBody');
        snake.add(segment);
    }
    
    // Create food
    food = this.add.image(0, 0, 'food');
    placeFood.call(this);
    
    // Create obstacles group
    obstacles = this.add.group();
    createObstacles.call(this);
    
    // Create powerups group
    powerups = this.add.group();
    this.time.addEvent({ delay: 10000, callback: spawnPowerup, callbackScope: this, loop: true });
    
    // Controls
    cursors = this.input.keyboard.createCursorKeys();
    
    // Score text
    scoreText = this.add.text(16, 16, 'Score: 0', {
        fontSize: '24px',
        fill: '#ffffff',
        fontFamily: 'Arial'
    });
    
    // Instructions text
    this.add.text(16, 50, 'Arrow keys to move\nAvoid obstacles\nCollect powerups!', {
        fontSize: '16px',
        fill: '#ffffff',
        fontFamily: 'Arial'
    });
}

function update(time) {
    if (gameOver) return;
    
    // Handle input for next direction
    if (cursors.left.isDown && direction !== 'right') nextDirection = 'left';
    else if (cursors.right.isDown && direction !== 'left') nextDirection = 'right';
    else if (cursors.up.isDown && direction !== 'down') nextDirection = 'up';
    else if (cursors.down.isDown && direction !== 'up') nextDirection = 'down';
    
    // Move snake based on time delay
    if (time - lastMoveTime > moveDelay) {
        direction = nextDirection;
        moveSnake.call(this);
        lastMoveTime = time;
    }
    
    // Update powerup timer
    if (powerupActive) {
        powerupTimer -= 16;
        if (powerupTimer <= 0) {
            powerupActive = false;
            moveDelay = 150; // Reset speed
        }
    }
}

function moveSnake() {
    const snakeArray = snake.getChildren();
    const head = snakeArray[0];
    
    // Calculate new head position
    let newX = head.x;
    let newY = head.y;
    
    switch (direction) {
        case 'left': newX -= gridSize; break;
        case 'right': newX += gridSize; break;
        case 'up': newY -= gridSize; break;
        case 'down': newY += gridSize; break;
    }
    
    // Check wall collision
    if (newX < 0 || newX >= tileCount * gridSize || newY < 0 || newY >= tileCount * gridSize) {
        gameOver = true;
        this.add.text(400, 300, 'GAME OVER', {
            fontSize: '48px',
            fill: '#ff0000',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        return;
    }
    
    // Check self collision
    for (let segment of snakeArray) {
        if (segment.x === newX && segment.y === newY) {
            gameOver = true;
            this.add.text(400, 300, 'GAME OVER', {
                fontSize: '48px',
                fill: '#ff0000',
                fontFamily: 'Arial'
            }).setOrigin(0.5);
            return;
        }
    }
    
    // Check obstacle collision
    const obstaclesArray = obstacles.getChildren();
    for (let obstacle of obstaclesArray) {
        if (obstacle.x === newX && obstacle.y === newY) {
            gameOver = true;
            this.add.text(400, 300, 'GAME OVER', {
                fontSize: '48px',
                fill: '#ff0000',
                fontFamily: 'Arial'
            }).setOrigin(0.5);
            return;
        }
    }
    
    // Create new head
    const newHead = this.add.image(newX, newY, 'snakeBody');
    snake.add(newHead, 0);
    
    // Check food collision
    if (newX === food.x && newY === food.y) {
        score += 10;
        scoreText.setText('Score: ' + score);
        placeFood.call(this);
        
        // Speed up slightly
        if (moveDelay > 50) moveDelay -= 2;
    } else {
        // Remove tail if no food eaten
        const tail = snakeArray.pop();
        tail.destroy();
    }
    
    // Check powerup collision
    const powerupsArray = powerups.getChildren();
    for (let i = powerupsArray.length - 1; i >= 0; i--) {
        const powerup = powerupsArray[i];
        if (powerup.x === newX && powerup.y === newY) {
            powerup.destroy();
            score += 50;
            scoreText.setText('Score: ' + score);
            activatePowerup.call(this);
            break;
        }
    }
}

function placeFood() {
    let validPosition = false;
    let x, y;
    
    while (!validPosition) {
        x = Math.floor(Math.random() * tileCount) * gridSize;
        y = Math.floor(Math.random() * tileCount) * gridSize;
        validPosition = true;
        
        // Check collision with snake
        const snakeArray = snake.getChildren();
        for (let segment of snakeArray) {
            if (segment.x === x && segment.y === y) {
                validPosition = false;
                break;
            }
        }
        
        // Check collision with obstacles
        const obstaclesArray = obstacles.getChildren();
        for (let obstacle of obstaclesArray) {
            if (obstacle.x === x && obstacle.y === y) {
                validPosition = false;
                break;
            }
        }
    }
    
    food.setPosition(x, y);
}

function createObstacles() {
    const numObstacles = 8;
    
    for (let i = 0; i < numObstacles; i++) {
        let validPosition = false;
        let x, y;
        
        while (!validPosition) {
            x = Math.floor(Math.random() * tileCount) * gridSize;
            y = Math.floor(Math.random() * tileCount) * gridSize;
            validPosition = true;
            
            // Avoid center area
            if (x > 9 * gridSize && x < 15 * gridSize && y > 9 * gridSize && y < 15 * gridSize) {
                validPosition = false;
                continue;
            }
            
            // Check collision with food
            if (x === food.x && y === food.y) {
                validPosition = false;
            }
        }
        
        const obstacle = this.add.image(x, y, 'obstacle');
        obstacles.add(obstacle);
    }
}

function spawnPowerup() {
    if (powerups.getChildren().length > 0 || gameOver) return;
    
    let validPosition = false;
    let x, y;
    
    while (!validPosition) {
        x = Math.floor(Math.random() * tileCount) * gridSize;
        y = Math.floor(Math.random() * tileCount) * gridSize;
        validPosition = true;
        
        // Check collision with snake
        const snakeArray = snake.getChildren();
        for (let segment of snakeArray) {
            if (segment.x === x && segment.y === y) {
                validPosition = false;
                break;
            }
        }
        
        // Check collision with obstacles
        const obstaclesArray = obstacles.getChildren();
        for (let obstacle of obstaclesArray) {
            if (obstacle.x === x && obstacle.y === y) {
                validPosition = false;
                break;
            }
        }
        
        // Check collision with food
        if (x === food.x && y === food.y) {
            validPosition = false;
        }
    }
    
    const powerup = this.add.image(x, y, 'powerup');
    powerups.add(powerup);
    
    // Remove powerup after 5 seconds if not collected
    this.time.delayedCall(5000, () => {
        if (powerup.active) {
            powerup.destroy();
        }
    });
}

function activatePowerup() {
    powerupActive = true;
    powerupTimer = 5000; // 5 seconds
    moveDelay = 75; // Double speed
}

// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 500,
    height: 500,
    parent: 'game-container',
    backgroundColor: '#1a1a2e',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: { preload, create, update }
};

// Initialize game
const game = new Phaser.Game(config);