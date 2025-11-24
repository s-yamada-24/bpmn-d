# BPMN 2.0 Editor

A modern, web-based BPMN 2.0 editor built with Vanilla JavaScript, HTML, and CSS. This tool allows users to create, edit, and export BPMN diagrams with an intuitive drag-and-drop interface.

## Features

### Core Functionality
- **Drag & Drop Interface**: Easily add BPMN elements from the palette to the canvas.
- **Interactive Canvas**:
  - **Zoom & Pan**: Navigate large diagrams with ease using mouse wheel and drag interactions.
  - **Grid Snapping**: Align elements perfectly with the background grid.
- **BPMN Elements Support**:
  - **Events**: Start, End, Intermediate.
  - **Tasks**: Generic Task, User Task, Service Task.
  - **Gateways**: Exclusive, Parallel.
  - **Swimlanes**: Pools and Lanes for organizing processes.
- **Sequence Flows**: Connect elements with dynamic arrows that update automatically when elements are moved.

### User Interface
- **Modern Design**: Features a sleek "Glassmorphism" aesthetic with a dark mode theme.
- **Properties Panel**: Edit specific properties of selected elements (e.g., names, types).
- **BPMN Explorer**: A tree view to navigate the hierarchy of the diagram (Process, Sub-processes).
- **Toolbar**: Quick access to zoom controls and export options.

### Export & Persistence
- **Export Formats**: 
  - **JSON**: Save complete project data including all elements, connections, pools, and lanes for later editing.
  - **BPMN 2.0 XML**: Export ISO 19510:2013 compliant BPMN XML files compatible with other BPMN tools.
  - **SVG**: Export diagrams as scalable vector graphics with dark mode styling.
  - **PNG**: Export as raster images (requires html2canvas library).
- **One-Click Export**: Simple dialog interface for selecting export format.
- **Automatic Download**: Files are automatically downloaded with appropriate naming.

## Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Edge, Safari).

### Installation
1. Clone the repository or download the source code.
2. Navigate to the project directory.

### Running the Application
Simply open the `index.html` file in your web browser. No build step or server is required for basic functionality.

```bash
# If you have Python installed, you can run a simple server
python -m http.server 8000
# Then open http://localhost:8000 in your browser
```

## Project Structure

```
/
├── index.html              # Main entry point of the application
├── css/                    # Stylesheets
│   ├── styles.css          # Global styles and layout
│   ├── elements.css        # Styles for BPMN elements (Tasks, Events)
│   ├── connections.css     # Styles for SVG connections
│   ├── gateway-ports.css   # Styles for Gateways and connection ports
│   └── export.css          # Styles for export dialog
├── js/                     # JavaScript Logic
│   ├── app.js              # Main application logic (Canvas, Events, Drag&Drop)
│   ├── icons.js            # SVG Icon definitions
│   └── exporter.js         # Export functionality (JSON, BPMN XML, SVG, PNG)
└── assets/                 # Static assets (images, icons)
```

## Technologies Used

- **HTML5**: Semantic structure of the application.
- **CSS3**: Custom properties (variables), Flexbox, and Grid for layout and styling.
- **Vanilla JavaScript (ES6+)**: Core logic without external framework dependencies.
- **SVG**: Rendering connections and icons.

## Contributing

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add some amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

## License

Distributed under the MIT License. See `LICENSE` for more information.
