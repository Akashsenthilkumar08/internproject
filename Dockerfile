FROM python:3.11

# Set up a new user named "user" with user ID 1000
RUN useradd -m -u 1000 user

# Switch to the "user" user
USER user

# Set home to the user's home directory
ENV HOME=/home/user \
	PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# Copy the requirements file
COPY --chown=user backend/requirements.txt $HOME/app/

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend files
COPY --chown=user backend $HOME/app/backend

# Expose the port Hugging Face Spaces uses
EXPOSE 7860

# Start the backend API using gunicorn on port 7860
CMD ["gunicorn", "-b", "0.0.0.0:7860", "--chdir", "backend", "app:app", "--timeout", "120"]
