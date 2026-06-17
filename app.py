import urllib.request
import xml.etree.ElementTree as ET
import time
import ssl
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache for parsed releases
cache = {
    "data": None,
    "last_fetched": 0
}

CACHE_TTL = 300 # 5 minutes cache lifetime

def fetch_and_parse_feed():
    """Fetches the XML feed and parses it into a list of dictionaries."""
    try:
        # Fetch the feed with a user agent to prevent any scraping blockers
        req = urllib.request.Request(
            FEED_URL, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        # Create unverified context to bypass macOS SSL certificate verification issue
        context = ssl._create_unverified_context()
        with urllib.request.urlopen(req, context=context, timeout=10) as response:
            xml_data = response.read()
            
        # Parse XML
        root = ET.fromstring(xml_data)
        
        # Atom Namespace
        atom_ns = "{http://www.w3.org/2005/Atom}"
        
        releases = []
        for entry in root.findall(f'{atom_ns}entry'):
            title_el = entry.find(f'{atom_ns}title')
            id_el = entry.find(f'{atom_ns}id')
            updated_el = entry.find(f'{atom_ns}updated')
            content_el = entry.find(f'{atom_ns}content')
            
            # Find alternate link
            link = ""
            for link_el in entry.findall(f'{atom_ns}link'):
                if link_el.attrib.get('rel') == 'alternate' or not link_el.attrib.get('rel'):
                    link = link_el.attrib.get('href', '')
                    break
                    
            title = title_el.text if title_el is not None else "Unknown Date"
            entry_id = id_el.text if id_el is not None else ""
            updated = updated_el.text if updated_el is not None else ""
            content = content_el.text if content_el is not None else ""
            
            releases.append({
                "date": title,
                "id": entry_id,
                "updated": updated,
                "link": link,
                "content": content
            })
            
        return releases, None
    except Exception as e:
        return None, str(e)

@app.route('/')
def home():
    """Serves the main application page."""
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    """API endpoint to get parsed release notes. Supports ?refresh=true."""
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    current_time = time.time()
    
    if force_refresh or not cache["data"] or (current_time - cache["last_fetched"]) > CACHE_TTL:
        releases, error = fetch_and_parse_feed()
        if error:
            # If fetch fails but we have cached data, return cached data with warning
            if cache["data"]:
                return jsonify({
                    "releases": cache["data"],
                    "source": "cache_fallback",
                    "error": f"Failed to refresh: {error}"
                })
            return jsonify({"error": f"Failed to fetch release notes: {error}"}), 500
            
        cache["data"] = releases
        cache["last_fetched"] = current_time
        
    return jsonify({
        "releases": cache["data"],
        "source": "live" if force_refresh or (current_time - cache["last_fetched"]) <= 10 else "cache",
        "last_fetched": cache["last_fetched"]
    })

if __name__ == '__main__':
    # Run server on port 5005
    app.run(debug=True, host='0.0.0.0', port=5005)
