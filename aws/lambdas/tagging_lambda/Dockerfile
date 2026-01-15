FROM public.ecr.aws/lambda/python:3.11

# Install build tools and system libraries
RUN yum -y install \
    gcc \
    gcc-c++ \
    mesa-libGL \
    libsndfile \
    tar \
    gzip \
    xz \
    python3-devel \
    && yum clean all

# Static ffmpeg binary (safe for Lambda)
RUN curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz \
    | tar -xJ && \
    cp ffmpeg-*-amd64-static/ffmpeg /usr/bin/ffmpeg && \
    chmod +x /usr/bin/ffmpeg && \
    rm -rf ffmpeg-*-amd64-static

# Set required lib path for soundfile
ENV LD_LIBRARY_PATH=/usr/lib64:/usr/lib:/lib64:/lib

ENV HOME=/tmp \
    MPLCONFIGDIR=/tmp \
    YOLO_CONFIG_DIR=/tmp \
    NUMBA_CACHE_DIR=/tmp/numba_cache \
    NUMBA_DISABLE_CACHE=1 \
    NUMBA_DISABLE_JIT=1 \
    PYTHONPATH=/var/task

WORKDIR /var/task

# Upgrade pip to latest version
RUN pip install --upgrade pip

# Copy requirements first
COPY requirements.txt .

# Install core scientific packages with pre-built wheels FIRST to avoid GCC issues
RUN pip install --no-cache-dir \
    numpy==1.26.4 \
    scipy==1.11.4 \
    h5py==3.11.0

# Install TensorFlow separately (has pre-built wheels)
RUN pip install --no-cache-dir tensorflow==2.15.1

# Install remaining packages from requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Set Lambda handler
CMD ["lambda.lambda_handler"]
