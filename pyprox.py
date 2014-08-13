import urllib
from BaseHTTPServer import BaseHTTPRequestHandler, HTTPServer

class MyHandler(BaseHTTPRequestHandler):

    def do_GET(self):
        path = self.path
        text = "Hello World!"
        if path[:4] == "/wps":
            text = urllib.urlopen("http://localhost:8095/wps"+path[4:]).read()
        elif path[:8] == "/thredds":
            text = urllib.urlopen("http://localhost:8080"+path).read()
        else:
            if path in ["","/"]:
                path = "/index.html"
            text = open(path[1:],"rb").read()
        #if path[-4:] == ".kml":
        #    self.send_header("Content-type", "application/vnd.google-earth.kml+xml")
        self.send_response(200)
        self.end_headers()
        self.wfile.write(text)
        

server = HTTPServer(('localhost',12345), MyHandler)
server.serve_forever()
