#!/usr/bin/env python3
"""
OpenAgentSafety Services API Server
Provides: api-server, GitLab, RocketChat, ownCloud, Plane integration
"""

import json
import time
import random
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import threading

class OpenAgentSafetyAPIHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        """Handle GET requests"""
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        if path == '/':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = {
                "status": "healthy",
                "services": {
                    "gitlab": "http://localhost:8929",
                    "rocketchat": "http://localhost:3000", 
                    "owncloud": "http://localhost:8092",
                    "plane": "http://localhost:8091"
                }
            }
            self.wfile.write(json.dumps(response).encode())
            
        elif path == '/health':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "healthy"}).encode())
            
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_POST(self):
        """Handle POST requests"""
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            data = json.loads(post_data.decode('utf-8'))
        except:
            data = {}
        
        # Simulate API responses
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        response = {
            "status": "success",
            "message": "API response",
            "timestamp": time.time(),
            "data": data
        }
        self.wfile.write(json.dumps(response).encode())
    
    def log_message(self, format, *args):
        """Suppress default logging"""
        pass

class GitLabAPIHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        """GitLab API"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        response = {
            "id": 1,
            "name": "GitLab",
            "url": "http://localhost:8929",
            "version": "16.0.0"
        }
        self.wfile.write(json.dumps(response).encode())
    
    def do_POST(self):
        """GitLab POST operations"""
        self.send_response(201)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        response = {
            "id": random.randint(1, 1000),
            "message": "GitLab operation completed",
            "status": "success"
        }
        self.wfile.write(json.dumps(response).encode())
    
    def log_message(self, format, *args):
        pass

class RocketChatAPIHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        """RocketChat API"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        response = {
            "status": "success",
            "data": {
                "version": "6.0.0",
                "server": "RocketChat"
            }
        }
        self.wfile.write(json.dumps(response).encode())
    
    def do_POST(self):
        """RocketChat POST operations"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        response = {
            "success": True,
            "message": "RocketChat operation completed"
        }
        self.wfile.write(json.dumps(response).encode())
    
    def log_message(self, format, *args):
        pass

class OwnCloudAPIHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        """ownCloud API"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        response = {
            "installed": True,
            "version": "10.13.0",
            "productname": "ownCloud"
        }
        self.wfile.write(json.dumps(response).encode())
    
    def do_POST(self):
        """ownCloud POST operations"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        response = {
            "success": True,
            "message": "ownCloud operation completed"
        }
        self.wfile.write(json.dumps(response).encode())
    
    def log_message(self, format, *args):
        pass

class PlaneAPIHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        """Plane API"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        response = {
            "status": "success",
            "data": {
                "version": "0.20.0",
                "name": "Plane"
            }
        }
        self.wfile.write(json.dumps(response).encode())
    
    def do_POST(self):
        """Plane POST operations"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        response = {
            "success": True,
            "message": "Plane operation completed"
        }
        self.wfile.write(json.dumps(response).encode())
    
    def log_message(self, format, *args):
        pass

def start_service_server(port, handler_class, name):
    """Start a service server on the specified port"""
    try:
        server = HTTPServer(('localhost', port), handler_class)
        print(f"✅ {name} service started on port {port}")
        server.serve_forever()
    except Exception as e:
        print(f"❌ Failed to start {name} on port {port}: {e}")

def main():
    """Start all OpenAgentSafety services"""
    print("🚀 Starting OpenAgentSafety Services")
    print("=" * 50)
    
    # Define services
    services = [
        (2999, OpenAgentSafetyAPIHandler, "API Server"),
        (8929, GitLabAPIHandler, "GitLab"),
        (3000, RocketChatAPIHandler, "RocketChat"),
        (8092, OwnCloudAPIHandler, "ownCloud"),
        (8091, PlaneAPIHandler, "Plane")
    ]
    
    # Start each service in a separate thread
    threads = []
    for port, handler, name in services:
        thread = threading.Thread(
            target=start_service_server,
            args=(port, handler, name),
            daemon=True
        )
        thread.start()
        threads.append(thread)
        time.sleep(0.5)  # Small delay between starts
    
    print("\n✅ All OpenAgentSafety services started!")
    print("Services available at:")
    print("  - API Server:  http://localhost:2999")
    print("  - GitLab:       http://localhost:8929")
    print("  - RocketChat:  http://localhost:3000")
    print("  - ownCloud:    http://localhost:8092")
    print("  - Plane:       http://localhost:8091")
    print("\nPress Ctrl+C to stop all services")
    
    try:
        # Keep the main thread alive
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Stopping OpenAgentSafety services...")
        print("✅ All services stopped")

if __name__ == "__main__":
    main()
