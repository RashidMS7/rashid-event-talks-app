# BigQuery Release Notes Hub ⚡

A premium, modern web dashboard for tracking Google Cloud BigQuery release notes. This application fetches the official BigQuery Release Notes XML feed, parses the updates, groups multi-part daily updates into clean topic-based cards, and provides search, categorization filtering, and a custom Tweet-to-X composer with a live character-limit preview.

---

## 🌟 Key Features

*   **Atomic Card Display**: Automatically groups daily releases into individual cards by categories (e.g. *Features, Announcements, Changes/Issues, and Deprecations*) using a frontend DOM Parser.
*   **Sci-Fi Dark Theme**: Sleek glassmorphism UI layout (`backdrop-filter: blur(12px)`) with glowing dynamic indicators based on update severity.
*   **Instant Search & Filters**: Client-side instant query matching and filter pills.
*   **Automatic Cache Control**: 5-minute TTL caching layer in Flask backend to prevent rate limiting.
*   **Bypassed SSL Verification**: Workaround for macOS Python SSL certificate verify failures.
*   **Live Tweet Composer**: Truncates descriptions to fit within X/Twitter's 280-character budget and provides a live mock UI preview.

---

## 🛠️ Tech Stack

*   **Backend**: Python Flask (using standard libraries like `urllib` and `xml.etree.ElementTree`)
*   **Frontend**: Plain Vanilla HTML5, CSS3 Grid/Flexbox, and Native ES6 JavaScript (using `DOMParser` and `fetch` APIs)
*   **Design**: Glassmorphism styling, CSS Keyframe Animations, Skeleton Loaders

---

## 📂 Project Directory Structure

```text
bigquery-release-notes/
├── app.py                 # Flask server & XML feed caching pipeline
├── requirements.txt       # Project Python dependencies
├── .gitignore             # Git exclusion rules (venv, __pycache__, logs)
├── templates/
│   └── index.html         # Application viewport structures & overlay modals
└── static/
    ├── style.css          # Color variables, design systems, and animations
    └── script.js          # DOM parsing, search, filter pill hooks, and Tweet logic
```

---

## 🚀 Getting Started

### Prerequisites
Make sure you have Python 3 and Git installed on your system.

### 1. Clone the repository
```bash
git clone https://github.com/RashidMS7/rashid-event-talks-app.git
cd rashid-event-talks-app
```

### 2. Setup Virtual Environment & Install Dependencies
Create an isolated virtual environment and install dependencies:
```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install requirements
pip install -r requirements.txt
```

*(Note: The `requirements.txt` only needs `flask` as we leverage Python standard libraries for the parser)*

### 3. Start the Flask Server
Run the Flask server:
```bash
python app.py
```

By default, the server will launch on port **5005** to avoid conflict with macOS native services (like AirPlay on port 5000).

Open your browser and navigate to:
👉 **[http://localhost:5005](http://localhost:5005)**

---

## 🔄 How the Flow Works
1. **Fetch**: The client requests `/api/releases` which proxies Google Cloud's official Atom XML feed.
2. **Parse**: Python standard libraries parse the XML elements into JSON objects, caching them in memory for 5 minutes.
3. **Split**: The frontend parses the raw HTML, splitting the content on `<h3>` boundaries to render separate cards for distinct updates on the same date.
4. **Tweet**: Clicking "Tweet Update" triggers the dynamic composer to format, trim, and redirect the user directly to X's intent API with the correct metadata.
