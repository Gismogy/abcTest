// Extended WebGPU Living Room Implementation
class AdvancedWebGPULivingRoom {
    constructor() {
        this.canvas = document.getElementById('webgpu-canvas');
        this.device = null;
        this.context = null;
        this.format = null;
        this.scene = null;
        this.isRunning = false;
        this.keys = {};
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
            lastTime: performance.now(),
            objectCount: 0
        };
        
        this.roomType = 'living';
        this.rooms = {
            living: { 
                name: 'Living Room', 
                color: [0.1, 0.1, 0.2],
                ambient: [0.1, 0.1, 0.1]
            },
            kitchen: { 
                name: 'Kitchen', 
                color: [0.2, 0.1, 0.1],
                ambient: [0.2, 0.15, 0.1]
            },
            bedroom: { 
                name: 'Bedroom', 
                color: [0.1, 0.1, 0.2],
                ambient: [0.1, 0.1, 0.15]
            },
            office: { 
                name: 'Office', 
                color: [0.1, 0.15, 0.15],
                ambient: [0.1, 0.1, 0.1]
            }
        };
        
        this.lights = [
            // Main lighting
            { type: 'point', position: [0, 3, 0], color: [1.0, 1.0, 1.0], intensity: 1.0 },
            // Ambient light
            { type: 'ambient', color: [0.2, 0.2, 0.2] },
        ];
        
        this.objects = [
            // Room objects - will be expanded in the full implementation
            { type: 'floor', position: [0, -1.5, 0], size: [10, 0.1, 8], color: [0.4, 0.4, 0.4] },
            { type: 'ceiling', position: [0, 2.5, 0], size: [10, 0.1, 8], color: [0.6, 0.6, 0.6] }
        ];
        
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

            this.device = await adapter.requestDevice();
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
            document.getElementById('loading').style.display = 'none';
            
            // Start rendering
            this.isRunning = true;
            this.renderLoop();

            console.log('Advanced WebGPU Living Room initialized successfully!');
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
        // Keyboard input
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        
        // Mouse input
        this.canvas.addEventListener('mousedown', (e) => {
            this.mouseState.isDown = true;
            this.mouseState.x = e.clientX;
            this.mouseState.y = e.clientY;
        });
        
        window.addEventListener('mousemove', (e) => {
            if (this.mouseState.isDown) {
                const deltaX = e.clientX - this.mouseState.x;
                const deltaY = e.clientY - this.mouseState.y;
                
                this.camera.rotation[0] -= deltaX * this.camera.sensitivity;
                this.camera.rotation[1] -= deltaY * this.camera.sensitivity;
                
                // Limit vertical rotation
                this.camera.rotation[1] = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.camera.rotation[1]));
                
                this.mouseState.x = e.clientX;
                this.mouseState.y = e.clientY;
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
    }

    async createFullScene() {
        // Create shaders and pipelines based on room type
        await this.createShaders();
        this.createPipelines();
        
        // Set up lighting based on room type
        this.configureLights();
        
        // Setup environment objects
        this.setupEnvironment();
        
        console.log(`Created ${this.roomType} scene with ${this.objects.length} objects`);
    }

    async createShaders() {
        // Vertex Shader for 3D geometry
        const vertexShaderCode = `
            struct VertexInput {
                @location(0) position : vec3f,
                @location(1) normal : vec3f,
                @location(2) uv : vec2f,
            };

            struct VertexOutput {
                @builtin(position) position : vec4f,
                @location(0) normal : vec3f,
                @location(1) uv : vec2f,
                @location(2) worldPosition: vec3f,
            };

            struct Uniforms {
                modelViewProjectionMatrix : mat4x4f,
                normalMatrix : mat4x4f,
                time : f32,
            };

            @group(0) @binding(0) var<uniform> uniforms : Uniforms;
            
            @vertex
            fn vertex_main(input : VertexInput) -> VertexOutput {
                var output : VertexOutput;
                let worldPosition = vec4(input.position, 1.0);
                output.position = uniforms.modelViewProjectionMatrix * worldPosition;
                output.normal = (uniforms.normalMatrix * vec4(input.normal, 0.0)).xyz;
                output.uv = input.uv;
                output.worldPosition = worldPosition.xyz;
                return output;
            }
        `;

        // Fragment Shader for lighting and materials
        const fragmentShaderCode = `
            struct FragmentInput {
                @location(0) normal : vec3f,
                @location(1) uv : vec2f,
                @location(2) worldPosition: vec3f,
            };

            struct Light {
                type: u32,
                color: vec3f,
                position: vec3f,
                intensity: f32,
            };

            @group(0) @binding(1) var<storage, read> lights : array<Light>;
            @group(0) @binding(2) var<texture_2d> texture : texture_2d<f32>;

            @fragment
            fn fragment_main(input : FragmentInput) -> @location(0) vec4f {
                // Simple lighting calculation
                let lightPosition = lights[0].position;
                let lightColor = lights[0].color;
                let lightIntensity = lights[0].intensity;
                
                let toLight = normalize(lightPosition - input.worldPosition);
                let normal = normalize(input.normal);
                
                let diffuse = max(dot(normal, toLight), 0.0);
                let ambient = vec3(0.1, 0.1, 0.1);
                
                let color = vec3(0.5, 0.5, 0.7); // Default material color
                
                // Apply lighting
                let finalColor = color * (ambient + diffuse * lightIntensity * lightColor);
                
                // Add some visual effects
                let time = 0.0; // In real implementation this would be from uniform buffer
                let waveEffect = sin(time * 0.5 + input.uv.x * 10.0) * 0.1;
                finalColor += vec3(waveEffect);
                
                return vec4(finalColor, 1.0);
            }
        `;

        // Create shader modules for vertex and fragment shaders
        this.vertexShaderModule = this.device.createShaderModule({
            code: vertexShaderCode
        });

        this.fragmentShaderModule = this.device.createShaderModule({
            code: fragmentShaderCode
        });
    }

    createPipelines() {
        // Create render pipeline with the shader modules
        const pipelineDescriptor = {
            layout: 'auto',
            vertex: {
                module: this.vertexShaderModule,
                entryPoint: 'vertex_main',
                buffers: [{
                    arrayStride: 8 * 4, // 3 position + 3 normal + 2 uv (float32) 
                    attributes: [
                        { shaderLocation: 0, offset: 0, format: "float32x3" },   // position
                        { shaderLocation: 1, offset: 3 * 4, format: "float32x3" }, // normal
                        { shaderLocation: 2, offset: 6 * 4, format: "float32x2" }   // uv
                    ]
                }]
            },
            fragment: {
                module: this.fragmentShaderModule,
                entryPoint: 'fragment_main',
                targets: [{ 
                    format: this.format,
                    blend: {
                        color: { 
                            srcFactor: 'src-alpha',
                            dstFactor: 'one-minus-src-alpha'
                        }
                    }
                }]
            },
            primitive: {
                topology: 'triangle-list',
                cullMode: 'back'
            },
            depthStencil: {
                format: 'depth24plus',
                depthWriteEnabled: true,
                depthCompare: 'less'
            }
        };
        
        this.pipeline = this.device.createRenderPipeline(pipelineDescriptor);
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
        // Setup environment based on room type
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
        
        this.stats.objectCount = this.objects.length;
        document.getElementById('object-counter').textContent = this.stats.objectCount;
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
    }

    updateCamera(deltaTime) {
        const speed = this.keys['shift'] ? this.camera.speed * 3 : this.camera.speed;
        
        // Handle keyboard input
        if (this.keys['w'] || this.keys['arrowup']) {
            this.camera.position[0] += Math.sin(this.camera.rotation[0]) * speed;
            this.camera.position[2] += Math.cos(this.camera.rotation[0]) * speed;
        }
        if (this.keys['s'] || this.keys['arrowdown']) {
            this.camera.position[0] -= Math.sin(this.camera.rotation[0]) * speed;
            this.camera.position[2] -= Math.cos(this.camera.rotation[0]) * speed;
        }
        if (this.keys['a'] || this.keys['arrowleft']) {
            this.camera.position[0] += Math.sin(this.camera.rotation[0] - Math.PI/2) * speed;
            this.camera.position[2] += Math.cos(this.camera.rotation[0] - Math.PI/2) * speed;
        }
        if (this.keys['d'] || this.keys['arrowright']) {
            this.camera.position[0] += Math.sin(this.camera.rotation[0] + Math.PI/2) * speed;
            this.camera.position[2] += Math.cos(this.camera.rotation[0] + Math.PI/2) * speed;
        }

        // Keep camera above ground
        this.camera.position[1] = Math.max(0.5, this.camera.position[1]);
    }

    render() {
        if (!this.isRunning) return;
        
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
        this.device.queue.submit([commandEncoder.finish()]);
    }

    drawScene(passEncoder) {
        // In a full implementation, we would:
        // 1. Set pipeline and bind group 
        // 2. Draw each object using vertex/index buffers
        // 3. Update uniform buffers with matrix transformations
        
        // For demonstration purposes, we'll just visualize the concept
        passEncoder.setPipeline(this.pipeline);
        
        // In a real implementation, this would draw our complex objects
        // Here we show that rendering is working
        const progressText = document.getElementById('loading-text');
        if (progressText.textContent.includes('Initializing')) {
            progressText.textContent = 'Building 3D Scene...';
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
    const app = new AdvancedWebGPULivingRoom();
    
    // Set up FPS display
    setInterval(() => {
        // FPS counter is updated in render loop
    }, 1000);
    
    console.log('Advanced WebGPU Living Room loaded');
});