const player = document.getElementById('player');
const container = document.getElementById('game-container');
const scoreEl = document.getElementById('score');

let isJumping = false;
let position = 0;
let score = 0;
let gameSpeed = 6;

function jump() {
    if (isJumping) return;
    isJumping = true;
    
    let gravity = 0.9;
    let velocity = 15;
    
    let timerId = setInterval(() => {
        // Apply gravity
        velocity -= gravity;
        position += velocity;
        
        // Floor collision
        if (position <= 0) {
            position = 0;
            clearInterval(timerId);
            isJumping = false;
        }
        
        player.style.bottom = position + 'px';
    }, 20);
}

function createObstacle() {
    let obstaclePosition = 800;
    const obstacle = document.createElement('div');
    obstacle.classList.add('obstacle');
    container.appendChild(obstacle);
    obstacle.style.left = obstaclePosition + 'px';

    let timerId = setInterval(() => {
        // Collision detection
        if (obstaclePosition > 30 && obstaclePosition < 80 && position < 40) {
            clearInterval(timerId);
            alert('Game Over! Score: ' + score);
            location.reload();
        }
        
        obstaclePosition -= gameSpeed;
        obstacle.style.left = obstaclePosition + 'px';
        
        if (obstaclePosition < -30) {
            clearInterval(timerId);
            container.removeChild(obstacle);
            score++;
            scoreEl.innerText = 'Score: ' + score;
        }
    }, 20);
    
    setTimeout(createObstacle, Math.random() * 1500 + 1000);
}

document.addEventListener('keydown', (e) => { if(e.code === 'Space') jump(); });
document.addEventListener('click', jump);

createObstacle();
</script>