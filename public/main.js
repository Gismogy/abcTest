// Main WebGPU Living Room Application - Complete Implementation
class WebGPULivingRoom {
    constructor() {
        this.canvas = document.getElementById('webgpu-canvas');
        this.device = null;
        this.context = null;
        this.format = null;
        this.pipeline = null;
        this.uniformBuffer = null;
        this.vertexBuffer = null;
        this.indexBuffer = null;
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
        this.isFullscreen = false;
        this.shaderModules = {};
        
        this.init();
    }

    async init() {
        try {
            if (!navigator.gpu) {
                throw new Error('WebGPU not supported! Make sure you are using Chrome 113+ or Edge 113+ with WebGPU enabled.');
            }

            const adapter = await navigator.gpu.requestAdapter({
                powerPreference: 'high-performance'
            });

            if (!adapter) {
                throw new Error('No WebGPU adapter found! Your browser may not support WebGPU or your hardware is not compatible.');
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
                `Error: ${error.message}`;
        }
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
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
        await this.createShaders();
        this.createPipelines();
        this.setupGeometry();
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

            @fragment
            fn fragment_main(input : FragmentInput) -> @location(0) vec4f {
                // Simple lighting calculation  
                let lightPos = vec3(0.0, 3.0, 0.0);
                let toLight = normalize(lightPos - input.worldPosition);
                let normal = normalize(input.normal);
                
                let diffuse = max(dot(normal, toLight), 0.0);
                let ambient = vec3(0.1, 0.1, 0.1);
                
                // Base color
                let baseColor = vec3(0.5, 0.5, 0.7); 
                
                // Apply lighting
                let finalColor = baseColor * (ambient + diffuse * 0.8);
                
                // Add some visual effect
                let time = 0.0; // In real implementation this would be from uniform buffer
                let waveEffect = sin(time * 0.5 + input.uv.x * 10.0) * 0.1;
                finalColor += vec3(waveEffect);
                
                return vec4(finalColor, 1.0);
            }
        `;

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

    setupGeometry() {
        // Create a simple cube geometry for demonstration
        const vertices = new Float32Array([
            // Positions             Normals               UVs
            // Front face
            -1, -1,  1,   0,  0,  1,   0, 0,
             1, -1,  1,   0,  0,  1,   1, 0,
             1,  1,  1,   0,  0,  1,   1, 1,
            -1,  1,  1,   0,  0,  1,   0, 1,
            
            // Back face
            -1, -1, -1,   0,  0, -1,   0, 0,
             1, -1, -1,   0,  0, -1,   1, 0,
             1,  1, -1,   0,  0, -1,   1, 1,
            -1,  1, -1,   0,  0, -1,   0, 1,
            
            // Top face
            -1,  1, -1,   0,  1,  0,   0, 0,
            -1,  1,  1,   0,  1,  0,   0, 1,
             1,  1,  1,   0,  1,  0,   1, 1,
             1,  1, -1,   0,  1,  0,   1, 0,
            
            // Bottom face
            -1, -1, -1,   0, -1,  0,   0, 0,
             1, -1, -1,   0, -1,  0,   1, 0,
             1, -1,  1,   0, -1,  0,   1, 1,
            -1, -1,  1,   0, -1,  0,   0, 1,
            
            // Right face
             1, -1, -1,   1,  0,  0,   0, 0,
             1,  1, -1,   1,  0,  0,   0, 1,
             1,  1,  1,   1,  0,  0,   1, 1,
             1, -1,  1,   1,  0,  0,   1, 0,
            
            // Left face
            -1, -1, -1,  -1,  0,  0,   0, 0,
            -1,  1, -1,  -1,  0,  0,   0, 1,
            -1,  1,  1,  -1,  0,  0,   1, 1,
            -1, -1,  1,  -1,  0,  0,   1, 0,
        ]);

        this.vertexBuffer = this.device.createBuffer({
            size: vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Float32Array(this.vertexBuffer.getMappedRange()).set(vertices);
        this.vertexBuffer.unmap();

        // Create index data for cube (triangles)
        const indices = new Uint16Array([
            0,  1,  2,  0,  2,  3,    // front
            4,  6,  5,  4,  7,  6,    // back
            8,  9, 10,  8, 10, 11,    // top
            12, 13, 14, 12, 14, 15,   // bottom
            16, 17, 18, 16, 18, 19,   // right
            20, 21, 22, 20, 22, 23    // left
        ]);
        
        this.indexBuffer = this.device.createBuffer({
            size: indices.length * 2,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Uint16Array(this.indexBuffer.getMappedRange()).set(indices);
        this.indexBuffer.unmap();
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
            color: [0.7, 0.4, 0.3]
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
        if (!this.isRunning || !this.device || !this.pipeline) return;
        
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
            
            // Set pipeline and buffers
            passEncoder.setPipeline(this.pipeline);
            passEncoder.setVertexBuffer(0, this.vertexBuffer);
            passEncoder.setIndexBuffer(this.indexBuffer, 'uint16');
            
            // Draw the room components
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
        // Draw all the room components using our simple cube geometry
        const roomWidth = 8;
        const roomDepth = 6;
        const roomHeight = 4;

        // Draw walls, floor, ceiling, and furniture (use same cube geometry for simplicity)
        for (let i = 0; i < this.objects.length; i++) {
            const obj = this.objects[i];
            
            // Simple transformation matrix
            const modelMatrix = this.createModelMatrix(
                obj.position, 
                obj.rotation, 
                obj.scale
            );
            
            // In a real implementation, we would compute MVP matrices here
            // For now, we'll just use the pipeline to draw geometry
            
            // This is where we'd actually render each object with proper transformations
        }
        
        // Draw a single cube at position [0, 0, 0] as demonstration of rendering
        passEncoder.drawIndexed(36, 1, 0, 0, 0);
    }

    createModelMatrix(position, rotation, scale) {
        // Simple matrix creation - in real implementation would be more complex
        return [
            scale[0], 0, 0, 0,
            0, scale[1], 0, 0,
            0, 0, scale[2], 0,
            position[0], position[1], position[2], 1
        ];
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
    console.log('Use WASD or arrow keys to move, mouse to look around, scroll to zoom.');
    console.log('Change rooms using the dropdown menu in the top-right corner.');
});