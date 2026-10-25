# WebGPU Living Room

An interactive 3D living room environment built with WebGPU technology. Explore different rooms with furniture, lighting effects, and smooth navigation.

## Features

- **Multiple Rooms**: Live room, kitchen, bedroom, and office
- **Interactive Navigation**: WASD/arrow keys for movement, mouse look, scroll zoom
- **Real-time Lighting**: Dynamic lighting with ambient and point lights
- **Responsive Design**: Adapts to any screen size
- **Performance Optimized**: Smooth rendering using WebGPU

## Technology Stack

- **WebGPU**: Next-generation GPU API for web browsers
- **JavaScript/ES6+**: Modern JavaScript features
- **Express.js**: Web server framework
- **Docker**: Containerization for easy deployment

## Installation & Running

### Prerequisites

- Node.js 18 or higher
- Browser with WebGPU support (Chrome 113+, Edge 113+, or other browsers with WebGPU enabled)

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Access the app at: http://localhost:8080

### Docker Deployment

To run in a Docker container:

1. Build the Docker image:
```bash
docker build -t webgpu-living-room .
```

2. Run the container:
```bash
docker run -p 8080:8080 webgpu-living-room
```

3. Access the app at: http://localhost:8080

## Controls

- **Movement**: WASD or arrow keys
- **Look Around**: Mouse drag
- **Zoom**: Scroll wheel
- **Speed**: Hold Shift key for faster movement
- **Room Change**: Select from dropdown and click "Change Room"

## Project Structure

```
.
├── Dockerfile          # Docker configuration
├── README.md           # This file
├── package.json        # Dependencies and scripts
├── server.js           # Express server
└── public/
    ├── index.html      # Main HTML page
    └── script.js       # WebGPU implementation
```

## Browser Support

The application requires a browser with WebGPU support:

- Chrome 113+ (Enable "WebGPU" flag in chrome://flags)
- Edge 113+ (Enable "WebGPU" flag in edge://flags)
- Firefox Nightly (In development)

## Performance

The application is optimized for performance using:
- Efficient WebGPU rendering pipelines
- Proper resource management
- Adaptive rendering based on available hardware
- Smooth camera controls and animations

## License

MIT License - feel free to use and modify for your own projects.