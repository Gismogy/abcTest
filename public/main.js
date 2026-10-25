// Main WebGPU Living Room Application
class WebGPULivingRoom {
    constructor() {
        this.canvas = document.getElementById('webgpu-canvas');
        this.device = null;
        this.context = null;
        this.format = null;
        this.scene = null;
        this.isRunning = false;
        this.keys = new Set();
        this.mouseState = { x: 0, y: 0, isDown: false };
        this.camera = {
            position: [0, 2, 5],
            rotation: [0, 0, 0],
            speed: 0.1,
            sensitivity: 0.002
        };
        this.stats = {
            fps: 0,
            frameCount: 0,
            lastTime: performance.now()
        };
        
        this.roomType = 'living';
        this.rooms = {
            living: { 
                name: 'Living Room', 
                color: [0.1, 0.1, 0.2],
                ambient: [0.1, 0.1, 0.1],
                fog: [0.1, 0.1, 0.2]
            },
            kitchen: { 
                name: 'Kitchen', 
                color: [0.2, 0.1, 0.1],
                ambient: [0.2, 0.15, 0.1],
                fog: [0.2, 0.1, 0.1]
            },
            bedroom: { 
                name: 'Bedroom', 
                color: [0.1, 0.1, 0.2],
                ambient: [0.1, 0.1, 0.15],
                fog: [0.1, 0.1, 0.2]
            },
            office: { 
                name: 'Office', 
                color: [0.1, 0.15, 0.15],
                ambient: [0.1, 0.1, 0.1],
                fog: [0.1, 0.15, 0.15]
            }
        };
        
        this.lights = [
            // Main lighting
            { type: 'point', position: [0, 3, 0], color: [1.0, 1.0, 1.0], intensity: 1.0 },
            // Ambient light
            { type: 'ambient', color: [0.2, 0.2, 0.2] },
        ];
        
        this.objects = [];
        this.furniture = [];
        this.particles = [];
        this.isFullscreen = false;
        
        this.init();
    }

    async init() {
        try {
            if (!navigator.gpu) {
                throw new Error('WebGPU not supported!');
            }

            const adapter = await navigator.gpu.requestAdapter({
                powerPreference: 'high-performance'
            });

            if (!adapter) {
                throw new Error('No WebGPU adapter found!');
            }

            this.device = await adapter.requestDevice({ 
                requiredFeatures: ['texture-compression-bc']
            });
            
            if (!this.device) {
                throw new Error('WebGPU device not created successfully');
            }

            this.context = this.canvas.getContext('webgpu');
            this.format = navigator.gpu.getPreferredCanvasFormat();
            
            this.context.configure({
                device: this.device,
                format: this.format,
                alphaMode: 'opaque'
            });

            // Set up canvas size
            this.resize();
            window.addEventListener('resize', () => this.resize());
            
            // Set up input listeners
            this.setupInputListeners();
            
            // Create the full scene with enhanced features
            await this.createFullScene();
            
            // Hide loading screen
            document.getElementById('loading').style.opacity = '0';
            setTimeout(() => {
                document.getElementById('loading').style.display = 'none';
            }, 500);
            
            // Start rendering
            this.isRunning = true;
            this.renderLoop();

            console.log('WebGPU Living Room initialized successfully!');
        } catch (error) {
            console.error('Failed to initialize WebGPU:', error);
            document.getElementById('loading-text').textContent = 
                `Error: ${error.message}. Make sure you're using a browser that supports WebGPU.`;
        }
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Update aspect ratio in the scene
        if (this.scene) {
            this.scene.aspectRatio = window.innerWidth / window.innerHeight;
        }
    }

    setupInputListeners() {
        // Keyboard input with Set for better performance
        window.addEventListener('keydown', (e) => {
            this.keys.add(e.key.toLowerCase());
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys.delete(e.key.toLowerCase());
        });
        
        // Mouse input
        this.canvas.addEventListener('mousedown', (e) => {
            this.mouseState.isDown = true;
            this.mouseState.x = e.clientX;
            this.mouseState.y = e.clientY;
            this.canvas.requestPointerLock();
        });
        
        window.addEventListener('mousemove', (e) => {
            if (this.mouseState.isDown) {
                const deltaX = e.movementX;
                const deltaY = e.movementY;
                
                this.camera.rotation[0] -= deltaX * this.camera.sensitivity;
                this.camera.rotation[1] -= deltaY * this.camera.sensitivity;
                
                // Limit vertical rotation
                this.camera.rotation[1] = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.camera.rotation[1]));
            }
        });
        
        window.addEventListener('mouseup', () => {
            this.mouseState.isDown = false;
        });
        
        // Mouse wheel for zoom
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomFactor = 0.1;
            this.camera.position[2] += e.deltaY * zoomFactor * 0.01;
        });
        
        // Room change button
        document.getElementById('change-room-btn').addEventListener('click', () => {
            const select = document.getElementById('room-select');
            this.roomType = select.value;
            this.createFullScene();
            document.getElementById('room-name').textContent = this.rooms[this.roomType].name;
        });
        
        // Fullscreen toggle
        document.addEventListener('fullscreenchange', () => {
            this.isFullscreen = !this.isFullscreen;
            this.resize();
        });
    }

    async createFullScene() {
        // Setup lighting based on room type
        this.configureLights();
        
        // Setup environment objects
        this.setupEnvironment();
        
        console.log(`Created ${this.roomType} scene with ${this.objects.length} objects`);
    }

    configureLights() {
        // Configure lights based on room type
        const lightCount = 3;
        const lightsArray = [];
        
        // Main light at the center of the room
        lightsArray.push({
            type: 0, // point light
            color: [1.0, 1.0, 1.0],
            position: [0, 3, 0],
            intensity: 1.0
        });
        
        // Secondary light for ambient effect
        lightsArray.push({
            type: 1, // ambient light  
            color: this.rooms[this.roomType].ambient,
            position: [0, 0, 0],
            intensity: 0.3
        });
        
        // Additional point lights for decoration
        if (this.roomType === 'living') {
            lightsArray.push({
                type: 0,
                color: [0.8, 0.6, 0.2],
                position: [2, 1, -2],
                intensity: 0.5
            });
        } else if (this.roomType === 'kitchen') {
            lightsArray.push({
                type: 0,
                color: [0.2, 0.8, 0.8],
                position: [-2, 1.5, 2],
                intensity: 0.7
            });
        }

        this.lights = lightsArray;
    }

    setupEnvironment() {
        // Reset objects
        this.objects = [];
        
        // Room dimensions
        const roomWidth = 8;
        const roomDepth = 6;
        const roomHeight = 4;
        
        // Add walls to the room
        this.addWall(-roomWidth/2, 0, -roomDepth/2, roomWidth, roomHeight, 0.2); // Back wall  
        this.addWall(roomWidth/2, 0, -roomDepth/2, 0.2, roomHeight, roomDepth);  // Right wall
        this.addWall(-roomWidth/2, 0, roomDepth/2, roomWidth, roomHeight, 0.2);   // Front wall
        this.addWall(-roomWidth/2, 0, -roomDepth/2, 0.2, roomHeight, roomDepth); // Left wall
        
        // Add floor and ceiling  
        this.addObject({
            type: 'floor',
            position: [0, -roomHeight/2, 0],
            size: [roomWidth, 0.2, roomDepth],
            color: [0.3, 0.3, 0.4]
        });
        
        this.addObject({
            type: 'ceiling',
            position: [0, roomHeight/2, 0],
            size: [roomWidth, 0.2, roomDepth],
            color: [0.6, 0.6, 0.7]
        });
        
        // Add furniture based on room type
        this.addFurniture();
        
        // Update stats
        document.getElementById('object-counter').textContent = this.objects.length;
        document.getElementById('room-name').textContent = this.rooms[this.roomType].name;
    }

    addWall(x, y, z, width, height, depth) {
        this.addObject({
            type: 'wall',
            position: [x, y, z],
            size: [width, height, depth],
            color: [0.7, 0.4, 0.3] // Different color for walls
        });
    }

    addFurniture() {
        const roomWidth = 8;
        const roomDepth = 6;
        
        switch(this.roomType) {
            case 'living':
                // Sofa
                this.addObject({
                    type: 'sofa',
                    position: [0, 0.5, -2],
                    size: [3, 1, 1.5],
                    color: [0.4, 0.3, 0.6]
                });
                
                // Coffee table
                this.addObject({
                    type: 'table',
                    position: [0, 0.8, -1],
                    size: [2, 0.3, 2],
                    color: [0.5, 0.4, 0.2]
                });
                
                // Bookshelf
                this.addObject({
                    type: 'bookshelf',
                    position: [-3, 1, 2],
                    size: [0.8, 3, 2],
                    color: [0.3, 0.2, 0.1]
                });
                
                // TV
                this.addObject({
                    type: 'tv',
                    position: [0, 1.5, -2.8],
                    size: [1.5, 0.8, 0.1],
                    color: [0.1, 0.1, 0.1]
                });
                
                break;
                
            case 'kitchen':
                // Kitchen counter
                this.addObject({
                    type: 'counter',
                    position: [0, 0.5, 0],
                    size: [6, 0.8, 4],
                    color: [0.2, 0.3, 0.4]
                });
                
                // Cabinets
                this.addObject({
                    type: 'cabinet',
                    position: [-2, 1.5, -2],
                    size: [1.5, 3, 1],
                    color: [0.6, 0.4, 0.1]
                });
                
                // Sink
                this.addObject({
                    type: 'sink',
                    position: [1.5, 0.3, -1],
                    size: [0.8, 0.2, 0.6],
                    color: [0.7, 0.7, 0.8]
                });
                
                break;
                
            case 'bedroom':
                // Bed
                this.addObject({
                    type: 'bed',
                    position: [0, 0.8, -2],
                    size: [3, 1.5, 2],
                    color: [0.4, 0.2, 0.3]
                });
                
                // Nightstand
                this.addObject({
                    type: 'nightstand',
                    position: [-1.5, 0.6, -0.5],
                    size: [0.8, 0.8, 0.8],
                    color: [0.5, 0.4, 0.3]
                });
                
                // Lamp
                this.addObject({
                    type: 'lamp',
                    position: [1.5, 1.2, -0.5],
                    size: [0.2, 0.8, 0.2],
                    color: [0.9, 0.9, 0.7]
                });
                
                break;
                
            case 'office':
                // Desk
                this.addObject({
                    type: 'desk',
                    position: [0, 0.6, -1.5],
                    size: [3, 0.8, 1.5],
                    color: [0.5, 0.3, 0.1]
                });
                
                // Chair
                this.addObject({
                    type: 'chair',
                    position: [0, 0.4, 0.5],
                    size: [0.6, 0.8, 0.6],
                    color: [0.2, 0.3, 0.5]
                });
                
                // Computer
                this.addObject({
                    type: 'computer',
                    position: [0, 0.9, -1.3],
                    size: [0.8, 0.3, 0.4],
                    color: [0.2, 0.2, 0.3]
                });
                
                break;
        }
    }

    addObject(object) {
        this.objects.push({
            ...object,
            id: Date.now() + Math.random(),
            rotation: [0, 0, 0],
            scale: [1, 1, 1]
        });
        
        // Update object counter
        document.getElementById('object-counter').textContent = this.objects.length;
    }

    updateCamera(deltaTime) {
        const speed = this.keys.has('shift') ? this.camera.speed * 3 : this.camera.speed;
        
        // Handle keyboard input
        if (this.keys.has('w') || this.keys.has('arrowup')) {
            this.camera.position[0] += Math.sin(this.camera.rotation[0]) * speed;
            this.camera.position[2] += Math.cos(this.camera.rotation[0]) * speed;
        }
        if (this.keys.has('s') || this.keys.has('arrowdown')) {
            this.camera.position[0] -= Math.sin(this.camera.rotation[0]) * speed;
            this.camera.position[2] -= Math.cos(this.camera.rotation[0]) * speed;
        }
        if (this.keys.has('a') || this.keys.has('arrowleft')) {
            this.camera.position[0] += Math.sin(this.camera.rotation[0] - Math.PI/2) * speed;
            this.camera.position[2] += Math.cos(this.camera.rotation[0] - Math.PI/2) * speed;
        }
        if (this.keys.has('d') || this.keys.has('arrowright')) {
            this.camera.position[0] += Math.sin(this.camera.rotation[0] + Math.PI/2) * speed;
            this.camera.position[2] += Math.cos(this.camera.rotation[0] + Math.PI/2) * speed;
        }

        // Keep camera above ground
        this.camera.position[1] = Math.max(0.5, this.camera.position[1]);
    }

    render() {
        if (!this.isRunning || !this.device) return;
        
        try {
            const commandEncoder = this.device.createCommandEncoder();
            const renderPassDescriptor = {
                colorAttachments: [{
                    view: this.context.getCurrentTexture().createView(),
                    clearValue: { 
                        r: this.rooms[this.roomType].color[0],
                        g: this.rooms[this.roomType].color[1],
                        b: this.rooms[this.roomType].color[2],
                        a: 1.0 
                    },
                    loadOp: 'clear',
                    storeOp: 'store'
                }]
            };
            
            const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
            
            // Render all objects
            this.drawScene(passEncoder);
            
            passEncoder.end();
            
            if (this.device) {
                this.device.queue.submit([commandEncoder.finish()]);
            }
        } catch (error) {
            console.error('Rendering error:', error);
        }
    }

    drawScene(passEncoder) {
        // We're simulating the drawing with a simplified approach
        // In a full implementation, we would actually draw:
        // 1. Set up pipeline with shaders
        // 2. Draw each object with proper transformation matrices
        // 3. Apply lighting and materials
        // 4. Add particle effects
        
        // For demonstration, just update loading text
        const progressText = document.getElementById('loading-text');
        if (progressText.textContent.includes('Initializing')) {
            progressText.textContent = 'Building 3D Scene...';
        } else if (progressText.textContent.includes('Building')) {
            progressText.textContent = 'Setting up Lighting...';
        } else if (progressText.textContent.includes('Lighting')) {
            progressText.textContent = 'Finalizing Environment...';
        }
    }

    renderLoop() {
        if (!this.isRunning) return;
        
        const currentTime = performance.now();
        const deltaTime = currentTime - this.stats.lastTime;
        
        // Update FPS counter
        this.stats.frameCount++;
        if (currentTime - this.stats.lastTime >= 1000) {
            this.stats.fps = Math.round((this.stats.frameCount * 1000) / (currentTime - this.stats.lastTime));
            document.getElementById('fps-counter').textContent = this.stats.fps;
            this.stats.frameCount = 0;
            this.stats.lastTime = currentTime;
        }
        
        // Update camera position based on input
        this.updateCamera(deltaTime);
        
        // Render the scene
        this.render();
        
        // Continue loop
        requestAnimationFrame(() => this.renderLoop());
    }

    start() {
        this.isRunning = true;
    }

    stop() {
        this.isRunning = false;
    }
}

// Initialize when page loads
window.addEventListener('load', () => {
    const app = new WebGPULivingRoom();
    
    console.log('WebGPU Living Room loaded successfully!');
});