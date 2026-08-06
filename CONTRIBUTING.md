# Contributing to RamaPoint 🗺️

First off, thank you for considering contributing to RamaPoint! It's people like you that make campus navigation mapping tools better for everyone.

Here is a guide to getting started and maintaining our standards.

---

## 🛠️ Codebase Setup

To set up a local development environment, follow these steps:

1. **Prerequisites**: Ensure you have [Node.js](https://nodejs.org/) (v18+) and `npm` installed.
2. **Clone the repository**:
   ```bash
   git clone https://github.com/ronaldgosso/ramapoint.git
   cd ramapoint
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Start the local dev server**:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:5173`.

5. **Build for production**:
   ```bash
   npm run build
   ```
6. **Linter validation**:
   ```bash
   npm run lint
   ```

---

## 🌿 Branching & Development Workflow

We follow a typical feature-branching pull request workflow:

1. **Branch naming conventions**:
   - Features: `feature/your-feature-name`
   - Bugfixes: `bugfix/issue-description`
   - Documentation: `docs/changes`
2. **Commit guidelines**:
   - Keep commit messages concise, descriptive, and written in present tense (e.g. `feat: add node hiding toggle button`).
   - Group related modifications into single commits.
3. **Submit a Pull Request**:
   - Push your branch to GitHub and create a Pull Request against the `main` branch.
   - Describe what the PR does, which issue it addresses, and add manual verification details.

---

## 🎨 Coding Standards

### React Components
- Keep components focused and modular under `src/components/`.
- Ensure all interactive elements have unique, descriptive `id` properties.
- Use the central `AppContext.jsx` state management reducer for cross-component project mutators.

### Leaflet & Geoman
- Synchronize Leaflet map properties and drawing styles through `GeomanControls.jsx`.
- Use reference lists on the map container (`map.getContainer()._node_layers`, etc.) to expose elements outside the Leaflet React context.

### Styling
- All CSS styles must live in [index.css](file:///c:/Users/Neptune/Documents/Projects/ramapoint/src/index.css) using CSS Custom Properties (variables) for consistent themes.
- Support responsiveness for screen widths under `768px`.
