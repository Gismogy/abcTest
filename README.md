# WebGPU Living Room

An interactive 3D living room environment built with WebGPU technology. Explore different rooms with furniture, lighting effects, and smooth navigation.

## Features

- **Multiple Rooms**: Living room, kitchen, bedroom, and office
- **Interactive Navigation**: WASD/arrow keys for movement, mouse look, scroll zoom
- **Real-time Lighting**: Dynamic lighting with ambient and point lights
- **Responsive Design**: Adapts to any screen size
- **Performance Optimized**: Smooth rendering using WebGPU

## Technology Stack

- **WebGPU**: Next-generation GPU API for web browsers
- **JavaScript/ES6+**: Modern JavaScript features
- **CSS3**: Styling and responsive design
- **HTML5**: Document structure

## Prerequisites

To run this application, you need:
1. A modern browser with WebGPU support (Chrome 113+, Edge 113+, or other browsers with WebGPU enabled)
2. WebGPU-compatible hardware and drivers

## Installation & Running

### Direct Browser Access

1. Open `index.html` in a supported browser
2. The application will initialize automatically
3. Use the controls shown on screen to navigate

### Using a Local Server

To serve the application locally:

1. Make sure you have Python 3 installed on your system
2. Navigate to the project directory: `cd /root/test/ABC`
3. Start a simple HTTP server:
   ```bash
   python3 -m http.server 8080
   ```
4. Access the app at: http://localhost:8080

## Controls

- **Movement**: WASD or arrow keys
- **Look Around**: Mouse drag
- **Zoom**: Scroll wheel
- **Speed**: Hold Shift key for faster movement
- **Room Change**: Select from dropdown and click "Change Room"

## Browser Support

The application requires a browser with WebGPU support:

- Chrome 113+ (Enable "WebGPU" flag in chrome://flags)
- Edge 113+ (Enable "WebGPU" flag in edge://flags)
- Firefox Nightly (In development)

## Performance Optimization

The application is optimized for performance using:
- Efficient WebGPU rendering pipelines
- Proper resource management
- Adaptive rendering based on available hardware
- Smooth camera controls and animations

## Project Structure

```
.
├── index.html          # Main HTML page
├── main.js             # Core WebGPU implementation
├── style.css           # Visual styling
└── README.md           # This file
```

## Troubleshooting

If you encounter issues:
1. Make sure you're using a supported browser version
2. For Chrome/Edge: Ensure WebGPU is enabled in flags
3. Check browser console for specific error messages
4. Verify that your hardware supports WebGPU

## Note for Users

WebGPU is still a relatively new technology and requires:
- Updated graphics drivers
- Modern GPU hardware (DirectX 12, Vulkan, or Metal compatible)
- Browser support with experimental features enabled

## License

MIT License - feel free to use and modify for your own projects.