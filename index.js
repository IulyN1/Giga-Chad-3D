let score = 0;
const scoreElem = document.getElementById('score');
let animationId;
let intervalId;
const playerSpeed = 1;

// Define keyboard state object
const keyboardState = {};
// Add event listeners for keydown and keyup events
window.addEventListener('keydown', (event) => {
	keyboardState[event.key] = true;
});
window.addEventListener('keyup', (event) => {
	keyboardState[event.key] = false;
});

// Set up the Three.js scene, camera and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
camera.position.set(0, 5, 10);

// Set up Cannon.js physics world
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);

// Create falling cube objects
const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cubes = [];
function spawnCube() {
	const newCubeMesh = new THREE.Mesh(cubeGeometry, cubeMaterial);
	newCubeMesh.position.x = Math.random() * 15 - 5;
	newCubeMesh.position.y = 10;
	scene.add(newCubeMesh);
	cubes.push(newCubeMesh);

	const newCubeShape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
	const newCubeBody = new CANNON.Body({ mass: 0.5, shape: newCubeShape });
	newCubeBody.position.copy(newCubeMesh.position);
	world.addBody(newCubeBody);

	newCubeMesh.userData.physicsBody = newCubeBody;
}

function addListeners() {
	document.addEventListener('visibilitychange', handleVisibilityChange);
}
function removeListeners() {
	document.removeEventListener('visibilitychange', handleVisibilityChange);
}
function handleVisibilityChange() {
	if (document.hidden) {
		stopInterval();
	} else {
		startInterval();
	}
}
function startInterval() {
	intervalId = setInterval(spawnCube, 2000);
}
function stopInterval() {
	clearInterval(intervalId);
}

addListeners();
startInterval();

// Create player object
const playerGeometry = new THREE.BoxGeometry(1, 1, 1);
const playerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
scene.add(playerMesh);

const playerShape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
const playerBody = new CANNON.Body({ mass: 1, shape: playerShape });
world.addBody(playerBody);

playerBody.linearDamping = 0.99; // Add linear damping to reduce bouncing
playerBody.angularDamping = 0.99; // Add angular damping to reduce spinning

// Check for collisions between the falling cubes and the player object
function checkCollisionsPlayer() {
	const playerBox = new THREE.Box3().setFromObject(playerMesh);
	for (let i = 0; i < cubes.length; i++) {
		const cubeBox = new THREE.Box3().setFromObject(cubes[i]);
		if (playerBox.intersectsBox(cubeBox)) {
			scene.remove(cubes[i]);
			world.removeBody(cubes[i].userData.physicsBody);
			cubes.splice(i, 1);
			i--;
			score++;
			scoreElem.innerHTML = 'Score: ' + score;
		}
	}
}

// Create ground object
const groundGeometry = new THREE.PlaneGeometry(20, 20, 1, 1);
const groundMaterial = new THREE.MeshPhongMaterial({ color: 0x999999 });
const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
groundMesh.rotation.x = -Math.PI / 2;
groundMesh.position.y = -1.5;
scene.add(groundMesh);

const groundShape = new CANNON.Plane();
const groundBody = new CANNON.Body({ mass: 0, shape: groundShape });
groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
world.addBody(groundBody);

// Create light
const light = new THREE.PointLight(0xffffff, 1, 100);
light.position.set(0, 10, 10);
scene.add(light);

function checkCollisionsGround() {
	for (let i = 0; i < cubes.length; i++) {
		if (cubes[i].position.y <= groundBody.position.y + cubes[i].geometry.parameters.height / 2) {
			// Cube has hit the ground, stop the game
			cancelAnimationFrame(animationId);
			alert('Game over!');
			removeListeners();
			return;
		}
	}
}

function animate() {
	world.step(1 / 60);

	addMovement();

	animationId = requestAnimationFrame(animate);

	// Update the position of the cube meshes based on their physics bodies
	for (let i = 0; i < cubes.length; i++) {
		const cubeMesh = cubes[i];
		const cubeBody = cubeMesh.userData.physicsBody;
		cubeMesh.position.copy(cubeBody.position);
		cubeMesh.quaternion.copy(cubeBody.quaternion);
	}

	// Check for collisions between the falling cubes and the player object and the ground
	checkCollisionsGround();
	checkCollisionsPlayer();

	// Update player position and rotation
	playerMesh.position.copy(playerBody.position);
	playerMesh.quaternion.copy(playerBody.quaternion);

	groundMesh.position.copy(groundBody.position);
	groundMesh.quaternion.copy(groundBody.quaternion);

	renderer.render(scene, camera);
}

animate();

function addMovement() {
	if (keyboardState['ArrowLeft']) {
		playerBody.applyImpulse(new CANNON.Vec3(-playerSpeed, 0, 0), playerBody.position);
	}
	if (keyboardState['ArrowRight']) {
		playerBody.applyImpulse(new CANNON.Vec3(playerSpeed, 0, 0), playerBody.position);
	}
}
