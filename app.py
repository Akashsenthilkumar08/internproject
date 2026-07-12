import os

if __name__ == "__main__":
    # Start the Flask backend using gunicorn on port 7860
    os.system("cd backend && gunicorn app:app -b 0.0.0.0:7860 --timeout 120")
