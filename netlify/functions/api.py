import os
import sys

# Ensure backend directory is in PATH
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

from backend.app import app
import serverless_wsgi

def handler(event, context):
    return serverless_wsgi.handle_request(app, event, context)
