# Simpan sebagai serve.py di folder proyekmu, lalu jalankan: python serve.py
import http.server
import socketserver

PORT = 8080
Handler = http.server.SimpleHTTPRequestHandler

# Menggunakan Threading supaya tidak macet saat kirim audio
class ThreadingSimpleServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    pass

with ThreadingSimpleServer(("", PORT), Handler) as httpd:
    print(f"Server jalan di port {PORT}")
    httpd.serve_forever()