import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.min.js';

const EXOPLANET_ID = "Earth";
const MAG_CUTOFF = 9;

// Scene setup
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 0); // Position the camera at the origin
camera.lookAt(new THREE.Vector3(1, 0, 0)); // Look towards the origin

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('scene-container').appendChild(renderer.domElement);

// Create star sphere
const starSphereGeometry = new THREE.SphereGeometry(500, 64, 64);
const starSphereTexture = new THREE.TextureLoader().load('assets/milky_way_texture.jpg');
const starSphereMaterial = new THREE.MeshBasicMaterial({
    map: starSphereTexture,
    side: THREE.BackSide
});
const starSphere = new THREE.Mesh(starSphereGeometry, starSphereMaterial);
scene.add(starSphere);

// Raycaster and mouse vector for detecting clicks
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let stars = []; // To store star data and meshes

// Fetch stars from API
async function fetchStarsPage(tableName, page = 1, perPage = 10, magCutoff = 10) {
    try {
        const url = new URL('http://localhost:5000/api/stars');
        url.searchParams.append('table', tableName);
        url.searchParams.append('page', page);
        url.searchParams.append('per_page', perPage);

        // Add mag_cutoff to the URL if it's provided
        if (magCutoff !== null) {
            url.searchParams.append('mag_cutoff', magCutoff);
        }

        const response = await fetch(url);
        const data = await response.json();

        return {
            stars: data.data,
            pagination: data.pagination
        };
    } catch (error) {
        console.error('Error fetching stars:', error);
        return { error: 'Error fetching stars' };
    }
}

// Load stars iteratively
async function loadStars(tableName, perPage = 10) {
    let currentPage = 1;
    let totalPages = 1;

    while (currentPage <= totalPages) {
        const starData = await fetchStarsPage(tableName, currentPage, perPage, MAG_CUTOFF);

        if (!Array.isArray(starData.stars)) {
            console.error('Invalid star data format');
            break;
        }

        totalPages = starData.pagination.total_pages || 1;

        const starGeometry = new THREE.SphereGeometry(1, 8, 8);
        const boundingGeometry = new THREE.SphereGeometry(6, 8, 8);
        const starMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff });
        const boundingMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, opacity: 0, transparent: true });

        starData.stars.forEach(star => {
            const ra = THREE.MathUtils.degToRad(star.ra);
            const dec = THREE.MathUtils.degToRad(star.dec);

            const x = Math.cos(dec) * Math.cos(ra);
            const z = Math.cos(dec) * Math.sin(ra);
            const y = Math.sin(dec);

            const starMesh = new THREE.Mesh(starGeometry, starMaterial);
            starMesh.position.set(x * 450, y * 450, z * 450);

            const boundingMesh = new THREE.Mesh(boundingGeometry, boundingMaterial);
            boundingMesh.position.copy(starMesh.position);

            scene.add(starMesh);
            scene.add(boundingMesh);

            stars.push({ mesh: boundingMesh, name: star.GaiaID });
        });

        currentPage++;
    }
}

// Initial star loading
loadStars(EXOPLANET_ID, 1);

// Handle mouse interactions
function onMouseClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(stars.map(star => star.mesh));

    if (intersects.length > 0) {
        const intersectedStar = intersects[0].object;
        const star = stars.find(star => star.mesh === intersectedStar);
        if (star) {
            console.log(`Star Name: ${star.name}`);
        }
    }
}

// Add reference points to the scene
function addReferencePoint(x, y, z, color) {
    const pointGeometry = new THREE.SphereGeometry(1, 8, 8);
    const pointMaterial = new THREE.MeshBasicMaterial({ color: color });
    const pointMesh = new THREE.Mesh(pointGeometry, pointMaterial);
    pointMesh.position.set(x, y, z);
    scene.add(pointMesh);
}

// Create reference points
addReferencePoint(100, 0, 0, 0xff0000); // Red point on the X axis
addReferencePoint(0, 100, 0, 0x00ff00); // Green point on the Y axis
addReferencePoint(0, 0, 100, 0x0000ff); // Blue point on the Z axis

// Mouse interaction variables
let isDragging = false;
let prevMouseX = 0;
let prevMouseY = 0;
const baseRotationSpeed = 0.001;

const quaternion = new THREE.Quaternion();
const rotation = new THREE.Euler(0, 3/2 * Math.PI, 0, 'YXZ');

// Mouse event listeners
function onMouseWheel(event) {
    const zoomSpeed = 0.01;
    camera.fov += event.deltaY * zoomSpeed;
    camera.fov = Math.max(Math.min(camera.fov, 80), 1);
    camera.updateProjectionMatrix();
}

function onMouseDown(event) {
    isDragging = true;
    prevMouseX = event.clientX;
    prevMouseY = event.clientY;
}

function onMouseMove(event) {
    if (!isDragging) return;

    const deltaX = event.clientX - prevMouseX;
    const deltaY = event.clientY - prevMouseY;

    const rotationSpeed = baseRotationSpeed * (camera.fov / 75);

    rotation.y -= deltaX * rotationSpeed * -1;
    rotation.x -= deltaY * rotationSpeed * -1;

    rotation.x = Math.max(Math.min(rotation.x, Math.PI / 2), -Math.PI / 2);

    quaternion.setFromEuler(rotation);
    camera.quaternion.copy(quaternion);

    prevMouseX = event.clientX;
    prevMouseY = event.clientY;
}

function onMouseUp() {
    isDragging = false;
}

window.addEventListener('click', onMouseClick);
window.addEventListener('mousedown', onMouseDown);
window.addEventListener('mousemove', onMouseMove);
window.addEventListener('mouseup', onMouseUp);
window.addEventListener('wheel', onMouseWheel);

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

animate();

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
