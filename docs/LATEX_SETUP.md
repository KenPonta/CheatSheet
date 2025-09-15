# LaTeX Setup Guide for Compact Study Generator

The Compact Study Generator can produce high-quality PDF output using LaTeX. While the system has fallback mechanisms using Puppeteer, LaTeX provides the best typography and mathematical rendering for academic documents.

## Why LaTeX?

LaTeX offers several advantages for academic PDF generation:
- Superior mathematical typesetting
- Professional typography and spacing
- Precise control over page layout and column formatting
- Better handling of cross-references and citations
- Consistent formatting across different platforms

## Installation Instructions

### macOS

#### Option 1: MacTeX (Recommended)
```bash
# Download and install MacTeX (full distribution)
# Visit: https://www.tug.org/mactex/
# Or use Homebrew:
brew install --cask mactex

# Add LaTeX to PATH (if not automatically added)
echo 'export PATH="/usr/local/texlive/2023/bin/universal-darwin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

#### Option 2: BasicTeX (Minimal)
```bash
# Install BasicTeX (smaller download)
brew install --cask basictex

# Install required packages
sudo tlmgr update --self
sudo tlmgr install amsmath amsfonts amssymb amsthm mathtools
sudo tlmgr install geometry multicol setspace titlesec enumitem
sudo tlmgr install graphicx booktabs array hyperref cleveref
sudo tlmgr install fancyhdr lastpage needspace afterpage xcolor
sudo tlmgr install microtype lmodern
```

### Linux (Ubuntu/Debian)

```bash
# Install TeX Live (full distribution)
sudo apt update
sudo apt install texlive-full

# Or minimal installation with required packages
sudo apt install texlive-base texlive-latex-recommended texlive-latex-extra
sudo apt install texlive-math-extra texlive-fonts-recommended
```

### Linux (CentOS/RHEL/Fedora)

```bash
# Fedora
sudo dnf install texlive-scheme-full

# CentOS/RHEL
sudo yum install texlive texlive-latex texlive-collection-latexrecommended
```

### Windows

#### Option 1: MiKTeX (Recommended)
1. Download MiKTeX from https://miktex.org/download
2. Run the installer and choose "Complete MiKTeX"
3. Add MiKTeX to system PATH during installation

#### Option 2: TeX Live
1. Download TeX Live from https://www.tug.org/texlive/
2. Run the installer and select full installation
3. Ensure the bin directory is added to PATH

### Docker Environment

If you're running the application in Docker, add this to your Dockerfile:

```dockerfile
# For Ubuntu-based images
RUN apt-get update && apt-get install -y \
    texlive-base \
    texlive-latex-recommended \
    texlive-latex-extra \
    texlive-math-extra \
    texlive-fonts-recommended \
    && rm -rf /var/lib/apt/lists/*

# For Alpine-based images
RUN apk add --no-cache \
    texlive \
    texlive-dev \
    texmf-dist-latexextra \
    texmf-dist-mathscience
```

## Environment Configuration

### Environment Variables

Add these to your `.env.local` file:

```bash
# LaTeX Configuration
LATEX_ENGINE=pdflatex
LATEX_TIMEOUT=60000
LATEX_TEMP_DIR=/tmp/latex
ENABLE_LATEX_PDF=true

# Fallback Configuration
ENABLE_PUPPETEER_FALLBACK=true
PDF_GENERATION_TIMEOUT=90000
```

### Verifying Installation

Test your LaTeX installation:

```bash
# Check if LaTeX is installed
pdflatex --version

# Test basic compilation
echo '\documentclass{article}\begin{document}Hello World\end{document}' > test.tex
pdflatex test.tex
```

## Production Deployment

### Vercel/Netlify

For serverless deployments, LaTeX is typically not available. The system will automatically fall back to Puppeteer-based PDF generation.

### VPS/Dedicated Server

Install LaTeX using the instructions above for your operating system.

### Docker Deployment

Use the Docker configuration provided above, or use a pre-built image:

```dockerfile
FROM node:18-slim

# Install LaTeX
RUN apt-get update && apt-get install -y \
    texlive-latex-base \
    texlive-latex-recommended \
    texlive-latex-extra \
    texlive-math-extra \
    && rm -rf /var/lib/apt/lists/*

# Your application setup...
```

## Troubleshooting

### Common Issues

1. **"pdflatex: command not found"**
   - LaTeX is not installed or not in PATH
   - Follow installation instructions above
   - Restart your terminal/application after installation

2. **"Package X not found"**
   - Missing LaTeX packages
   - Install missing packages using `tlmgr install <package-name>`
   - Or install the full distribution

3. **PDF generation timeout**
   - Increase `LATEX_TIMEOUT` in environment variables
   - Check system resources (memory, CPU)

4. **Permission errors**
   - Ensure write permissions to temp directory
   - Check `LATEX_TEMP_DIR` configuration

### Testing PDF Generation

You can test PDF generation with this API call:

```bash
curl -X POST http://localhost:3000/api/generate-compact-study \
  -H "Content-Type: application/json" \
  -d '{
    "files": [{"name": "test.pdf", "type": "general", "content": "..."}],
    "config": {"outputFormat": "pdf", "layout": "compact", "columns": 2}
  }'
```

## Performance Optimization

### LaTeX Compilation Speed

1. **Use pdflatex** (fastest for most documents)
2. **Minimize packages** in LaTeX templates
3. **Cache compiled documents** when possible
4. **Use SSD storage** for temp files

### Memory Usage

- LaTeX compilation can use significant memory
- Monitor system resources during PDF generation
- Consider limiting concurrent PDF generations

## Support

If you encounter issues with LaTeX setup:

1. Check the application logs for specific error messages
2. Verify LaTeX installation with the test commands above
3. Ensure all required packages are installed
4. Check file permissions and temp directory access

The system will automatically fall back to Puppeteer-based PDF generation if LaTeX is unavailable, but LaTeX provides the highest quality output for academic documents.